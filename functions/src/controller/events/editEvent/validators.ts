import * as functions from "firebase-functions";
import { admin, db } from '../../helpers/admin';

export function validateInput(eventId: string, extendedInfo: string) {
    if (!eventId || typeof extendedInfo !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Invalid or missing event_id");
      }
      if (typeof extendedInfo !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Invalid extended_info");
      }
}

export function validateEventExists(eventSnap: admin.firestore.DocumentSnapshot) {
    if (!eventSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Event not found");
      }
}

export function validateEventOwner(uid: string, eventSnap: admin.firestore.DocumentSnapshot) {
    const eventData = eventSnap.data();
    if (!eventData || eventData.owner_id !== uid) {
      throw new functions.https.HttpsError("permission-denied", "You are not the owner of this event");
    }
}