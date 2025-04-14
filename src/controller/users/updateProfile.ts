import { db, bucket } from '../helpers/admin';
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

export const propagateProfileUpdate = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "us-central1"
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const userId = event.params.userId;

    const usernameChanged = before.username !== after.username;
    const profilePathChanged = before.profile_image_path !== after.profile_image_path;

    if (!usernameChanged && !profilePathChanged) return;

    const newThumbnailUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      `thumbnails/users/${userId}/original_100x100.jpg`
    )}?alt=media`;

    const batch = db.batch();

    // ✅ 1. Update Collaborations
    const collaborationsSnapshot = await db.collectionGroup("collaborations")
      .where("host.id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

      collaborationsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        ...(usernameChanged && { "host.username": after.username }),
        ...(profilePathChanged && { "host.profile_image_url": newThumbnailUrl })
      });
    });

    // ✅ 2. Update Comments
    const commentSnapshot = await db.collectionGroup("comments")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    commentSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        ...(usernameChanged && { username: after.username }),
        ...(profilePathChanged && { profile_image_url: newThumbnailUrl })
      });
    });

    // ✅ 3. Update Event Detail
    const eventSnapshot = await db.collection("events")
      .where("host.id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    eventSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        ...(usernameChanged && { "host.username": after.username }),
        ...(profilePathChanged && { "host.profile_image_url": newThumbnailUrl })
      });
    });

    await batch.commit();
    console.log(`✅ Propagated profile update for user ${userId}`);
  }
);