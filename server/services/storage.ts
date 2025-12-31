import { ObjectStorageService } from "../replit_integrations/object_storage";
import { v4 as uuidv4 } from "uuid";

const objectStorage = new ObjectStorageService();

export class StorageService {
  async uploadImage(buffer: Buffer, mimeType: string): Promise<string> {
    const filename = `${uuidv4()}.${mimeType.split('/')[1] || 'png'}`;
    
    try {
      const privateDir = objectStorage.getPrivateObjectDir();
      const fullPath = `${privateDir}/${filename}`;
      
      return `/generated-images/${filename}`;
    } catch (err: any) {
      console.error("Object Storage Error:", err);
      throw new Error(`Failed to upload image to object storage: ${err.message}`);
    }
  }

  async downloadImage(filename: string): Promise<Buffer> {
    const cleanFilename = filename.replace('/generated-images/', '');
    
    try {
      const objectFile = await objectStorage.searchPublicObject(cleanFilename);
      if (!objectFile) {
        throw new Error(`Image not found: ${cleanFilename}`);
      }
      
      const [buffer] = await objectFile.download();
      return buffer;
    } catch (err: any) {
      console.error("Download Error:", err);
      throw new Error(`Failed to download image: ${err.message}`);
    }
  }

  async imageExists(filename: string): Promise<boolean> {
    const cleanFilename = filename.replace('/generated-images/', '');
    try {
      const objectFile = await objectStorage.searchPublicObject(cleanFilename);
      return objectFile !== null;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
