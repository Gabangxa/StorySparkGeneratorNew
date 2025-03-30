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
  entities?: StoryEntity[]; // Story entities to highlight in the prompt
}

interface GenerateImageResult {
  url: string;
  generatedIds?: { [key: string]: string }; // Entity IDs mapped to their generation IDs
  revised_prompt?: string; // The actual prompt sent to DALL-E after enhancements
}

// Generate an image for a story page with character consistency
export async function generateImage(
  prompt: string | GenerateImageOptions
): Promise<string | GenerateImageResult> {
  try {
    let finalPrompt: string;
    let entityReferenceIds: { [key: string]: string } = {};
    let artStyle: string = 'colorful';
    let entities: StoryEntity[] = [];
    
    // Handle both simple string prompts and complex options
    if (typeof prompt === 'string') {
      finalPrompt = prompt;
    } else {
      // Extract options
      const options = prompt;
      finalPrompt = options.prompt;
      entityReferenceIds = options.entityReferenceIds || {};
      artStyle = options.artStyle || 'colorful';
      entities = options.entities || [];
    }

    // Format the art style for the prompt
    const formattedArtStyle = artStyle.replace(/_/g, ' ');
    
    // Enhance the prompt with entity details if available
    if (entities.length > 0) {
      // Extract characters, locations, and objects
      const characters = entities.filter(e => e.type === 'character');
      const locations = entities.filter(e => e.type === 'location');
      const objects = entities.filter(e => e.type === 'object');
      
      let enhancedPrompt = finalPrompt;
      
      // Add character details
      if (characters.length > 0) {
        enhancedPrompt += "\n\nInclude these characters with consistent appearances:";
        characters.forEach(char => {
          enhancedPrompt += `\n- ${char.name}: ${char.description}`;
        });
      }
      
      // Add location details
      if (locations.length > 0) {
        enhancedPrompt += "\n\nInclude these locations with consistent appearances:";
        locations.forEach(loc => {
          enhancedPrompt += `\n- ${loc.name}: ${loc.description}`;
        });
      }
      
      // Add object details
      if (objects.length > 0) {
        enhancedPrompt += "\n\nInclude these objects with consistent appearances:";
        objects.forEach(obj => {
          enhancedPrompt += `\n- ${obj.name}: ${obj.description}`;
        });
      }
      
      finalPrompt = enhancedPrompt;
    }
    
    // Prepare the final prompt with formatting and style instructions
    const wrappedPrompt = `
Create a high-quality children's book illustration in ${formattedArtStyle} style with a landscape format.
Make all visual elements consistent with previous illustrations in the story.
Ensure characters, locations, and objects maintain their exact same appearance across all illustrations.

${finalPrompt}

The illustration should be bright, engaging, and appropriate for children's books with clear details.
`;

    console.log("Generating image with prompt:", wrappedPrompt);
    
    // Generate the image
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: wrappedPrompt,
      n: 1,
      size: "1024x1792", // Landscape format
      quality: "hd",
      style: "vivid",
      // Include reference IDs if provided to maintain character consistency
      ...(Object.keys(entityReferenceIds).length > 0 && {
        reference_image_ids: Object.values(entityReferenceIds)
      })
    });

    if (!response.data[0].url) {
      throw new Error("No image URL returned from OpenAI");
    }
    
    // Extract the revised_prompt if available
    const revised_prompt = response.data[0].revised_prompt || '';
    
    // If this was a simple string prompt, just return the URL
    if (typeof prompt === 'string') {
      return response.data[0].url;
    }
    
    // For complex options, return both URL and additional information
    return {
      url: response.data[0].url,
      revised_prompt: revised_prompt,
      generatedIds: {
        // Store entity IDs mapped to DALL-E's internal reference system
        // In a production system, we would extract these from OpenAI's response
        // For now, we maintain the existing dictionary
        ...entityReferenceIds
      }
    };
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
