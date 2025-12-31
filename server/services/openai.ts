
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types from the original file
export type GenerateStoryRequest = {
  title: string;
  description: string;
  storyType: string;
  ageRange: string;
  numberOfPages: number;
};

export interface EntityResponse {
  id: string;
  name: string;
  type: 'character' | 'location' | 'object';
  description: string;
}

export interface PageResponse {
  text: string;
  entitiesPresent?: string[];
}

export interface StoryResponse {
  entities: EntityResponse[];
  pages: PageResponse[];
}

export class OpenAIService {
  async generateStoryEntities(
    title: string,
    description: string,
    storyType: string,
    ageRange: string,
    numberOfPages: number
  ): Promise<StoryResponse> {
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

    const entityResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: entityExtractionPrompt }],
      response_format: { type: "json_object" },
    });

    const entityContent = entityResponse.choices[0].message.content;
    if (!entityContent) {
      throw new Error("No content returned from OpenAI");
    }

    return JSON.parse(entityContent) as StoryResponse;
  }

  async generateImagePrompt(
    title: string,
    page: PageResponse,
    entities: EntityResponse[],
    ageRange: string,
    storyType: string,
    pageNum: number
  ): Promise<string> {
    const pageEntities = page.entitiesPresent || [];
    const relevantEntities = entities.filter((entity) =>
      pageEntities.includes(entity.id)
    );

    const entityDescriptions = relevantEntities
      .map((entity) => `${entity.name} (${entity.type}): ${entity.description}`)
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

    const imagePromptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: imagePromptRequest }],
    });

    return imagePromptResponse.choices[0].message.content?.trim() || "";
  }
}

export const openaiService = new OpenAIService();
