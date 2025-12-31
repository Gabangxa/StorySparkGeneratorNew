
import { GoogleGenAI, Modality } from "@google/genai";
import { StoryEntity } from "@shared/schema";
import { storageService } from "./storage";
import { getArtStyleDescription } from "./constants";

const geminiAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GeminiImageOptions {
  prompt: string;
  referenceImagePaths?: string[]; // Paths (keys in object storage)
}

export class GeminiService {
  // Helper function to get detailed style description
  private getArtStyleDescription(style: string): string {
    return getArtStyleDescription(style);
  }

  // Convert URLs like "/generated-images/abc.png" to object storage keys "abc.png"
  private urlToStorageKey(imageUrl: string): string {
    if (imageUrl.startsWith('/generated-images/')) {
      return imageUrl.replace('/generated-images/', '');
    }
    return imageUrl;
  }

  async generateImage(options: string | GeminiImageOptions): Promise<string> {
    try {
      const prompt = typeof options === 'string' ? options : options.prompt;
      const referenceImagePaths = typeof options === 'string' ? [] : (options.referenceImagePaths || []);

      console.log("Generating image with Gemini (Nano Banana):", prompt.substring(0, 100) + "...");

      const contents: any[] = [];

      // Add reference images as inlineData
      for (const imagePath of referenceImagePaths) {
        try {
          // Download image from object storage
          const imageBuffer = await storageService.downloadImage(imagePath);
          const base64Data = imageBuffer.toString('base64');

          contents.push({
            inlineData: {
              mimeType: 'image/png',
              data: base64Data
            }
          });
          console.log(`Added reference image: ${imagePath}`);
        } catch (err) {
          console.warn(`Failed to read reference image ${imagePath}:`, err);
        }
      }

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

      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const imageData = Buffer.from(part.inlineData.data, "base64");

          // Upload to object storage
          const imageUrl = await storageService.uploadImage(imageData, "image/png");

          console.log(`Image saved to object storage: ${imageUrl}`);
          return imageUrl;
        }
      }

      throw new Error("No image data found in Gemini response");
    } catch (error) {
        // Safe error logging
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Gemini image generation error:", errorMessage);
        throw new Error(`Failed to generate image with Gemini: ${errorMessage}`);
    }
  }

  // ... (Other helper methods for generating prompts can be moved here or kept in a utility)
  // For now, I'll focus on the core generation logic being split.

    /**
   * Helper function to extract visual attributes from a character description
   */
  extractVisualAttributes(description: string): string[] {
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

  getStyleDescription(style: string) {
      return this.getArtStyleDescription(style);
  }
}

export const geminiService = new GeminiService();
