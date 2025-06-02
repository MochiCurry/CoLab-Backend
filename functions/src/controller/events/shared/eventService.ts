import * as functions from "firebase-functions";
import { db, bucket, admin } from "../../helpers/admin";

export async function getEventData(eventId: string) {
  const eventRef = db.collection("events").doc(eventId);
  const snapshot = await eventRef.get();

  if (!snapshot.exists) {
    throw new functions.https.HttpsError("not-found", "Event does not exist.");
  }

  return {
    eventRef,
    eventData: snapshot.data() as admin.firestore.DocumentData,
  };
}

export async function deleteCollaboratorData(
  eventRef: admin.firestore.DocumentReference,
  eventId: string,
  ownerId: string,
  batch: admin.firestore.WriteBatch
) {
  const snapshot = await eventRef.collection("collaborators").get();

  // Collect user IDs from subcollection doc IDs
  const collaboratorIds = snapshot.docs.map(doc => doc.id);
  const userIds = [ownerId, ...collaboratorIds];

  // Delete each user's /collaborations/{eventId} doc
  for (const uid of userIds) {
    const ref = db.collection("users").doc(uid).collection("collaborations").doc(eventId);
    batch.delete(ref);
  }
  // Delete each /events/{eventId}/collaborators/{uid} doc
  snapshot.forEach(doc => batch.delete(doc.ref));
}

export async function deleteComments(
  eventRef: admin.firestore.DocumentReference,
  batch: admin.firestore.WriteBatch
) {
  const snapshot = await eventRef.collection("comments").get();
  snapshot.forEach(doc => batch.delete(doc.ref));
}

export async function deleteEventImages(imagePath: string | undefined) {
    if (!imagePath) return;
  
    try {
      // Delete original
      await bucket.file(imagePath).delete();
  
      // Construct and delete thumbnail
      const eventPath = imagePath.replace("original.jpg", ""); // results in "events/{eventId}/"
      const thumbPath = `thumbnails/${eventPath}original_300x300.jpg`;
      await bucket.file(thumbPath).delete();
    } catch (error) {
      console.warn("Storage cleanup failed", error);
    }
  }
  
