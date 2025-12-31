
import { Client } from "@replit/object-storage";
import { v4 as uuidv4 } from "uuid";

// Initialize the Object Storage client
const client = new Client();

export class StorageService {
  /**
   * Uploads a buffer to object storage and returns the public URL
   */
  async uploadImage(buffer: Buffer, mimeType: string): Promise<string> {
    const filename = `${uuidv4()}.${mimeType.split('/')[1]}`;

    try {
      // Replit Object Storage doesn't support metadata like content-type in the upload options
      // based on the type definition I inspected.
      const result = await client.uploadFromBytes(filename, buffer);

      if (!result.ok) {
        throw new Error(`Failed to upload image: ${result.error.message}`);
      }

      // Return a path that our application knows how to handle
      return `/generated-images/${filename}`;
    } catch (err: any) {
        console.error("Object Storage Error:", err);
        throw new Error(`Failed to upload image to object storage: ${err.message}`);
    }
  }

  /**
   * Downloads an image from object storage
   */
  async downloadImage(filename: string): Promise<Buffer> {
    // Strip the prefix if present
    const cleanFilename = filename.replace('/generated-images/', '');

    // Use downloadAsBytes which returns a Buffer in a Result wrapper
    const result = await client.downloadAsBytes(cleanFilename);

    if (!result.ok) {
      throw new Error(`Failed to download image: ${result.error.message}`);
    }

    // result.value is [Buffer] based on the type definition
    return result.value[0];
  }

  /**
   * Checks if an image exists
   */
  async imageExists(filename: string): Promise<boolean> {
     const cleanFilename = filename.replace('/generated-images/', '');
     const result = await client.exists(cleanFilename);
     return result.ok && result.value;
  }
}

export const storageService = new StorageService();
