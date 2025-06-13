import * as functions from "firebase-functions";


export function verifyOwnership(eventData: any, uid: string) {
    if (eventData?.owner_id !== uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the host of the event can delete this event."
      );
    }
  }