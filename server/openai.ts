import OpenAI from "openai";

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

export type GenerateStoryResponse = {
  pages: Array<{
    text: string;
    imagePrompt: string;
  }>;
};

// Generate a multi-page story with text and image prompts
export async function generateStory({
  title,
  description,
  storyType,
  ageRange,
  numberOfPages = 5,
}: GenerateStoryRequest): Promise<GenerateStoryResponse> {
  const prompt = `
    Create a children's storybook titled "${title}" based on this description: "${description}".
    
    This should be a ${storyType} story appropriate for children aged ${ageRange} years.
    
    Create a ${numberOfPages}-page storybook where each page has a short paragraph of text and a matching illustration prompt.
    Keep the text simple, engaging, and appropriate for the age range.
    
    Format your response as a JSON object with this structure:
    {
      "pages": [
        {
          "text": "The text for page 1...",
          "imagePrompt": "Detailed prompt for DALL-E to generate the illustration for page 1..."
        },
        ...
      ]
    }
    
    For the image prompts, make them vivid, detailed and child-friendly. Ensure they match the text and follow a coherent visual style.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const parsedResponse = JSON.parse(content) as GenerateStoryResponse;
    return parsedResponse;
  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error(`Failed to generate story: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Generate an image for a story page
export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Children's book illustration in landscape format. ${prompt}`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data[0].url) {
      throw new Error("No image URL returned from OpenAI");
    }

    return response.data[0].url;
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
}
