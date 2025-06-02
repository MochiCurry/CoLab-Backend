import { admin, db, bucket } from '../helpers/admin';
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

// === Helpers ===

function getNewThumbnailUrl(userId: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
    `thumbnails/users/${userId}/original_100x100.jpg`
  )}?alt=media`;
}

function hasUsernameChanged(before: any, after: any): boolean {
  return before.username !== after.username;
}

function hasProfileImageChanged(before: any, after: any): boolean {
  return before?.profile_image?.image_path !== after?.profile_image?.image_path;
}

async function propagateToCollaborations(batch: admin.firestore.WriteBatch, userId: string, after: any, thumbnailUrl: string, usernameChanged: boolean, imageChanged: boolean) {
  const collaborationsSnapshot = await db.collectionGroup("collaborations")
    .where("host.id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  collaborationsSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      ...(usernameChanged && after.username && { "host.username": after.username }),
      ...(imageChanged && after.profile_image?.image_path && { "host.profile_image_url": thumbnailUrl })
    });
  });
}

async function propagateToComments(batch: admin.firestore.WriteBatch, userId: string, after: any, thumbnailUrl: string, usernameChanged: boolean, imageChanged: boolean) {
  const commentsSnapshot = await db.collectionGroup("comments")
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  commentsSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      ...(usernameChanged && after.username && { username: after.username }),
      ...(imageChanged && after.profile_image?.image_path && { profile_image_url: thumbnailUrl })
    });
  });
}

async function propagateToEvents(batch: admin.firestore.WriteBatch, userId: string, after: any, thumbnailUrl: string, usernameChanged: boolean, imageChanged: boolean) {
  const eventSnapshot = await db.collection("events")
    .where("host.id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  eventSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      ...(usernameChanged && after.username && { "host.username": after.username }),
      ...(imageChanged && after.profile_image?.image_path && { "host.profile_image_url": thumbnailUrl })
    });
  });
}

async function propagateToEventCollaborators(batch: admin.firestore.WriteBatch, userId: string, after: any, thumbnailUrl: string, usernameChanged: boolean, imageChanged: boolean) {
  const snapshot = await db.collectionGroup("collaborators")
    .where("user_id", "==", userId)
    .get();

  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      ...(usernameChanged && after.username && { username: after.username }),
      ...(imageChanged && after.profile_image?.image_path && { profile_image_url: thumbnailUrl }),
    });
  });
}

// === Main Function ===

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

    const usernameChanged = hasUsernameChanged(before, after);
    const profilePathChanged = hasProfileImageChanged(before, after);

    if (!usernameChanged && !profilePathChanged) {
      console.log(`ℹ️ No profile fields changed for ${userId}, skipping.`);
      return;
    }

    const newThumbnailUrl = getNewThumbnailUrl(userId);
    const batch = db.batch();

    await Promise.all([
      propagateToCollaborations(batch, userId, after, newThumbnailUrl, usernameChanged, profilePathChanged),
      propagateToComments(batch, userId, after, newThumbnailUrl, usernameChanged, profilePathChanged),
      propagateToEvents(batch, userId, after, newThumbnailUrl, usernameChanged, profilePathChanged),
      propagateToEventCollaborators(batch, userId, after, newThumbnailUrl, usernameChanged, profilePathChanged),
    ]);

    await batch.commit();
    console.log(`✅ Propagated profile update for user ${userId}`);
  }
);
