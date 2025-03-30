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
      const pages: StoryPage[] = await Promise.all(
        generatedStory.pages.map(async (page, index) => {
          // Extract the entities that appear on this specific page
          const pageEntities = page.entities || [];
          
          // Create a mapping of entity IDs to their DALL-E generation IDs for visual consistency
          // This helps DALL-E maintain the same visual appearance for recurring characters/objects
          const pageEntityRefs: Record<string, string> = {};
          pageEntities.forEach(entityId => {
            if (entityGenerationIds[entityId]) {
              pageEntityRefs[entityId] = entityGenerationIds[entityId];
            }
          });
          
          // Get the complete entity objects (with descriptions) for this page
          // This enhances the prompt with detailed descriptions of each entity
          const relevantEntities = entities
            .filter(entity => pageEntities.includes(entity.id));
            
          // Log page entity information for debugging and monitoring
          console.log(`Page ${index + 1} has ${relevantEntities.length} entities: ` + 
            relevantEntities.map(e => e.name).join(", "));
          
          // Generate an illustration with our enhanced entity consistency approach
          // We pass full entity objects to include their descriptions in the prompt
          const imageResult = await generateImage({
            prompt: page.imagePrompt,               // Base image description
            entityReferenceIds: pageEntityRefs,     // References to maintain visual consistency
            artStyle,                               // User-selected art style
            entities: relevantEntities              // Complete entity objects with descriptions
          });
          
          // Variables to store the generation results
          let imageUrl: string;
          let revisedPrompt: string | undefined;
          
          // Handle different return types from the generateImage function
          if (typeof imageResult === 'string') {
            // Simple string result (just the URL)
            imageUrl = imageResult;
          } else {
            // Complex result object with metadata
            imageUrl = imageResult.url;
            revisedPrompt = imageResult.revised_prompt;
            
            // Store any new generation IDs for future page references
            // This is how we maintain visual consistency across the storybook
            if (imageResult.generatedIds) {
              Object.entries(imageResult.generatedIds).forEach(([entityId, genId]) => {
                entityGenerationIds[entityId] = genId;
              });
            }
          }
          
          // Return the complete page object with generated image
          return {
            pageNumber: index + 1,                           // Sequential page number
            text: page.text,                                 // Story text for this page
            imageUrl,                                        // URL of the generated illustration
            imagePrompt: revisedPrompt || page.imagePrompt, // Store the revised prompt if available
            entities: pageEntities                          // IDs of entities appearing on this page
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
