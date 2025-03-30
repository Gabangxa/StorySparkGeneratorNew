import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { storyFormSchema, type StoryPage, type StoryEntity, type StoryEntityWithAppearances } from "@shared/schema";
import { generateStory, generateImage } from "./openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.get("/api/stories", async (req: Request, res: Response) => {
    try {
      const stories = await storage.getStories();
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.get("/api/stories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid story ID" });
      }

      const story = await storage.getStory(id);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      res.json(story);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch story" });
    }
  });

  app.post("/api/stories", async (req: Request, res: Response) => {
    try {
      const parsedBody = storyFormSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid story data", 
          errors: parsedBody.error.errors 
        });
      }

      const { title, description, storyType, ageRange, artStyle, layoutType } = parsedBody.data;

      // Generate story with OpenAI
      const generatedStory = await generateStory({
        title,
        description,
        storyType,
        ageRange,
        numberOfPages: 5 // Fixed number of pages for now
      });

      // Extract entities for tracking
      const entities = generatedStory.entities || [];
      const entityGenerationIds: Record<string, string> = {};
      
      // Generate images for each page with entity consistency
      const pages: StoryPage[] = await Promise.all(
        generatedStory.pages.map(async (page, index) => {
          // Get entities that appear on this page
          const pageEntities = page.entities || [];
          
          // Create a map of entity reference IDs for this page
          const pageEntityRefs: Record<string, string> = {};
          pageEntities.forEach(entityId => {
            if (entityGenerationIds[entityId]) {
              pageEntityRefs[entityId] = entityGenerationIds[entityId];
            }
          });
          
          // Get the full entity objects for this page to enhance prompt
          const relevantEntities = entities
            .filter(entity => pageEntities.includes(entity.id));
            
          console.log(`Page ${index + 1} has ${relevantEntities.length} entities: ` + 
            relevantEntities.map(e => e.name).join(", "));
          
          // Generate image with enhanced entity consistency
          const imageResult = await generateImage({
            prompt: page.imagePrompt,
            entityReferenceIds: pageEntityRefs,
            artStyle,
            entities: relevantEntities
          });
          
          let imageUrl: string;
          let revisedPrompt: string | undefined;
          
          // Handle different return types from generateImage
          if (typeof imageResult === 'string') {
            imageUrl = imageResult;
          } else {
            imageUrl = imageResult.url;
            revisedPrompt = imageResult.revised_prompt;
            
            // Store any new generation IDs for future pages
            if (imageResult.generatedIds) {
              Object.entries(imageResult.generatedIds).forEach(([entityId, genId]) => {
                entityGenerationIds[entityId] = genId;
              });
            }
          }
          
          return {
            pageNumber: index + 1,
            text: page.text,
            imageUrl,
            imagePrompt: revisedPrompt || page.imagePrompt, // Store the revised prompt if available
            entities: pageEntities
          };
        })
      );

      // Prepare entities for storage by removing appearance info
      const storyEntities: StoryEntity[] = entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        description: entity.description,
        generationId: entityGenerationIds[entity.id] // Store the generation ID if we have it
      }));
      
      // Save story to storage
      const newStory = await storage.createStory({
        title,
        description,
        storyType,
        ageRange,
        artStyle,
        layoutType,
        pages,
        entities: storyEntities
      });

      res.status(201).json(newStory);
    } catch (error) {
      console.error("Error creating story:", error);
      res.status(500).json({ 
        message: "Failed to create story", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/stories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid story ID" });
      }

      const success = await storage.deleteStory(id);
      if (!success) {
        return res.status(404).json({ message: "Story not found" });
      }

      res.status(200).json({ message: "Story deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete story" });
    }
  });

  // Generate a preview story with entities
  app.post("/api/preview", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        storyType: z.string().min(1),
        ageRange: z.string().min(1),
        numberOfPages: z.number().min(1).optional(),
        artStyle: z.string().optional()
      });
      
      const parsedBody = schema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid story data",
          errors: parsedBody.error.errors
        });
      }

      const { title, description, storyType, ageRange, numberOfPages } = parsedBody.data;

      const storyData = await generateStory({
        title,
        description,
        storyType,
        ageRange,
        numberOfPages: numberOfPages || 5
      });

      return res.json(storyData);
    } catch (error) {
      console.error("Error generating preview:", error);
      return res.status(500).json({ 
        message: "Failed to generate preview", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Generate an image for a story page with consistency
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        prompt: z.string().min(1),
        entityReferenceIds: z.record(z.string()).optional(),
        artStyle: z.string().optional(),
        entities: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(['character', 'location', 'object']),
          description: z.string(),
          generationId: z.string().optional()
        })).optional()
      });
      
      const parsedBody = schema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid image prompt data",
          errors: parsedBody.error.errors
        });
      }
      
      const { prompt, entityReferenceIds, artStyle, entities } = parsedBody.data;
      
      // If entity details are provided, log them for debugging
      if (entities && entities.length > 0) {
        console.log(`Generating image with ${entities.length} entities: ` + 
          entities.map(e => `${e.name} (${e.type})`).join(", "));
      }
      
      // Generate image with all available entity information
      const imageResult = await generateImage({
        prompt,
        entityReferenceIds: entityReferenceIds || {},
        artStyle: artStyle || 'colorful',
        entities: entities || []
      });
      
      return res.json(imageResult);
    } catch (error) {
      console.error("Error generating image:", error);
      return res.status(500).json({ 
        message: "Failed to generate image", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
