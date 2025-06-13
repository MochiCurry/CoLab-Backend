// import { bucket, db } from '../helpers/admin';
// import sharp from "sharp";
// import { tmpdir } from "os";
// import { join, dirname } from "path";
// import * as fs from "fs-extra";
// import { onObjectFinalized } from "firebase-functions/v2/storage";

// export const generateEventThumbnail = onObjectFinalized({ memory: "512MiB", region: "us-central1" }, async (event) => {
//   const filePath = event.data.name;
//   if (!filePath || !filePath.endsWith("original.jpg")) return;
//   if (!filePath.startsWith("events/")) return;

//   const contentType = event.data.contentType || "";
//   if (!contentType.startsWith("image/")) return;

//   const fileName = filePath.split("/").pop();
//   const eventPath = dirname(filePath);
//   const workingDir = join(tmpdir(), eventPath);
//   const tmpFilePath = join(workingDir, fileName!);

//   try {
//     // Ensure local dir exists & download file
//     await fs.ensureDir(workingDir);
//     await bucket.file(filePath).download({ destination: tmpFilePath });

//     // Resize and write thumbnail
//     const thumbFileName = fileName!.replace(".jpg", "_300x300.jpg");
//     const thumbPath = join(workingDir, thumbFileName);

//     await sharp(tmpFilePath)
//       .rotate() // respects EXIF, does NOT force landscape
//       .resize(300, 300)
//       .jpeg({ quality: 80 })
//       .toFile(thumbPath);

//     // Final destination in thumbnails/ folder
//     const destination = `thumbnails/${eventPath}/${thumbFileName}`;
//     await bucket.upload(thumbPath, { destination });

//     console.log(`✅ Generated thumbnail at ${destination}`);
//   } catch (error) {
//     console.error("❌ Error generating thumbnail:", error);
//     throw error;
//   } finally {
//     // Clean up temp
//     await fs.remove(workingDir);
//   }
// });


import { bucket, db } from "../helpers/admin";
import sharp from "sharp";
import { tmpdir } from "os";
import { join, dirname } from "path";
import * as fs from "fs-extra";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { buildMediaBlock } from "./shared/mediaService"

export const generateEventThumbnail = onObjectFinalized({ memory: "512MiB", region: "us-central1" }, async (event) => {
  const filePath = event.data.name;
  if (!filePath?.endsWith("original.jpg") || !filePath.startsWith("events/")) return;
  if (!event.data.contentType?.startsWith("image/")) return;

  const eventId = extractEventIdFromPath(filePath);
  if (!eventId) return;

  const fileName = filePath.split("/").pop()!;
  const eventPath = dirname(filePath);
  const workingDir = join(tmpdir(), eventPath);
  const tmpFilePath = join(workingDir, fileName);
  const thumbFileName = fileName.replace(".jpg", "_300x300.jpg");
  const thumbPath = join(workingDir, thumbFileName);
  const thumbnailStoragePath = `thumbnails/${eventPath}/${thumbFileName}`;

  try {
    await fs.ensureDir(workingDir);
    await bucket.file(filePath).download({ destination: tmpFilePath });

    const dimensions = await generateThumbnail(tmpFilePath, thumbPath);
    await bucket.upload(thumbPath, { destination: thumbnailStoragePath });

    await updateEventMediaBlock(eventId, filePath, thumbnailStoragePath, dimensions);
    console.log(`✅ Event ${eventId} updated with thumbnail`);
  } catch (error) {
    console.error("❌ Error generating thumbnail:", error);
    throw error;
  } finally {
    await fs.remove(workingDir);
  }
});

function extractEventIdFromPath(filePath: string): string | null {
  const parts = filePath.split("/");
  return parts.length >= 2 ? parts[1] : null;
}

async function generateThumbnail(inputPath: string, outputPath: string): Promise<{ width: number, height: number }> {
  const width = 300;
  const height = 300;

  await sharp(inputPath)
    .rotate()
    .resize(width, height)
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  return { width, height };
}

function getPublicUrl(storagePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

async function updateEventMediaBlock(
  eventId: string,
  bannerPath: string,
  thumbnailPath: string,
  dimensions: { width: number, height: number }
): Promise<void> {
  const eventRef = db.collection("events").doc(eventId);
  const thumbnailUrl = getPublicUrl(thumbnailPath);
  const media = buildMediaBlock(bannerPath, thumbnailPath, thumbnailUrl, dimensions);

  await eventRef.update({ media });

  const collaboratorsSnap = await db
    .collection("events")
    .doc(eventId)
    .collection("collaborators")
    .get();

  const batch = db.batch();
  collaboratorsSnap.forEach((collabDoc) => {
    const userId = collabDoc.id;
    const userCollabRef = db
      .collection("users")
      .doc(userId)
      .collection("collaborations")
      .doc(eventId);

    batch.update(userCollabRef, { media });
  });

  await batch.commit();
}


