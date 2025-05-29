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
      
      // Find first appearance page for each entity (for reference images)
      const entityFirstAppearance: Record<string, number> = {};
      
      // Process pages to find entity frequency and first appearances
      generatedStory.pages.forEach((page, pageIndex) => {
        const pageEntities = page.entities || [];
        pageEntities.forEach(entityId => {
          // Count appearances
          entityFrequency[entityId] = (entityFrequency[entityId] || 0) + 1;
          
          // Record first appearance if not already recorded
          if (entityFirstAppearance[entityId] === undefined) {
            entityFirstAppearance[entityId] = pageIndex;
          }
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
      
      // Track first image of each entity (URL) for visual consistency
      const entityFirstImageURLs: Record<string, string> = {};
      
      // Track DALL-E reference images for characters
      // These are the images that we'll reuse for visual consistency
      const characterReferenceImages: Record<string, any> = {};
      
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
        
        // Keep track of which entities are making their first appearance on this page
        const firstAppearanceEntities = pageEntities.filter(entityId => 
          entityFirstAppearance[entityId] === index
        );
        
        // Keep track of entities that have appeared before (for reference)
        const recurringPageEntities = pageEntities.filter(entityId => 
          entityFirstAppearance[entityId] !== index && 
          entityFirstAppearance[entityId] !== undefined
        );
        
        console.log(`Page ${index + 1} has ${firstAppearanceEntities.length} new entities and ${recurringPageEntities.length} recurring entities`);
        
        // Get primary entities for this page
        const pagePrimaryEntities = entities.filter(entity => pageEntities.includes(entity.id));
        
        // For maximum consistency, always include all recurring characters in every prompt
        // even if they don't appear on this specific page
        const recurringEntityObjects = recurringEntities
          .filter(id => !pageEntities.includes(id)) // Only include recurring entities not already on this page
          .map(id => entityDetailsMap[id])
          .filter(Boolean);
        
        // Combine all entities needed for this page
        const allRelevantEntities = [...pagePrimaryEntities, ...recurringEntityObjects];
        
        // Build a reference image map for consistency with previous character appearances
        const characterReferenceURLs: Record<string, string> = {};
        
        // Add references to characters that have appeared before
        recurringPageEntities.forEach(entityId => {
          if (entityFirstImageURLs[entityId]) {
            characterReferenceURLs[entityId] = entityFirstImageURLs[entityId];
          }
        });
        
        // Log page entity information for debugging and monitoring
        console.log(`Page ${index + 1}: ` + 
          `${pagePrimaryEntities.length} visible entities, ` +
          `${recurringEntityObjects.length} recurring entities for consistency, ` + 
          `${allRelevantEntities.map(e => e.name).join(", ")}`);
        
        // Generate an illustration with our enhanced entity consistency approach
        const imageResult = await generateImage({
          prompt: page.imagePrompt,                   // Base image description
          entityReferenceIds: pageEntityRefs,         // References to maintain visual consistency
          artStyle,                                   // User-selected art style
          entities: allRelevantEntities,              // ALL relevant entities including those from other pages
          characterReferenceURLs,                     // URLs of previous character images for reference
          isFirstPage: index === 0                    // Flag if this is the first page of the story
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
          
          // Store reference data for entities making their first appearance
          if (imageResult.characterImageReferences) {
            Object.entries(imageResult.characterImageReferences).forEach(([entityId, imageData]) => {
              characterReferenceImages[entityId] = imageData;
            });
          }
        }
        
        // Store first image URLs for entities making their first appearance on this page
        firstAppearanceEntities.forEach(entityId => {
          entityFirstImageURLs[entityId] = imageUrl;
        });
        
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
  
  // Generate just the story text without images
  app.post("/api/generate-story-text", async (req: Request, res: Response) => {
    try {
      // For debugging
      console.log("Received generate-story-text request:", JSON.stringify(req.body));
      
      const schema = z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        storyType: z.string().min(1),
        ageRange: z.string().min(1),
        numberOfPages: z.number().min(1).optional()
      });
      
      const parsedBody = schema.safeParse(req.body);
      if (!parsedBody.success) {
        console.error("Invalid body:", JSON.stringify(req.body), "Errors:", parsedBody.error.errors);
        return res.status(400).json({ 
          message: "Invalid story data",
          errors: parsedBody.error.errors
        });
      }

      const { title, description, storyType, ageRange, numberOfPages } = parsedBody.data;

      // Get the full story data from OpenAI
      const storyData = await generateStory({
        title,
        description,
        storyType,
        ageRange,
        numberOfPages: numberOfPages || 5
      });
      
      // Return just the text content for each page
      const storyPages = storyData.pages.map((page, index) => ({
        pageNumber: index + 1,
        text: page.text
      }));
      
      return res.json({
        pages: storyPages,
        entities: storyData.entities
      });
    } catch (error) {
      console.error("Error generating story text:", error);
      return res.status(500).json({ 
        message: "Failed to generate story text", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update story text after user edits
  app.post("/api/update-story-text", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        pages: z.array(z.object({
          pageNumber: z.number(),
          text: z.string()
        }))
      });
      
      const parsedBody = schema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid story data",
          errors: parsedBody.error.errors
        });
      }

      // In a production app, you might want to save these changes to a database
      // For now, we'll just return the updated pages to confirm they were received
      return res.json({
        success: true,
        pages: parsedBody.data.pages
      });
    } catch (error) {
      console.error("Error updating story text:", error);
      return res.status(500).json({ 
        message: "Failed to update story text", 
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
  
  /**
   * Generate individual character reference images
   * Creates standalone character portraits for approval before scene generation
   */
  app.post("/api/generate-character-image", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        character: z.object({
          id: z.string(),
          name: z.string(),
          type: z.literal('character'),
          description: z.string(),
        }),
        artStyle: z.string()
      });
      
      const parsedBody = schema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid character data",
          errors: parsedBody.error.errors
        });
      }
      
      const { character, artStyle } = parsedBody.data;
      
      // Generate character reference image
      const characterPrompt = `
Create a character reference portrait for a children's book in ${artStyle} style.

CHARACTER: ${character.name}
DESCRIPTION: ${character.description}

Show the character in a neutral standing pose, front-facing view, full body visible.
Clean white background. Focus on establishing clear, distinctive character features.
Child-friendly, bright colors with crisp details.
      `.trim();

      console.log(`Generating character reference for ${character.name}`);

      const response = await generateImage(characterPrompt);
      const imageUrl = typeof response === 'string' ? response : response.url;
      
      return res.json({ url: imageUrl });
      
    } catch (error) {
      console.error("Error generating character image:", error);
      return res.status(500).json({ 
        message: "Failed to generate character image", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Image proxy for PDF rendering
   * Fetches images from external URLs and serves them locally
   * This helps with CORS issues when generating PDFs
   */
  app.get("/api/image-proxy", async (req: Request, res: Response) => {
    try {
      const url = req.query.url as string;
      
      if (!url) {
        return res.status(400).json({ message: "URL parameter is required" });
      }
      
      // Validate that this is from an expected domain to prevent abuse
      const validDomains = [
        "oaidalleapiprodscus.blob.core.windows.net",
        "openai-labs-public-images-prod.azureedge.net",
        "cdn.openai.com",
        "dalle-image-prod.azureedge.net"
      ];
      
      // Also allow any OpenAI-related domains
      const isOpenAIDomain = url.includes('openai') || url.includes('dalle');
      const isValidUrl = validDomains.some(domain => url.includes(domain)) || isOpenAIDomain;
      
      if (!isValidUrl) {
        console.log(`Rejecting URL: ${url}`);
        return res.status(400).json({ message: "Invalid image URL domain" });
      }
      
      // Fetch and stream the image
      const imageResponse = await fetch(url);
      
      if (!imageResponse.ok) {
        return res.status(imageResponse.status).json({ 
          message: `Failed to fetch image: ${imageResponse.statusText}` 
        });
      }
      
      // Get content type and set appropriate headers
      const contentType = imageResponse.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      // Stream the image data to the response
      const blob = await imageResponse.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      return res.send(buffer);
      
    } catch (error) {
      console.error("Error in image proxy:", error);
      return res.status(500).json({ 
        message: "Failed to proxy image", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
