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
      
      /**
       * Generate illustrations for each page of the story with enhanced entity consistency
       * This is a critical section that ensures visual continuity across all story pages
       * by tracking entity appearances and passing their descriptions to the image generator
       */
      
      // First, identify all unique entities across the entire story
      // This helps us maintain consistent appearances throughout all pages
      const allUniqueEntities = Array.from(new Set(
        generatedStory.pages.flatMap(page => page.entities || [])
      ));
      
      console.log(`Story has ${allUniqueEntities.length} unique entities across all pages`);
      
      // Track entities that appear in multiple pages for special consistency enforcement
      const entityFrequency: Record<string, number> = {};
      generatedStory.pages.forEach(page => {
        const pageEntities = page.entities || [];
        pageEntities.forEach(entityId => {
          entityFrequency[entityId] = (entityFrequency[entityId] || 0) + 1;
        });
      });
      
      // Identify recurring entities (appear in more than one page)
      const recurringEntities = Object.entries(entityFrequency)
        .filter(([_, count]) => count > 1)
        .map(([id]) => id);
      
      console.log(`Found ${recurringEntities.length} recurring entities that need special consistency`);
      
      // Pre-load full entity details
      const entityDetailsMap = entities.reduce((map, entity) => {
        map[entity.id] = entity;
        return map;
      }, {} as Record<string, StoryEntityWithAppearances>);
      
      // Generate illustrations for each page, processing sequentially to maintain consistency
      // This ensures that character appearances from early pages inform later ones
      const pages: StoryPage[] = [];
      
      for (let index = 0; index < generatedStory.pages.length; index++) {
        const page = generatedStory.pages[index];
        const pageEntities = page.entities || [];
        
        // Create a mapping of entity IDs to their DALL-E generation IDs for visual consistency
        const pageEntityRefs: Record<string, string> = {};
        pageEntities.forEach(entityId => {
          if (entityGenerationIds[entityId]) {
            pageEntityRefs[entityId] = entityGenerationIds[entityId];
          }
        });
        
        // Add ALL entity descriptions to recurring characters to maintain stronger consistency
        // This ensures that even if a character doesn't appear on the current page,
        // their description is still included if they appear elsewhere in the story
        const pagePrimaryEntities = entities.filter(entity => pageEntities.includes(entity.id));
        
        // For maximum consistency, always include all recurring characters in every prompt
        // even if they don't appear on this specific page
        const recurringEntityObjects = recurringEntities
          .filter(id => !pageEntities.includes(id)) // Only include recurring entities not already on this page
          .map(id => entityDetailsMap[id])
          .filter(Boolean);
        
        // Combine all entities needed for this page
        const allRelevantEntities = [...pagePrimaryEntities, ...recurringEntityObjects];
        
        // Log page entity information for debugging and monitoring
        console.log(`Page ${index + 1}: ` + 
          `${pagePrimaryEntities.length} visible entities, ` +
          `${recurringEntityObjects.length} recurring entities for consistency, ` + 
          `${allRelevantEntities.map(e => e.name).join(", ")}`);
        
        // Generate an illustration with our enhanced entity consistency approach
        const imageResult = await generateImage({
          prompt: page.imagePrompt,                 // Base image description
          entityReferenceIds: pageEntityRefs,       // References to maintain visual consistency
          artStyle,                                 // User-selected art style
          entities: allRelevantEntities             // ALL relevant entities including those from other pages
        });
        
        // Process the result
        let imageUrl: string;
        let revisedPrompt: string | undefined;
        
        if (typeof imageResult === 'string') {
          imageUrl = imageResult;
        } else {
          imageUrl = imageResult.url;
          revisedPrompt = imageResult.revised_prompt;
          
          // Store any new generation IDs for future page references
          if (imageResult.generatedIds) {
            Object.entries(imageResult.generatedIds).forEach(([entityId, genId]) => {
              entityGenerationIds[entityId] = genId;
            });
          }
        }
        
        // Add the completed page to our results
        pages.push({
          pageNumber: index + 1,
          text: page.text,
          imageUrl,
          imagePrompt: revisedPrompt || page.imagePrompt,
          entities: pageEntities
        });
      }

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
  
  /**
   * API endpoint for generating a single illustration with entity consistency
   * This endpoint can be used independently to generate one-off images
   * while still maintaining visual consistency with previously generated entities.
   * Enhanced to accept full entity objects with descriptions for better consistency.
   */
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      // Define validation schema for the request body
      const schema = z.object({
        prompt: z.string().min(1),                   // Required base prompt describing the image
        entityReferenceIds: z.record(z.string()).optional(), // Optional map of entity IDs to DALL-E reference IDs
        artStyle: z.string().optional(),             // Optional art style override
        entities: z.array(z.object({                 // Optional array of full entity objects
          id: z.string(),                            // Unique identifier for the entity
          name: z.string(),                          // Display name of the entity
          type: z.enum(['character', 'location', 'object']), // Entity type classification
          description: z.string(),                   // Detailed description for consistency
          generationId: z.string().optional()        // Optional DALL-E reference ID
        })).optional()
      });
      
      // Validate the incoming request data
      const parsedBody = schema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid image prompt data",
          errors: parsedBody.error.errors
        });
      }
      
      // Extract validated data
      const { prompt, entityReferenceIds, artStyle, entities } = parsedBody.data;
      
      // Log entity information for debugging and monitoring purposes
      if (entities && entities.length > 0) {
        console.log(`Generating image with ${entities.length} entities: ` + 
          entities.map(e => `${e.name} (${e.type})`).join(", "));
      }
      
      // Call our enhanced image generation function with all available entity information
      // This ensures consistent visuals across independently generated illustrations
      const imageResult = await generateImage({
        prompt,                                    // Base image description
        entityReferenceIds: entityReferenceIds || {}, // Entity reference mappings (if any)
        artStyle: artStyle || 'colorful',           // Art style (with fallback)
        entities: entities || []                    // Full entity objects for prompt enhancement
      });
      
      // Return the generation result to the client
      return res.json(imageResult);
    } catch (error) {
      // Comprehensive error handling with detailed logging
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
