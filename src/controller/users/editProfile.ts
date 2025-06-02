import { db } from '../helpers/admin';
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const editUserProfile = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new Error("Unauthenticated request");
  }

  const { username, bio, profile_image } = request.data;

  const updateData: any = {};

  if (username) updateData.username = username;
  if (bio !== undefined) updateData.bio = bio;

  if (profile_image) {
    const { image_path, thumbnail_url } = profile_image;
    updateData.profile_image = {
      image_path: image_path || null,
      thumbnail_url: thumbnail_url || null,
    };
  }

  try {
    await db.collection("users").doc(uid).update(updateData);
    return { success: true };
  } catch (error) {
    logger.error("❌ Failed to update profile", error);
    throw new Error("Failed to update profile");
  }
});
