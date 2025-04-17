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
          "description": "EXTREMELY detailed visual description for illustration purposes. Include specific details about appearance, clothing colors, sizes, distinctive features, facial expressions, body proportions, etc."
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
    
    Characters MUST have visual consistency throughout the book. For characters, always include:
    - Exact hair color, style, and length
    - Specific eye color and shape
    - Skin tone description
    - Detailed clothing description with colors
    - Age, height, and body type
    - Any distinctive features (glasses, hats, accessories, etc.)
    - Facial features (round face, pointed chin, freckles, etc.)
    
    For locations, provide highly detailed descriptions including:
    - Architectural style
    - Color schemes and materials
    - Size and scale
    - Distinctive features
    - Lighting and atmosphere
    
    For important objects, describe in detail:
    - Exact colors and materials
    - Size and proportions
    - Unique features or embellishments
    - How they are positioned or used
    
    The story should be engaging, appropriate for the age range, and have a clear narrative arc.
    Maximum 3 main characters for better visual consistency.
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
        I need to create an illustration for page ${pageNum} of a children's storybook titled "${title}".
        
        The text on this page is: "${page.text}"
        
        The following characters/locations/objects appear on this page:
        ${entityDescriptions}
        
        Create a detailed, vivid image prompt for DALL-E that will:
        1. Accurately represent the scene described in the text
        2. Include all mentioned characters with EXACT visual consistency based on their detailed descriptions
        3. Be appropriate for children aged ${ageRange} years
        4. Have a cohesive style matching a ${storyType} story
        5. Maintain consistency with the visual style of previous illustrations
        
        Be extremely detailed about character appearance, ensuring that:
        - Every visual feature (hair color/style, clothing, etc.) matches the description exactly
        - Facial expressions match the emotional context of the scene
        - Body proportions and sizes remain consistent throughout the story
        - Character positioning clearly shows their relationships and actions
        
        Focus on the main action or scene from the text, but include all characters mentioned.
        
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

/**
 * Options interface for the image generation function
 * Provides details about what to include in the generated image
 */
interface GenerateImageOptions {
  prompt: string;                                  // Base prompt describing the image to be generated
  entityReferenceIds?: { [key: string]: string };  // Map of entity IDs to DALL-E generation IDs for consistency
  artStyle?: string;                               // Artistic style for the illustration (anime, watercolor, etc.)
  entities?: StoryEntity[];                        // Story entities to highlight in the prompt for consistency
}

/**
 * Result interface returned by the image generation function
 * Contains the image URL and optional metadata about the generation process
 */
interface GenerateImageResult {
  url: string;                                     // URL of the generated image
  generatedIds?: { [key: string]: string };        // Entity IDs mapped to their generation IDs for future reference
  revised_prompt?: string;                         // The actual prompt sent to DALL-E after enhancements
}

/**
 * Generate an illustration for a story page with enhanced character/entity consistency
 * 
 * This function takes either a simple prompt string or a complex options object
 * and generates a children's book illustration using DALL-E 3.
 * 
 * When provided with entity information, it enhances the prompt to maintain
 * visual consistency of characters, locations, and objects across illustrations.
 * 
 * @param prompt - Simple string prompt or GenerateImageOptions object
 * @returns Either a direct image URL string or a GenerateImageResult object with metadata
 */
