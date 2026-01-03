import { stories, type Story, type InsertStory } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Storage interface for story CRUD operations
// Note: User operations are handled by authStorage in replit_integrations/auth
export interface IStorage {
  getStories(userId?: string): Promise<Story[]>;
  getStory(id: number): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined>;
  deleteStory(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Story operations
  async getStories(userId?: string): Promise<Story[]> {
    if (userId) {
      return db.select().from(stories).where(eq(stories.userId, userId)).orderBy(desc(stories.createdAt));
    }
    return db.select().from(stories).orderBy(desc(stories.createdAt));
  }

  async getStory(id: number): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story || undefined;
  }

  async createStory(insertStory: InsertStory): Promise<Story> {
    const [story] = await db
      .insert(stories)
      .values(insertStory)
      .returning();
    return story;
  }

  async updateStory(id: number, partial: Partial<InsertStory>): Promise<Story | undefined> {
    const [updatedStory] = await db
      .update(stories)
      .set(partial)
      .where(eq(stories.id, id))
      .returning();
    return updatedStory;
  }

  async deleteStory(id: number): Promise<boolean> {
    const [deletedStory] = await db
      .delete(stories)
      .where(eq(stories.id, id))
      .returning();
    return !!deletedStory;
  }
}

// Replace MemStorage with DatabaseStorage
export const storage = new DatabaseStorage();
