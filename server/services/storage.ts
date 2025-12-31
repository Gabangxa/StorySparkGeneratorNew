import { ObjectStorageService, objectStorageClient } from "../replit_integrations/object_storage";
import { v4 as uuidv4 } from "uuid";

const objectStorage = new ObjectStorageService();

export class StorageService {
  async uploadImage(buffer: Buffer, mimeType: string): Promise<string> {
    const filename = `${uuidv4()}.${mimeType.split('/')[1] || 'png'}`;
    
    try {
      // Get the public search paths and use the first one for uploads
      const publicPaths = objectStorage.getPublicObjectSearchPaths();
      const publicDir = publicPaths[0]; // e.g., "/bucket-id/public"
      const fullPath = `${publicDir}/${filename}`;
      
      // Parse the path to get bucket name and object name
      const pathParts = fullPath.split('/').filter(p => p.length > 0);
      const bucketName = pathParts[0];
      const objectName = pathParts.slice(1).join('/');
      
      // Upload to object storage
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(buffer, {
        contentType: mimeType,
        resumable: false,
      });
      
      console.log(`Uploaded image to object storage: ${fullPath}`);
      
      return `/generated-images/${filename}`;
    } catch (err: any) {
      console.error("Object Storage Upload Error:", err);
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
