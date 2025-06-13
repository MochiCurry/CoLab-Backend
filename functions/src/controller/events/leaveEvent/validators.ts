import * as functions from "firebase-functions";
import { eventRef } from "../../helpers/databaseRefs";

export async function validateInput(req: functions.https.CallableRequest<any>) {
    if (!req.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Not signed in");
    }
  
    if (!req.data?.event_id || !req.data?.user_id) {
      throw new functions.https.HttpsError("invalid-argument", "Missing eventId or userId");
    }
  }

export async function validateUserIsNotOwner(eventId: string, userId: string) {
    const eventSnap = await eventRef(eventId).get();

    if (!eventSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Event does not exist");
    }

    const eventData = eventSnap.data();
    if (eventData?.owner_id === userId) {
        throw new functions.https.HttpsError("failed-precondition", "Owner cannot leave the event");
    }
}