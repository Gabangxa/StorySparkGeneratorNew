import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import { StoryEntity } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';
import * as fs from "fs";
import * as path from "path";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// OpenAI client for text generation
const openaiText = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Google Gemini client for image generation (Nano Banana model)
const geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Log API key status (without exposing the actual keys)
console.log('Text API key configured:', !!process.env.OPENAI_API_KEY);
console.log('Gemini Image API key configured:', !!process.env.GEMINI_API_KEY);

// Ensure generated images directory exists
const GENERATED_IMAGES_DIR = path.join(process.cwd(), 'public', 'generated-images');
if (!fs.existsSync(GENERATED_IMAGES_DIR)) {
  fs.mkdirSync(GENERATED_IMAGES_DIR, { recursive: true });
}

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
    
    Characters MUST have visual consistency throughout the book. For characters, create a CHARACTER DESIGN CARD format:
    
    CHARACTER NAME: [name]
    SPECIES/TYPE: [human/animal/robot etc.]
    PRIMARY COLOR SCHEME: [3 main colors max - be very specific like "bright red", "golden yellow", "deep blue"]
    KEY VISUAL MARKERS: [3-4 most distinctive features that make this character instantly recognizable]
    BODY SHAPE: [specific proportions - "round and short", "tall and thin", "medium build"]
    FACE FEATURES: [most distinctive facial characteristics]
    SIGNATURE CLOTHING/ACCESSORIES: [1-2 key items that character always wears]
    
    Make these descriptions short but extremely specific. Focus on features that would make the character instantly recognizable even in silhouette.
    
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
    const entityResponse = await openaiText.chat.completions.create({
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
        
        Create a detailed, vivid image generation prompt that will:
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
        Create a children's book illustration style with bright colors and child-friendly imagery.
        
        Give me ONLY the image prompt text without any explanations or formatting.
      `;

      const imagePromptResponse = await openaiText.chat.completions.create({
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
  entityReferenceIds?: { [key: string]: string };  // Map of entity IDs to generation IDs for consistency
  artStyle?: string;                               // Artistic style for the illustration (anime, watercolor, etc.)
  entities?: StoryEntity[];                        // Story entities to highlight in the prompt for consistency
  characterReferenceURLs?: { [key: string]: string };  // URLs of previous character images to reference
  characterReferencePaths?: string[];              // Filesystem paths to character reference images for Gemini
  isFirstPage?: boolean;                           // Whether this is the first page of the story
}

/**
 * Options for Gemini image generation with optional reference images
 */
interface GeminiImageOptions {
  prompt: string;
  referenceImagePaths?: string[];  // Local filesystem paths to reference images
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
 * Convert a local image URL path to an absolute filesystem path
 */
function urlToFilesystemPath(imageUrl: string): string {
  // Convert URLs like "/generated-images/abc.png" to absolute paths
  if (imageUrl.startsWith('/generated-images/')) {
    return path.join(GENERATED_IMAGES_DIR, imageUrl.replace('/generated-images/', ''));
  }
  return imageUrl;
}

/**
 * Generate an image using Google Gemini (Nano Banana model) and save to filesystem
 * Supports passing reference images for character consistency
 * Returns a URL path that can be served by the server
 */
async function generateGeminiImage(options: string | GeminiImageOptions): Promise<string> {
  try {
    // Normalize options
    const prompt = typeof options === 'string' ? options : options.prompt;
    const referenceImagePaths = typeof options === 'string' ? [] : (options.referenceImagePaths || []);
    
    console.log("Generating image with Gemini (Nano Banana):", prompt.substring(0, 100) + "...");
    if (referenceImagePaths.length > 0) {
      console.log(`Using ${referenceImagePaths.length} reference image(s) for consistency`);
    }
    
    // Build the contents array - reference images come FIRST, then the text prompt
    const contents: any[] = [];
    
    // Add reference images as inlineData (images must come before text for best results)
    for (const imagePath of referenceImagePaths) {
      try {
        const absolutePath = urlToFilesystemPath(imagePath);
        if (fs.existsSync(absolutePath)) {
          const imageBuffer = fs.readFileSync(absolutePath);
          const base64Data = imageBuffer.toString('base64');
          contents.push({
            inlineData: {
              mimeType: 'image/png',
              data: base64Data
            }
          });
          console.log(`Added reference image: ${imagePath}`);
        } else {
          console.warn(`Reference image not found: ${absolutePath}`);
        }
      } catch (err) {
        console.warn(`Failed to read reference image ${imagePath}:`, err);
      }
    }
    
    // Add the text prompt after the images
    contents.push(prompt);
    
    const response = await geminiAI.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No content parts in Gemini response");
    }

    // Find the image part in the response
    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.data) {
        // Generate unique filename
        const filename = `${uuidv4()}.png`;
        const filepath = path.join(GENERATED_IMAGES_DIR, filename);
        
        // Save the image to filesystem
        const imageData = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(filepath, imageData);
        
        console.log(`Image saved to: ${filepath}`);
        
        // Return the URL path that can be served
        return `/generated-images/${filename}`;
      }
    }

    throw new Error("No image data found in Gemini response");
  } catch (error) {
    console.error("Gemini image generation error:", error);
    throw new Error(`Failed to generate image with Gemini: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate character reference images first to establish visual consistency
 * This creates individual character portraits that can be referenced in story scenes
 */
async function generateCharacterReference(character: StoryEntity, artStyle: string): Promise<string> {
  const characterPrompt = `
Create a character reference sheet for a children's book character in ${artStyle} style.

CHARACTER: ${character.name}
DESCRIPTION: ${character.description}

Show the character in a neutral pose, front-facing view, with clear visibility of all distinguishing features.
Clean white background. Focus on establishing the character's definitive appearance for use in multiple scenes.
Child-friendly, bright colors.
  `.trim();

  console.log(`Generating character reference for ${character.name}`);

  return await generateGeminiImage(characterPrompt);
}

/**
 * Generate scene images that reference character designs for consistency
 * This creates story illustrations while maintaining character appearance
 * Now passes actual character images to Gemini for visual reference
 */
async function generateSceneWithCharacterReferences(
  scenePrompt: string, 
  characters: StoryEntity[], 
  characterImageUrls: Record<string, string>,
  artStyle: string
): Promise<string> {
  // Build character reference descriptions based on the reference images
  const characterRefs = characters
    .filter(char => characterImageUrls[char.id])
    .map(char => `${char.name}: matches the character shown in the reference image above`)
    .join(', ');

  // Collect reference image paths for characters in this scene
  const referenceImagePaths: string[] = [];
  for (const char of characters) {
    if (characterImageUrls[char.id]) {
      referenceImagePaths.push(characterImageUrls[char.id]);
    }
  }

  const enhancedPrompt = `
Use the reference image(s) above as strict visual references for the characters.

Create a children's book illustration in ${artStyle} style.

SCENE: ${scenePrompt}

CHARACTERS: ${characterRefs}
The characters must look EXACTLY like their reference images. Maintain all visual details including clothing, colors, proportions, and distinctive features.

STYLE: Bright colors, child-friendly illustrations.
  `.trim();

  console.log(`Generating scene with character references: ${characters.map(c => c.name).join(', ')}`);
  console.log(`Reference images: ${referenceImagePaths.join(', ')}`);

  // Pass the reference images along with the prompt
  return await generateGeminiImage({
    prompt: enhancedPrompt,
    referenceImagePaths: referenceImagePaths
  });
}

/**
 * Enhanced image generation with character consistency system
 * 
 * This function implements a two-phase approach:
 * 1. Generate character references if not already created
 * 2. Generate scene images that reference the character designs
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
    
    // Character reference image paths for Gemini multimodal input
    let characterReferencePaths: string[] = [];
    
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
      characterReferencePaths = options.characterReferencePaths || [];
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
      
      const MAX_DESCRIPTION_LENGTH = 100; // Much shorter descriptions to avoid token issues
      const MAX_CHARACTERS = 3; // Limit number of characters described in prompt
      
      // Add character details to the prompt with very concise descriptions
      if (characters.length > 0) {
        enhancedPrompt += "\n\nCHARACTERS:";
        
        // Only include the most important characters (limit to MAX_CHARACTERS)
        const primaryCharacters = characters.slice(0, MAX_CHARACTERS);
        
        primaryCharacters.forEach(char => {
          // Get just core visual attributes instead of full description
          const attributes = extractVisualAttributes(char.description).slice(0, 2);
          
          // Create a very concise character description
          const keyAttributes = attributes.length > 0 
            ? attributes.join(". ") 
            : char.description.substring(0, MAX_DESCRIPTION_LENGTH);
            
          // Add just the name and key attributes
          enhancedPrompt += `\n- ${char.name}: ${keyAttributes}`;
        });
        
        // If there are more characters than our limit, just mention their names
        if (characters.length > MAX_CHARACTERS) {
          const remainingCharacters = characters.slice(MAX_CHARACTERS).map(c => c.name).join(", ");
          enhancedPrompt += `\n- Others: ${remainingCharacters}`;
        }
      }
      
      // Add minimal location details (just name for context)
      if (locations.length > 0) {
        enhancedPrompt += "\n\nSETTING: ";
        enhancedPrompt += locations.map(loc => loc.name).join(", ");
      }
      
      // Add minimal object details (just name for context)
      if (objects.length > 0) {
        enhancedPrompt += "\n\nOBJECTS: ";
        enhancedPrompt += objects.map(obj => obj.name).join(", ");
      }
      
      // Update the prompt with entity information
      finalPrompt = enhancedPrompt;
    }
    
    // Use much stricter limits for DALL-E prompts
    // This helps avoid hitting API token limits
    const MAX_PROMPT_LENGTH = 1000; // Significantly reduced max length
    const WRAPPER_LENGTH = 200; // Approximate length of our wrappers
    
    const availableLength = MAX_PROMPT_LENGTH - WRAPPER_LENGTH;
    const trimmedFinalPrompt = finalPrompt.length > availableLength 
      ? finalPrompt.substring(0, availableLength - 3) + "..." 
      : finalPrompt;
      
    // Enhanced character consistency system
    let wrappedPrompt = "";
    
    // Extract character entities for enhanced consistency prompting
    const characterEntities = entities ? entities.filter(e => e.type === 'character') : [];
    
    // Create structured character design specifications
    let characterConsistencyBlock = "";
    if (characterEntities.length > 0) {
      characterConsistencyBlock = "\n\nCHARACTER DESIGN SPECIFICATIONS:\n";
      characterEntities.forEach(char => {
        const desc = char.description.toLowerCase();
        
        // Extract primary colors
        const colors = desc.match(/\b(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|silver|gold|rainbow|metallic)\b/g) || [];
        const primaryColors = colors.slice(0, 3).join(', ') || 'vibrant colors';
        
        // Extract key shape descriptors
        const shapes = desc.match(/\b(round|square|tall|short|thin|thick|small|large|compact|sleek|curved|angular)\b/g) || [];
        const bodyShape = shapes.slice(0, 2).join(', ') || 'distinctive shape';
        
        // Extract material/texture info
        let material = 'standard';
        if (desc.includes('metal') || desc.includes('robot') || desc.includes('droid')) material = 'metallic/robotic';
        if (desc.includes('fur') || desc.includes('furry')) material = 'furry';
        if (desc.includes('feather')) material = 'feathered';
        
        characterConsistencyBlock += `${char.name}: ${primaryColors} | ${bodyShape} | ${material}\n`;
      });
      characterConsistencyBlock += "\nMAINTAIN EXACT APPEARANCE: Colors, shapes, and materials must be identical in every scene.\n";
    }
    
    // Create the main prompt based on page type
    if (isFirstPage) {
      wrappedPrompt = `
Create a children's book illustration in ${formattedArtStyle} style.

IMPORTANT: This is the FIRST page - establish definitive character designs that will be maintained throughout the story.

SCENE:
${trimmedFinalPrompt}${characterConsistencyBlock}

STYLE: Bright colors, child-friendly illustrations with clear, distinctive character features.
`;
    } else {
      // For subsequent pages, use stronger consistency language
      const characterNames = characterEntities.map(e => e.name).join(', ');
      
      wrappedPrompt = `
Create a children's book illustration in ${formattedArtStyle} style.

CRITICAL: Characters (${characterNames}) must appear EXACTLY as established in previous illustrations.

SCENE:
${trimmedFinalPrompt}${characterConsistencyBlock}

CONSISTENCY RULE: Every visual detail of each character must match their previous appearances precisely.

STYLE: Bright colors, child-friendly illustrations.
`;
    }

    // Collect reference image paths from characterReferenceURLs if not already provided
    if (characterReferencePaths.length === 0 && Object.keys(characterReferenceURLs).length > 0) {
      characterReferencePaths = Object.values(characterReferenceURLs).slice(0, 3); // Limit to 3 for API efficiency
    }
    
    // If we have reference images, update the prompt to mention them
    if (characterReferencePaths.length > 0) {
      wrappedPrompt = `Use the reference image(s) above as strict visual references for the characters.

${wrappedPrompt}`;
    }
    
    // Log the prompt for debugging purposes
    console.log("Generating image with prompt:", wrappedPrompt);
    if (characterReferencePaths.length > 0) {
      console.log(`Using ${characterReferencePaths.length} character reference image(s)`);
    }
    
    // Call Gemini (Nano Banana) to generate the image with reference images
    const imageUrl = await generateGeminiImage({
      prompt: wrappedPrompt,
      referenceImagePaths: characterReferencePaths
    });
    
    // For simple string prompts, just return the URL
    if (typeof prompt === 'string') {
      return imageUrl;
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
      pageCharacters.forEach(character => {
        characterImageReferences[character.id] = {
          imageUrl: imageUrl,
          characterName: character.name,
          timestamp: new Date().toISOString()
        };
      });
    }
    
    // For complex options, return a complete result object with metadata
    return {
      url: imageUrl,
      revised_prompt: wrappedPrompt,
      generatedIds: {
        ...entityReferenceIds
      },
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
