
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Age-range specific guidance for story text generation
const AGE_GUIDANCE: Record<string, { vocabulary: string; complexity: string; themes: string; sentenceLength: string }> = {
  "0-2": {
    vocabulary: "Use only the simplest words (1-2 syllables). Repeat key words often. Use animal sounds and onomatopoeia (woof, splash, yay!).",
    complexity: "Very simple sentences, 3-6 words each. No complex plot - focus on simple actions and feelings.",
    themes: "Focus on familiar concepts: animals, family, colors, shapes, daily routines, hugs, and love.",
    sentenceLength: "Maximum 6 words per sentence. 1-2 sentences per page."
  },
  "3-5": {
    vocabulary: "Use simple, everyday words. Some fun new words are okay but explain through context. Include rhymes and repetition.",
    complexity: "Simple sentences with basic cause-and-effect. Clear beginning, middle, and happy ending.",
    themes: "Friendship, sharing, being brave, family, animals, magic, and simple adventures. Gentle lessons about kindness.",
    sentenceLength: "5-12 words per sentence. 2-4 sentences per page."
  },
  "6-8": {
    vocabulary: "Age-appropriate vocabulary with some challenging words. Can include light humor and wordplay.",
    complexity: "Multi-step plots with clear story arcs. Characters can face and overcome obstacles. Include dialogue.",
    themes: "Adventure, friendship, problem-solving, being different is okay, teamwork, courage. Can handle mild suspense.",
    sentenceLength: "8-15 words per sentence. 3-5 sentences per page."
  },
  "9-12": {
    vocabulary: "Richer vocabulary with descriptive language. Metaphors and figurative language are appropriate.",
    complexity: "Complex plots with subplots possible. Characters show growth and make meaningful choices. Moral complexity is fine.",
    themes: "Identity, responsibility, justice, loyalty, growing up. Can explore emotions like disappointment or worry with resolution.",
    sentenceLength: "10-20 words per sentence. 4-6 sentences per page."
  }
};

// Age-range specific guidance for image prompts
const AGE_IMAGE_GUIDANCE: Record<string, { style: string; complexity: string; colors: string }> = {
  "0-2": {
    style: "Very simple, bold shapes. Minimal background details. Large, friendly-looking characters with big eyes and smiles.",
    complexity: "Maximum 2-3 elements in the scene. Uncluttered compositions. Focus on one main action.",
    colors: "Primary colors (red, blue, yellow) with high contrast. Bright and cheerful."
  },
  "3-5": {
    style: "Cute, rounded characters. Friendly expressions. Simple but colorful backgrounds.",
    complexity: "3-5 main elements. Simple scenes that are easy to 'read' at a glance. Clear focal point.",
    colors: "Bright, happy colors. Soft pastels mixed with vibrant accents."
  },
  "6-8": {
    style: "More detailed characters with expressive faces. Dynamic poses. Interesting backgrounds with more elements.",
    complexity: "Can include more scene details. Action-oriented compositions. Environmental storytelling.",
    colors: "Full color palette. Can include shadows and highlights for depth."
  },
  "9-12": {
    style: "Detailed, semi-realistic or stylized art. Characters with nuanced expressions. Rich, atmospheric backgrounds.",
    complexity: "Complex scenes with multiple layers. Can include symbolism and visual metaphors.",
    colors: "Sophisticated color palettes. Mood-appropriate lighting. Can use dramatic contrast."
  }
};

// Camera angles and compositions for variety
const CAMERA_ANGLES = [
  "wide establishing shot showing the full scene",
  "medium shot focusing on character interactions",
  "close-up on character faces showing emotions",
  "bird's-eye view looking down on the scene",
  "low angle looking up at characters",
  "over-the-shoulder perspective",
  "dynamic diagonal composition"
];

