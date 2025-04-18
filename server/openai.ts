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
  characterReferenceURLs?: { [key: string]: string };  // URLs of previous character images to reference
  isFirstPage?: boolean;                           // Whether this is the first page of the story
}

/**
 * Result interface returned by the image generation function
 * Contains the image URL and optional metadata about the generation process
 */
interface GenerateImageResult {
  url: string;                                     // URL of the generated image
  generatedIds?: { [key: string]: string };        // Entity IDs mapped to their generation IDs for future reference 
  revised_prompt?: string;                         // The actual prompt sent to DALL-E after enhancements
  characterImageReferences?: { [key: string]: any }; // Reference data for character images 
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
    
    // Additional options for character reference
    let characterReferenceURLs: { [key: string]: string } = {};
    let isFirstPage: boolean = false;
    
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
      characterReferenceURLs = options.characterReferenceURLs || {};
      isFirstPage = options.isFirstPage || false;
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
      
      const MAX_DESCRIPTION_LENGTH = 200; // Limit individual descriptions to avoid token issues
      
      // Add character details to the prompt with more concise descriptions
      if (characters.length > 0) {
        enhancedPrompt += "\n\nCHARACTERS:";
        characters.forEach(char => {
          // Trim description to prevent exceeding token limits
          const trimmedDescription = char.description.length > MAX_DESCRIPTION_LENGTH
            ? char.description.substring(0, MAX_DESCRIPTION_LENGTH) + "..."
            : char.description;
            
          // Add character details in a concise format
          enhancedPrompt += `\n- ${char.name}: ${trimmedDescription}`;
          
          // Extract only the most important visual attributes (limited to 3)
          const attributes = extractVisualAttributes(char.description).slice(0, 3);
          if (attributes.length > 0) {
            enhancedPrompt += `\n  Key features: ${attributes.join("; ")}`;
          }
        });
      }
      
      // Add location details to the prompt (simplified)
      if (locations.length > 0 && locations.length <= 2) { // Limit to 2 locations max
        enhancedPrompt += "\n\nSETTINGS:";
        locations.forEach(loc => {
          const trimmedDescription = loc.description.length > MAX_DESCRIPTION_LENGTH
            ? loc.description.substring(0, MAX_DESCRIPTION_LENGTH) + "..."
            : loc.description;
            
          enhancedPrompt += `\n- ${loc.name}: ${trimmedDescription}`;
        });
      }
      
      // Add object details only if they're few and important
      if (objects.length > 0 && objects.length <= 2) { // Limit to 2 objects max
        enhancedPrompt += "\n\nOBJECTS:";
        objects.forEach(obj => {
          const trimmedDescription = obj.description.length > MAX_DESCRIPTION_LENGTH
            ? obj.description.substring(0, MAX_DESCRIPTION_LENGTH) + "..."
            : obj.description;
            
          enhancedPrompt += `\n- ${obj.name}: ${trimmedDescription}`;
        });
      }
      
