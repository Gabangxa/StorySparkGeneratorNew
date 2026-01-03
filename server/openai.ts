import { StoryEntity } from "@shared/schema";
import { openaiService, StoryResponse } from "./services/openai";
import { geminiService } from "./services/gemini";
import { getArtStyleDescription } from "./services/constants";

// Re-export types for compatibility
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
  try {
    // 1. Generate text and entities using OpenAI service
    const storyData = await openaiService.generateStoryEntities(
      title,
      description,
      storyType,
      ageRange,
      numberOfPages
    );

    const entities = storyData.entities || [];
    const storyPages = storyData.pages || [];

    // 2. Generate detailed image prompts for each page
    // Note: We use the existing openai service to enhance prompts
    const enhancedPages = await Promise.all(storyPages.map(async (page, index) => {
      const pageNum = index + 1;
      const imagePrompt = await openaiService.generateImagePrompt(
        title,
        page,
        entities,
        ageRange,
        storyType,
        pageNum
      );

      return {
        text: page.text,
        imagePrompt: imagePrompt,
        entities: page.entitiesPresent || []
      };
    }));

    // Prepare entities with page appearances
    const entitiesWithAppearances = entities.map((entity) => {
      // Find which pages this entity appears in
      const appearsInPages = storyPages
        .map((page, index) => (page.entitiesPresent?.includes(entity.id) ? index + 1 : -1))
        .filter((pageNum) => pageNum !== -1);

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
 */
interface GenerateImageOptions {
  prompt: string;                                  // Base prompt describing the image to be generated
  entityReferenceIds?: { [key: string]: string };  // Map of entity IDs to generation IDs for consistency
  artStyle?: string;                               // Artistic style for the illustration (anime, watercolor, etc.)
  colorMode?: string;                              // Color mode: "color" or "monochrome"
  entities?: StoryEntity[];                        // Story entities to highlight in the prompt for consistency
  characterReferenceURLs?: { [key: string]: string };  // URLs of previous character images to reference
  characterReferencePaths?: string[];              // Filesystem paths to character reference images for Gemini
  isFirstPage?: boolean;                           // Whether this is the first page of the story
}

/**
 * Result interface returned by the image generation function
 */
interface GenerateImageResult {
  url: string;                                     // URL of the generated image
  generatedIds?: { [key: string]: string };        // Entity IDs mapped to their generation IDs for future reference 
  revised_prompt?: string;                         // The actual prompt sent to DALL-E after enhancements
  characterImageReferences?: { [key: string]: any }; // Reference data for character images 
}


/**
 * Enhanced image generation with character consistency system
 */
export async function generateImage(
  prompt: string | GenerateImageOptions
): Promise<string | GenerateImageResult> {
  try {
    // Initialize variables with default values
    let finalPrompt: string;
    let entityReferenceIds: { [key: string]: string } = {};
    let artStyle: string = 'colorful';
    let colorMode: string = 'color';
    let entities: StoryEntity[] = [];
    
    // Additional options for character reference
    let characterReferenceURLs: { [key: string]: string } = {};
    let isFirstPage: boolean = false;
    
    // Character reference image paths for Gemini multimodal input
    let characterReferencePaths: string[] = [];
    
    // Handle both simple string prompts and complex options
    if (typeof prompt === 'string') {
      finalPrompt = prompt;
    } else {
      const options = prompt;
      finalPrompt = options.prompt;
      entityReferenceIds = options.entityReferenceIds || {};
      artStyle = options.artStyle || 'colorful';
      colorMode = options.colorMode || 'color';
      entities = options.entities || [];
      characterReferenceURLs = options.characterReferenceURLs || {};
      characterReferencePaths = options.characterReferencePaths || [];
      isFirstPage = options.isFirstPage || false;
    }

    // Enhance the prompt with entity details if available for better consistency
    if (entities.length > 0) {
      // Categorize entities by type for better organization in the prompt
      const characters = entities.filter(e => e.type === 'character');
      const locations = entities.filter(e => e.type === 'location');
      const objects = entities.filter(e => e.type === 'object');
      
      let enhancedPrompt = finalPrompt;
      
      const MAX_DESCRIPTION_LENGTH = 100;
      const MAX_CHARACTERS = 3;
      
      if (characters.length > 0) {
        enhancedPrompt += "\n\nCHARACTERS:";
        const primaryCharacters = characters.slice(0, MAX_CHARACTERS);
        
        primaryCharacters.forEach(char => {
          const attributes = geminiService.extractVisualAttributes(char.description).slice(0, 2);
          const keyAttributes = attributes.length > 0 
            ? attributes.join(". ") 
            : char.description.substring(0, MAX_DESCRIPTION_LENGTH);
          enhancedPrompt += `\n- ${char.name}: ${keyAttributes}`;
        });
        
        if (characters.length > MAX_CHARACTERS) {
          const remainingCharacters = characters.slice(MAX_CHARACTERS).map(c => c.name).join(", ");
          enhancedPrompt += `\n- Others: ${remainingCharacters}`;
        }
      }
      
      if (locations.length > 0) {
        enhancedPrompt += "\n\nSETTING: ";
        enhancedPrompt += locations.map(loc => loc.name).join(", ");
      }
      
      if (objects.length > 0) {
        enhancedPrompt += "\n\nOBJECTS: ";
        enhancedPrompt += objects.map(obj => obj.name).join(", ");
      }
      
      finalPrompt = enhancedPrompt;
    }
    
    // Limits
    const MAX_PROMPT_LENGTH = 1000;
    const WRAPPER_LENGTH = 200;
    
    const availableLength = MAX_PROMPT_LENGTH - WRAPPER_LENGTH;
    const trimmedFinalPrompt = finalPrompt.length > availableLength 
      ? finalPrompt.substring(0, availableLength - 3) + "..." 
      : finalPrompt;
      
    // Enhanced character consistency system
    let wrappedPrompt = "";
    
    const characterEntities = entities ? entities.filter(e => e.type === 'character') : [];
    
    let characterConsistencyBlock = "";
    if (characterEntities.length > 0) {
      characterConsistencyBlock = "\n\nCHARACTER DESIGN SPECIFICATIONS:\n";
      characterEntities.forEach(char => {
        const desc = char.description.toLowerCase();
        
        const colors = desc.match(/\b(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|silver|gold|rainbow|metallic)\b/g) || [];
        const primaryColors = colors.slice(0, 3).join(', ') || 'vibrant colors';
        
        const shapes = desc.match(/\b(round|square|tall|short|thin|thick|small|large|compact|sleek|curved|angular)\b/g) || [];
        const bodyShape = shapes.slice(0, 2).join(', ') || 'distinctive shape';
        
        let material = 'standard';
        if (desc.includes('metal') || desc.includes('robot') || desc.includes('droid')) material = 'metallic/robotic';
        if (desc.includes('fur') || desc.includes('furry')) material = 'furry';
        if (desc.includes('feather')) material = 'feathered';
        
        characterConsistencyBlock += `${char.name}: ${primaryColors} | ${bodyShape} | ${material}\n`;
      });
      characterConsistencyBlock += "\nMAINTAIN EXACT APPEARANCE: Colors, shapes, and materials must be identical in every scene.\n";
    }
    
    const styleDescription = getArtStyleDescription(artStyle);
    
    if (isFirstPage) {
      wrappedPrompt = `
Create a children's book illustration.

=== ART STYLE (MUST FOLLOW EXACTLY) ===
${styleDescription}

IMPORTANT: This is the FIRST page - establish definitive character designs that will be maintained throughout the story.

=== SCENE ===
${trimmedFinalPrompt}${characterConsistencyBlock}

=== REQUIREMENTS ===
- Child-friendly illustration suitable for a storybook
- Clear, distinctive character features
- The art style characteristics listed above are MANDATORY
- Every visual element must reflect the specified style
`;
    } else {
      const characterNames = characterEntities.map(e => e.name).join(', ');
      
      wrappedPrompt = `
Create a children's book illustration.

=== ART STYLE (MUST FOLLOW EXACTLY) ===
${styleDescription}

CRITICAL: Characters (${characterNames}) must appear EXACTLY as established in previous illustrations.

=== SCENE ===
${trimmedFinalPrompt}${characterConsistencyBlock}

=== REQUIREMENTS ===
- Every visual detail of each character must match their previous appearances precisely
- Child-friendly illustration suitable for a storybook
- The art style characteristics listed above are MANDATORY
- Every visual element must reflect the specified style
`;
    }

    if (characterReferencePaths.length === 0 && Object.keys(characterReferenceURLs).length > 0) {
      characterReferencePaths = Object.values(characterReferenceURLs).slice(0, 3);
    }
    
    if (characterReferencePaths.length > 0) {
      wrappedPrompt = `Use the reference image(s) above as strict visual references for the characters.

${wrappedPrompt}`;
    }
    
    // Use Gemini Service to generate image
    const imageUrl = await geminiService.generateImage({
      prompt: wrappedPrompt,
      referenceImagePaths: characterReferencePaths,
      colorMode
    });
    
    if (typeof prompt === 'string') {
      return imageUrl;
    }
    
    const characterImageReferences: { [key: string]: any } = {};
    
    if (isFirstPage || Object.keys(characterReferenceURLs).length === 0) {
      const pageCharacters = entities.filter(e => e.type === 'character');
      
      pageCharacters.forEach(character => {
        characterImageReferences[character.id] = {
          imageUrl: imageUrl,
          characterName: character.name,
          timestamp: new Date().toISOString()
        };
      });
    }
    
    return {
      url: imageUrl,
      revised_prompt: wrappedPrompt,
      generatedIds: {
        ...entityReferenceIds
      },
      characterImageReferences
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error generating image:", errorMessage);
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
}