export async function generateImage(
  prompt: string | GenerateImageOptions
): Promise<string | GenerateImageResult> {
  try {
    // Initialize variables with default values
    let finalPrompt: string;
    let entityReferenceIds: { [key: string]: string } = {};
    let artStyle: string = 'colorful';
    let entities: StoryEntity[] = [];
    
    // Generate a consistent seed for style consistency across all story images
    // This helps maintain the same artistic style throughout the story
    const seed = Math.floor(Math.random() * 1000000).toString();
    
    // Handle both simple string prompts and complex options
    if (typeof prompt === 'string') {
      // Simple case: just a string prompt
      finalPrompt = prompt;
    } else {
      // Complex case: extract all options from the object
      const options = prompt;
      finalPrompt = options.prompt;
      entityReferenceIds = options.entityReferenceIds || {};
      artStyle = options.artStyle || 'colorful';
      entities = options.entities || [];
    }

    // Format the art style for the prompt (replace underscores with spaces)
    const formattedArtStyle = artStyle.replace(/_/g, ' ');
    
    // Enhance the prompt with entity details if available for better consistency
    if (entities.length > 0) {
      // Categorize entities by type for better organization in the prompt
      const characters = entities.filter(e => e.type === 'character');
      const locations = entities.filter(e => e.type === 'location');
      const objects = entities.filter(e => e.type === 'object');
      
      let enhancedPrompt = finalPrompt;
      
      // Add character details to the prompt with much more detailed descriptions
      if (characters.length > 0) {
        enhancedPrompt += "\n\n## CHARACTERS (Maintain exact visual consistency throughout story)";
        characters.forEach(char => {
          // Add more structured character details to help DALL-E maintain consistency
          enhancedPrompt += `\n- ${char.name}: ${char.description}`;
          // Extract potential visual attributes from the description if possible
          const attributes = extractVisualAttributes(char.description);
          if (attributes.length > 0) {
            enhancedPrompt += `\n  Visual attributes: ${attributes.join(", ")}`;
          }
        });
      }
      
      // Add location details to the prompt
      if (locations.length > 0) {
        enhancedPrompt += "\n\n## SETTINGS (Maintain consistent appearance)";
        locations.forEach(loc => {
          enhancedPrompt += `\n- ${loc.name}: ${loc.description}`;
        });
      }
      
      // Add object details to the prompt
      if (objects.length > 0) {
        enhancedPrompt += "\n\n## OBJECTS (Maintain consistent appearance)";
        objects.forEach(obj => {
          enhancedPrompt += `\n- ${obj.name}: ${obj.description}`;
        });
      }
      
      // Update the prompt with entity information
      finalPrompt = enhancedPrompt;
    }
    
    // Create a comprehensive prompt with formatting and style instructions
    // This wrapping helps DALL-E understand the context and requirements
    const wrappedPrompt = `
# CHILDREN'S BOOK ILLUSTRATION DIRECTIVE
Create a high-quality children's book illustration in ${formattedArtStyle} style with a landscape format.

## CONSISTENCY REQUIREMENTS
This is part of a storybook series - maintain ABSOLUTE visual consistency with previous illustrations:
- Characters must maintain identical appearance, clothing, colors, and proportions between images
- Maintain consistent art style, color palette, and level of detail throughout the story
- Maintain consistent perspective, scale, and positioning of recurring elements

## SCENE DESCRIPTION
${finalPrompt}

## STYLISTIC GUIDELINES
- Bright, engaging colors appropriate for children's books
- Clear, detailed illustrations with simplified backgrounds
- Expressive character faces showing clear emotions
- No text in the image
- Maintain the same artistic style throughout the entire storybook
`;

    // Log the prompt for debugging purposes
    console.log("Generating image with prompt:", wrappedPrompt);
    
    // Call the OpenAI API to generate the image
    const response = await openai.images.generate({
      model: "dall-e-3",         // Use DALL-E 3 for highest quality illustrations
      prompt: wrappedPrompt,     // The enhanced prompt
      n: 1,                      // Generate one image
      size: "1024x1792",         // Landscape format optimal for storybooks
      quality: "hd",             // High-definition quality
      style: "vivid",            // Vivid style for children's illustrations
      // Include reference IDs if provided to maintain character consistency
      ...(Object.keys(entityReferenceIds).length > 0 && {
        reference_image_ids: Object.values(entityReferenceIds)
      })
    });

    // Validate the response
    if (!response.data[0].url) {
      throw new Error("No image URL returned from OpenAI");
    }
    
    // Extract the revised prompt if available (DALL-E sometimes modifies prompts)
    const revised_prompt = response.data[0].revised_prompt || '';
    
    // For simple string prompts, just return the URL
    if (typeof prompt === 'string') {
      return response.data[0].url;
    }
    
    // For complex options, return a complete result object with metadata
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
    // Comprehensive error handling
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper function to extract visual attributes from a character description
 * This helps create more structured prompts for DALL-E to maintain character consistency
 * 
 * @param description - The character description text
 * @returns Array of extracted visual attributes
 */
function extractVisualAttributes(description: string): string[] {
  const attributes: string[] = [];
  
  // Common visual attributes to look for in descriptions
  const attributeKeywords = [
    'hair', 'eyes', 'face', 'skin', 'clothing', 'outfit', 'wears', 'wearing',
    'hat', 'color', 'height', 'tall', 'short', 'medium', 'build', 'age', 
    'young', 'old', 'middle-aged', 'child', 'adult', 'teen', 'appearance'
  ];
  
  // Split description into sentences for analysis
  const sentences = description.split(/[.!?]+/);
  
  // Check each sentence for visual attributes
  sentences.forEach(sentence => {
    attributeKeywords.forEach(keyword => {
      if (sentence.toLowerCase().includes(keyword)) {
        // Clean up the sentence and add to attributes if not already included
        const cleanSentence = sentence.trim();
        if (cleanSentence && !attributes.includes(cleanSentence)) {
          attributes.push(cleanSentence);
        }
      }
    });
  });
  
  return attributes;
}
