import * as functions from "firebase-functions";


export function validateInput(data: any) {
    if (!data.title || !data.description) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    if ((data.collaborators || []).length > 4) {
      throw new functions.https.HttpsError("invalid-argument", "There can only be 4 collaborators.");
    }
  }

export function verifyOwnership(eventData: any, uid: string) {
    if (eventData?.owner_id !== uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the host of the event can delete this event."
      );
    }
  }