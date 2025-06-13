import * as functions from "firebase-functions";

export function validateInput(eventId: string, userIds: any) {
    if (!eventId || !Array.isArray(userIds)) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }
  }