// Pose and action variety suggestions
const POSE_VARIETY = [
  "characters in motion/action",
  "characters interacting with objects",
  "characters gesturing expressively",
  "characters in relaxed/casual poses",
  "characters showing strong emotions through body language"
];

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
    // Get age-specific guidance
    const ageGuidance = AGE_GUIDANCE[ageRange] || AGE_GUIDANCE["6-8"];
    
    const entityExtractionPrompt = `
    Create a children's storybook titled "${title}" based on this description: "${description}".

    This should be a ${storyType} story appropriate for children aged ${ageRange} years.
    
    === AGE-APPROPRIATE WRITING GUIDELINES ===
    VOCABULARY: ${ageGuidance.vocabulary}
    STORY COMPLEXITY: ${ageGuidance.complexity}
    THEMES: ${ageGuidance.themes}
    SENTENCE LENGTH: ${ageGuidance.sentenceLength}

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
    pageNum: number,
    totalPages: number = 5
  ): Promise<string> {
    const pageEntities = page.entitiesPresent || [];
    const relevantEntities = entities.filter((entity) =>
      pageEntities.includes(entity.id)
    );

    const entityDescriptions = relevantEntities
      .map((entity) => `${entity.name} (${entity.type}): ${entity.description}`)
      .join('\n');

    // Get age-specific image guidance
    const ageImageGuidance = AGE_IMAGE_GUIDANCE[ageRange] || AGE_IMAGE_GUIDANCE["6-8"];
    
    // Select camera angle and pose variety based on page number for natural progression
    // Use (pageNum - 2) for interior pages to cycle through different options starting from page 2
    const interiorPageIndex = Math.max(0, pageNum - 2);
    const cameraAngle = CAMERA_ANGLES[interiorPageIndex % CAMERA_ANGLES.length];
    const poseStyle = POSE_VARIETY[interiorPageIndex % POSE_VARIETY.length];
    
    // Determine scene variation guidance based on page position
    // Opening and final pages have fixed compositions, interior pages cycle through variations
    let sceneVariation = "";
    let compositionGuidance = "";
    
    if (pageNum === 1) {
      sceneVariation = "This is the OPENING scene - establish the setting and introduce main characters.";
      compositionGuidance = "wide establishing shot showing the full scene and environment";
    } else if (pageNum === totalPages) {
      sceneVariation = "This is the FINAL scene - create a satisfying, conclusive image. Characters should appear resolved/happy.";
      compositionGuidance = "warm, uplifting composition focusing on character emotions";
    } else {
      sceneVariation = `This is an INTERIOR scene (page ${pageNum} of ${totalPages}). Make this visually DISTINCT from other pages.`;
      compositionGuidance = cameraAngle;
    }

    const imagePromptRequest = `
        I need to create an illustration for page ${pageNum} of a children's storybook titled "${title}".

        The text on this page is: "${page.text}"

        The following characters/locations/objects appear on this page:
        ${entityDescriptions}

        === SCENE VARIETY REQUIREMENTS (CRITICAL) ===
        ${sceneVariation}
        
        CAMERA/COMPOSITION: ${compositionGuidance}
        CHARACTER POSES: Show ${poseStyle}.
        BACKGROUND: The background and environment should reflect the specific moment in the story - each page needs a DISTINCT scene composition, not a repeated layout.
        
        IMPORTANT: Each page illustration must look DIFFERENT from others while maintaining character consistency. Vary:
        - Camera angle and distance
        - Character positions and poses
        - Background elements and setting details
        - Time of day or lighting if appropriate to the story

        === AGE-APPROPRIATE ILLUSTRATION STYLE (for ${ageRange} year olds) ===
        VISUAL STYLE: ${ageImageGuidance.style}
        SCENE COMPLEXITY: ${ageImageGuidance.complexity}
        COLOR PALETTE: ${ageImageGuidance.colors}

        === CHARACTER CONSISTENCY ===
        While varying poses and angles, MAINTAIN these for each character:
        - Exact clothing colors and design
        - Hair/fur color and style
        - Body proportions (height, build)
        - Distinctive features (accessories, markings)

        Create a detailed, vivid image generation prompt that will:
        1. Accurately represent THIS SPECIFIC MOMENT from the text
        2. Include all mentioned characters with consistent appearance but VARIED poses
        3. Be appropriate for children aged ${ageRange} years
        4. Have a cohesive style matching a ${storyType} story
        5. Contain NO TEXT, words, letters, names, labels, titles, or captions - the image must be purely visual

        Focus on the main action or scene from the text. Make this illustration DISTINCT from other pages.

        CRITICAL: The generated prompt MUST include an instruction that the final image should contain NO TEXT of any kind. No character names, no story text, no labels, no captions, no titles - purely visual illustration only.

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
