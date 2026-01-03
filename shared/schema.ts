import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Legacy user schema (kept for backwards compatibility)
export const legacyUsers = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  credits: integer("credits").default(3).notNull(),
});

// Story art styles
export const ART_STYLES = ["anime", "watercolor", "3d_cartoon", "pixel_art", "comic_book", "minimalist_caricature", "line_art", "stick_man", "gouache_texture"] as const;
export type ArtStyle = typeof ART_STYLES[number];

// Color modes for art
export const COLOR_MODES = ["color", "monochrome"] as const;
export type ColorMode = typeof COLOR_MODES[number];

// Art styles that should NOT have monochrome option (color-dependent styles)
export const COLOR_ONLY_STYLES: ArtStyle[] = ["watercolor", "3d_cartoon", "gouache_texture"];

// Character description modes
export const DESCRIPTION_MODES = ["merge", "override"] as const;
export type DescriptionMode = typeof DESCRIPTION_MODES[number];

// Story types 
export const STORY_TYPES = ["adventure", "moral_lesson", "fun_story"] as const;
export type StoryType = typeof STORY_TYPES[number];

// Age ranges for stories
export const AGE_RANGES = ["0-2", "3-5", "6-8", "9-12"] as const;
export type AgeRange = typeof AGE_RANGES[number];

// Layout options
export const LAYOUT_TYPES = ["side_by_side", "picture_top"] as const;
export type LayoutType = typeof LAYOUT_TYPES[number];

// Character, location, or object that should maintain visual consistency
export type StoryEntity = {
  id: string;
  name: string;
  type: 'character' | 'location' | 'object';
  description: string;
  generationId?: string; // DALL-E generation ID for visual consistency
};

export type StoryEntityWithAppearances = StoryEntity & {
  appearsInPages: number[];
};

// The pages of a story
export type StoryPage = {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imagePrompt?: string; // Store the prompt used to generate the image
  entities?: string[]; // IDs of entities that appear on this page
};

// Stories schema
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // Link stories to auth_users (string UUID)
  title: text("title").notNull(),
  description: text("description").notNull(),
  storyType: text("story_type").notNull(),
  ageRange: text("age_range").notNull(),
  artStyle: text("art_style").notNull(),
  layoutType: text("layout_type").notNull(),
  pages: jsonb("pages").notNull().$type<StoryPage[]>(),
  entities: jsonb("entities").$type<StoryEntity[]>(), // Track characters, locations, objects
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for creating a story
export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true
});

// Schema for story creation form
export const storyFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().min(10, "Description is too short").max(5000, "Description is too long"),
  storyType: z.enum(STORY_TYPES, {
    errorMap: () => ({ message: "Please select a story type" }),
  }),
  ageRange: z.enum(AGE_RANGES, {
    errorMap: () => ({ message: "Please select an age range" }),
  }),
  artStyle: z.enum(ART_STYLES, {
    errorMap: () => ({ message: "Please select an art style" }),
  }),
  colorMode: z.enum(COLOR_MODES).default("color"),
  layoutType: z.enum(LAYOUT_TYPES, {
    errorMap: () => ({ message: "Please select a layout" }),
  }),
});

// Form data for story generation
export type StoryFormData = z.infer<typeof storyFormSchema>;

// Export types for database operations
// Note: User and UpsertUser types are exported from ./models/auth

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;
