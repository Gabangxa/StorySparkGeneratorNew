import { GeminiService } from "../server/services/gemini";
import { getArtStyleDescription } from "../server/services/constants";

const ART_STYLES = [
  "anime",
  "watercolor", 
  "3d_cartoon",
  "pixel_art",
  "comic_book",
  "minimalist_caricature",
  "line_art",
  "stick_man",
  "gouache_texture"
] as const;

const SAMPLE_PROMPT = "A friendly fox wearing a blue scarf, standing in a sunny meadow with colorful flowers";

async function generateSampleImages() {
  const geminiService = new GeminiService();
  
  console.log("Starting sample image generation for all art styles...\n");
  
  for (const artStyle of ART_STYLES) {
    console.log(`\n=== Generating ${artStyle} ===`);
    
    const styleDescription = getArtStyleDescription(artStyle);
    const fullPrompt = `Create a children's book illustration in ${artStyle} style.

${styleDescription}

SCENE: ${SAMPLE_PROMPT}

Make it child-friendly and suitable for a storybook.`;

    try {
      console.log(`Prompt: ${fullPrompt.substring(0, 100)}...`);
      
      const imageUrl = await geminiService.generateImage({
        prompt: fullPrompt,
        colorMode: "color"
      });
      
      console.log(`Success! Image URL: ${imageUrl}`);
    } catch (error) {
      console.error(`Failed to generate ${artStyle}:`, error);
    }
  }
  
  console.log("\n=== All samples generated ===");
}

generateSampleImages().catch(console.error);