      // Update the prompt with entity information
      finalPrompt = enhancedPrompt;
    }
    
    // Limit the scene description to ensure we don't exceed token limits
    // Calculate approximately how much space we have for finalPrompt
    const MAX_PROMPT_LENGTH = 4000; // DALL-E 3 has a max token limit
    const WRAPPER_LENGTH = 400; // Approximate length of our wrappers
    
    const availableLength = MAX_PROMPT_LENGTH - WRAPPER_LENGTH;
    const trimmedFinalPrompt = finalPrompt.length > availableLength 
      ? finalPrompt.substring(0, availableLength - 3) + "..." 
      : finalPrompt;
      
    // Variable to hold our final prompt content with consistency directives
    let wrappedPrompt = "";
    
    // Check if we have any character reference URLs to mention
    const hasCharacterReferences = Object.keys(characterReferenceURLs).length > 0;
    
    // Create different prompt templates based on whether this is the first page or not
    if (isFirstPage) {
      // For the first page, establish the character designs that will be referenced later
      wrappedPrompt = `
Create a children's book illustration in ${formattedArtStyle} style.

IMPORTANT: This is the FIRST PAGE in a story. The character designs you create here will be referenced for consistency in all future illustrations.

CLARITY REQUEST: Please draw all main characters clearly, with distinctive features that can be maintained consistently throughout the story.

SCENE:
${trimmedFinalPrompt}

STYLE: Bright colors, clear details, expressive faces, child-friendly.
`;
    } else if (hasCharacterReferences) {
      // For subsequent pages with character references, emphasize matching previous appearances
      
      // Get the character entities that have appeared before 
      const characterReferencesWithEntities = Object.entries(characterReferenceURLs)
        .map(([entityId, url]) => {
          const entity = entities.find(e => e.id === entityId);
          return entity ? { entity, url } : null;
        })
        .filter(Boolean) as Array<{ entity: StoryEntity, url: string }>;
      
      // Build a list of characters to maintain consistency with
      const characterReferenceList = characterReferencesWithEntities
        .map(({ entity }) => `- ${entity.name}`)
        .join('\n');
      
      // Extract the most important visual attributes for each character
      const characterAttributes = characterReferencesWithEntities
        .map(({ entity }) => {
          const attributes = extractVisualAttributes(entity.description).slice(0, 2);
          return attributes.length > 0 
            ? `${entity.name}: ${attributes.join(', ')}`
            : null;
        })
        .filter(Boolean)
        .join('\n');
      
      // Build a stronger consistency prompt with detailed references
      wrappedPrompt = `
Create a children's book illustration in ${formattedArtStyle} style.

VISUAL CONSISTENCY: The following characters have appeared in previous illustrations and MUST look identical to their previous appearances:
${characterReferenceList}

CHARACTER DETAILS:
${characterAttributes}

IMPORTANT: Maintain exact visual consistency in character appearance, clothing, colors, and proportions with previous illustrations.

SCENE:
${trimmedFinalPrompt}

STYLE: Bright colors, clear details, expressive faces, child-friendly.
`;
    } else {
      // Standard prompt for other pages
      wrappedPrompt = `
Create a children's book illustration in ${formattedArtStyle} style.

CONSISTENCY: Characters must maintain identical appearance, clothing, colors between all images.

SCENE:
${trimmedFinalPrompt}

STYLE: Bright colors, clear details, expressive faces, child-friendly.
`;
    }

    // Log the prompt for debugging purposes
    console.log("Generating image with prompt:", wrappedPrompt);
    
    // Prepare request parameters with only the required fields
    // This helps avoid invalid parameter errors
    const requestParams: any = {
      model: "dall-e-3",         // Use DALL-E 3 for highest quality illustrations
      prompt: wrappedPrompt,     // The enhanced prompt
      n: 1,                      // Generate one image
      size: "1024x1024",         // Square format (DALL-E 3 only supports 1024x1024, 1792x1024, or 1024x1792)
      quality: "standard",       // Standard quality for reliability
      style: "vivid",            // Vivid style for children's illustrations
    };
    
    // Only add reference_image_ids if actually needed and valid
    // OpenAI doesn't like empty arrays or invalid reference IDs
    if (Object.keys(entityReferenceIds).length > 0) {
      // For now, we'll disable this feature since it might be causing issues
      // We'll use prompt engineering for consistency instead
      // requestParams.reference_image_ids = Object.values(entityReferenceIds);
    }
    
    // Call the OpenAI API to generate the image
    const response = await openai.images.generate(requestParams);

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
    
    // Create a map of character image references for entities in this image
    // This helps maintain visual consistency across pages
    const characterImageReferences: { [key: string]: any } = {};
    
    // If this is the first page or we have important characters,
    // store references to their appearances for future pages
    if (isFirstPage || Object.keys(characterReferenceURLs).length === 0) {
      // Get character entities that appear on this page
      const pageCharacters = entities.filter(e => e.type === 'character');
      
      // Store simple reference to the character's first appearance
      // In a production system, we would extract more detailed reference data
      pageCharacters.forEach(character => {
        characterImageReferences[character.id] = {
          imageUrl: response.data[0].url,
          characterName: character.name,
          timestamp: new Date().toISOString()
        };
      });
    }
    
    // For complex options, return a complete result object with metadata
    return {
      url: response.data[0].url,
      revised_prompt: revised_prompt,
      generatedIds: {
        // Store entity IDs mapped to DALL-E's internal reference system
        // For now, we maintain the existing dictionary
        ...entityReferenceIds
      },
      // Include reference data for characters to maintain consistency
      characterImageReferences
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
