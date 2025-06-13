import * as functions from "firebase-functions";

export function validateCreateEventInput(data: any) {
    if (!data.title || !data.description) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    if ((data.collaborators || []).length > 4) {
      throw new functions.https.HttpsError("invalid-argument", "There can only be 4 collaborators.");
    }

    if (data.date?.end && data.date?.start !== undefined && data.date.start >= data.date.end) {
      throw new functions.https.HttpsError("invalid-argument", "End time must be after start time.");
    }
  }