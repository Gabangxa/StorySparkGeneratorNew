import { stories, users, type User, type InsertUser, type Story, type InsertStory } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Storage interface for CRUD operations
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: number, credits: number): Promise<User>;
  
  // Story operations
  getStories(): Promise<Story[]>;
  getStory(id: number): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined>;
  deleteStory(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserCredits(userId: number, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ credits })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) throw new Error("User not found");
    return user;
  }

  // Story operations
  async getStories(): Promise<Story[]> {
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
