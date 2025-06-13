import * as functions from "firebase-functions";
import { admin, db } from '../../helpers/admin';
import { validateInput, validateEventExists, validateEventOwner } from "./validators"; 
import { eventRef } from "../../helpers/databaseRefs";

interface EditEventRequest {
  event_id: string;
  extended_info: string;
}

export const editEvent = functions.https.onCall(async (req) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError("unauthenticated", "Not signed in");
    }

    const data = req.data as EditEventRequest;
    const { event_id, extended_info } = data;

    validateInput(event_id, extended_info);

    const eventReference = eventRef(event_id);
    const eventSnap = await eventReference.get();

    validateEventExists(eventSnap);
    validateEventOwner(uid, eventSnap);

    await eventReference.update({
      extended_info,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Event updated successfully.",
    };
  } catch (err) {
    console.error("🔥 Failed to update event:", err);
    throw err instanceof functions.https.HttpsError
      ? err
      : new functions.https.HttpsError("internal", "Unexpected error while updating event");
  }
});
