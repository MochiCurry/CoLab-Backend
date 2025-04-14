import { onCall } from "firebase-functions/v2/https";
import { db, bucket } from '../helpers/admin';

export const deleteEvent = onCall({ region: "us-central1" }, async (request) => {
    const data = request.data;
    const context = request.auth;
  
    const eventId = data.event_id;
    const uid = context?.uid;
  
    if (!eventId || !uid) {
      throw new Error("Missing event ID or user not authenticated.");
    }
  
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();
  
    if (!eventSnap.exists) {
      throw new Error("Event does not exist.");
    }
  
    const event = eventSnap.data();
  
    if (event?.owner_id !== uid) {
      throw new Error("Only the owner can delete this event.");
    }
  
    const batch = db.batch();
  
    // Delete from Collaborations
    const collaborationsUsers = [uid, ...(event.collaborators || [])];
    for (const userId of collaborationsUsers) {
      const collarborationsRef = db.collection("users").doc(userId).collection("collaborations").doc(eventId);
      batch.delete(collarborationsRef);
    }
  
    // Delete comments subcollection
    const commentsSnapshot = await eventRef.collection("comments").get();
    commentsSnapshot.forEach(doc => batch.delete(doc.ref));
  
    // Delete the event itself
    batch.delete(eventRef);
  
    await batch.commit();
  
    // Delete images from storage
    const imagePath = event.banner_image_path;
    if (imagePath) {
      try {
        await bucket.file(imagePath).delete();
        const thumbPath = imagePath.replace("original.jpg", "original_300x300.jpg");
        await bucket.file(`thumbnails/${thumbPath}`).delete();
      } catch (error) {
        console.warn("Storage cleanup failed", error);
      }
    }
  
    return { success: true };
  });