import { bucket } from '../helpers/admin';
import sharp from "sharp";
import { tmpdir } from "os";
import { join, dirname } from "path";
import * as fs from "fs-extra";
import { onObjectFinalized } from "firebase-functions/v2/storage";

export const generateEventThumbnail = onObjectFinalized({ memory: "512MiB", region: "us-central1" }, async (event) => {
    const filePath = event.data.name;
    if (!filePath || !filePath.endsWith("original.jpg")) return;
    if (!filePath.startsWith("events/")) return;
  
    const contentType = event.data.contentType || "";
    if (!contentType.startsWith("image/")) return;
  
    const fileName = filePath.split("/").pop();
    const eventPath = dirname(filePath); // e.g. events/abc123
    const workingDir = join(tmpdir(), eventPath);
    const tmpFilePath = join(workingDir, fileName!);
  
    try {
      // Ensure local dir exists & download file
      await fs.ensureDir(workingDir);
      await bucket.file(filePath).download({ destination: tmpFilePath });
  
      // Resize and write thumbnail
      const thumbFileName = fileName!.replace(".jpg", "_300x300.jpg");
      const thumbPath = join(workingDir, thumbFileName);
  
      await sharp(tmpFilePath)
        .resize(300, 300)
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
  
      // Final destination in thumbnails/ folder
      const destination = `thumbnails/${eventPath}/${thumbFileName}`;
      await bucket.upload(thumbPath, { destination });
  
      console.log(`✅ Generated thumbnail at ${destination}`);
    } catch (error) {
      console.error("❌ Error generating thumbnail:", error);
      throw error;
    } finally {
      // Clean up temp
      await fs.remove(workingDir);
    }
  });