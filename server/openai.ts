import OpenAI from "openai";
import { StoryEntity } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types for story generation
export type GenerateStoryRequest = {
  title: string;
  description: string;
  storyType: string;
  ageRange: string;
  numberOfPages: number;
};

export type StoryEntityWithAppearances = StoryEntity & {
  appearsInPages: number[];
}

export type GenerateStoryResponse = {
  pages: Array<{
    text: string;
    imagePrompt: string;
    entities: string[]; // IDs of entities appearing on this page
  }>;
  entities: StoryEntityWithAppearances[]; // Characters, locations, and objects to maintain consistency
};

// Generate a multi-page story with text and image prompts
export async function generateStory({
  title,
  description,
  storyType,
  ageRange,
  numberOfPages = 5,
}: GenerateStoryRequest): Promise<GenerateStoryResponse> {
  // First, generate the story with its entities
  const entityExtractionPrompt = `
    Create a children's storybook titled "${title}" based on this description: "${description}".
    
    This should be a ${storyType} story appropriate for children aged ${ageRange} years.
    
    First, identify the main characters, locations, and important objects that will appear in the story.
    Then create a ${numberOfPages}-page coherent narrative with these elements.
    
    Format your response as a JSON object with this structure:
    {
      "entities": [
        {
          "id": "unique_id_string",
          "name": "Name of character/location/object",
          "type": "character" or "location" or "object",
          "description": "Detailed visual description including appearance, colors, distinctive features, etc."
        },
        ...
      ],
      "pages": [
        {
          "text": "The narrative text for this page...",
          "entitiesPresent": ["id1", "id2", ...] // IDs of entities that appear on this page
        },
        ...
      ]
    }
    
    For characters, provide rich visual descriptions that will help maintain consistency across images.
    For locations, describe the setting in detail.
    For important objects, describe their appearance clearly.
    
    The story should be engaging, appropriate for the age range, and have a clear narrative arc.
  `;

  try {
    const entityResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: entityExtractionPrompt }],
      response_format: { type: "json_object" },
    });

    const entityContent = entityResponse.choices[0].message.content;
    if (!entityContent) {
      throw new Error("No content returned from OpenAI");
    }

    interface EntityResponse {
      id: string;
      name: string;
      type: 'character' | 'location' | 'object';
      description: string;
    }

    interface PageResponse {
      text: string;
      entitiesPresent?: string[];
    }

    interface StoryResponse {
      entities: EntityResponse[];
      pages: PageResponse[];
    }
    
    const parsedEntityResponse = JSON.parse(entityContent) as StoryResponse;
    const entities = parsedEntityResponse.entities || [];
    const storyPages = parsedEntityResponse.pages || [];

    // Next, generate image prompts for each page based on the story and entities
    const enhancedPages = await Promise.all(storyPages.map(async (page: PageResponse, index: number) => {
      const pageNum = index + 1;
      const pageEntities = page.entitiesPresent || [];
      
      // Get descriptions of entities present on this page
      const relevantEntities = entities.filter((entity: EntityResponse) => 
        pageEntities.includes(entity.id)
      );
      
      const entityDescriptions = relevantEntities
        .map((entity: EntityResponse) => `${entity.name} (${entity.type}): ${entity.description}`)
        .join('\n');

      const imagePromptRequest = `
        I need to create an illustration for page ${pageNum} of a children's storybook.
        
        The text on this page is: "${page.text}"
        
        The following characters/locations/objects appear on this page:
        ${entityDescriptions}
        
        Create a detailed, vivid image prompt for DALL-E that will:
        1. Accurately represent the scene described in the text
        2. Include all the mentioned entities with their visual characteristics
        3. Be appropriate for children aged ${ageRange} years
        4. Have a cohesive style matching a ${storyType} story
        
        Give me ONLY the image prompt text without any explanations or formatting.
      `;

      const imagePromptResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: imagePromptRequest }],
      });

      const imagePrompt = imagePromptResponse.choices[0].message.content || "";

      return {
        text: page.text,
        imagePrompt: imagePrompt.trim(),
        entities: pageEntities
      };
    }));

    // Prepare entities with page appearances
    const entitiesWithAppearances = entities.map((entity: EntityResponse) => {
      // Find which pages this entity appears in
      const appearsInPages = storyPages
        .map((page: PageResponse, index: number) => (page.entitiesPresent?.includes(entity.id) ? index + 1 : -1))
        .filter((pageNum: number) => pageNum !== -1);

      return {
        ...entity,
        appearsInPages
      };
    });

    return {
      pages: enhancedPages,
      entities: entitiesWithAppearances
    };
  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error(`Failed to generate story: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface GenerateImageOptions {
  prompt: string;
  entityReferenceIds?: { [key: string]: string }; // Map of entity IDs to DALL-E generation IDs
  artStyle?: string; // Art style for consistent look
}

interface GenerateImageResult {
  url: string;
  generatedIds?: { [key: string]: string }; // Entity IDs mapped to their generation IDs
}

// Generate an image for a story page with character consistency
export async function generateImage(
  prompt: string | GenerateImageOptions
): Promise<string | GenerateImageResult> {
  try {
    let finalPrompt: string;
    let entityReferenceIds: { [key: string]: string } = {};
    
    // Handle both simple string prompts and complex options
    if (typeof prompt === 'string') {
      finalPrompt = `Children's book illustration in landscape format. ${prompt}`;
    } else {
      // Build a prompt that references previous generations for consistency
      const options = prompt;
      finalPrompt = `Children's book illustration in ${options.artStyle || 'colorful'} style, landscape format. ${options.prompt}`;
      entityReferenceIds = options.entityReferenceIds || {};
    }

    // Generate the image
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      // Include reference IDs if provided to maintain character consistency
      ...(Object.keys(entityReferenceIds).length > 0 && {
        reference_image_ids: Object.values(entityReferenceIds)
      })
    });

    if (!response.data[0].url) {
      throw new Error("No image URL returned from OpenAI");
    }
    
    // If this was a simple string prompt, just return the URL
    if (typeof prompt === 'string') {
      return response.data[0].url;
    }
    
    // For complex options, return both URL and generation IDs for future reference
    return {
      url: response.data[0].url,
      generatedIds: {
        // Include any new generation IDs that might be used for future references
        // Note: This is a placeholder as the OpenAI API doesn't directly expose generation IDs
        // In a real implementation, we would extract relevant IDs from the response
      }
    };
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
