import { bucket } from '../helpers/admin';
import sharp from "sharp";
import { tmpdir } from "os";
import { join, dirname } from "path";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import { onObjectFinalized } from "firebase-functions/v2/storage";

export const generateProfileThumbnail = onObjectFinalized({ region: "us-central1", memory: "512MiB" }, async (event) => {
	const object = event.data;

	const filePath = object.name || "";
	const contentType = object.contentType || "";

	if (!filePath.startsWith("users/") || !filePath.endsWith("original.jpg")) return;
	if (!contentType.startsWith("image/")) return;

	const fileName = path.basename(filePath);
	const tempFilePath = path.join(os.tmpdir(), fileName);

	// Download original image
	await bucket.file(filePath).download({ destination: tempFilePath });

	// Create thumbnail
	const userId = filePath.split("/")[1];
	const thumbnailFileName = `original_100x100.jpg`;
	const thumbnailPath = `thumbnails/users/${userId}/${thumbnailFileName}`;
	const tempThumbPath = path.join(os.tmpdir(), thumbnailFileName);

	await sharp(tempFilePath)
	.rotate() // respects EXIF, does NOT force landscape
	.resize(100, 100)
	.toFile(tempThumbPath);

	await bucket.upload(tempThumbPath, {
		destination: thumbnailPath,
		metadata: { contentType: "image/jpeg" }
	});

	await fs.remove(tempFilePath);
	await fs.remove(tempThumbPath);

	console.log(`✅ Thumbnail created at: ${thumbnailPath}`);
}
);