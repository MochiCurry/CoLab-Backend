import * as functions from "firebase-functions";
import { db } from "../../helpers/admin";

import { verifyOwnership } from "../shared/eventValidators";
import {
  fetchEventData,
  deleteCollaboratorData,
  deleteComments,
  deleteLikes,
  deleteEventImages,
} from "../shared/eventService";

export const deleteEvent = functions.https.onCall({ region: "us-central1" }, async (request) => {
  try {
    const { event_id: eventId } = request.data;
    const uid = request.auth?.uid;

    if (!eventId || !uid) {
      throw new functions.https.HttpsError("unauthenticated", "Missing event ID or user not authenticated.");
    }

    const { eventRef, eventData } = await fetchEventData(eventId);

    verifyOwnership(eventData, uid);

    const batch = db.batch();

    await deleteCollaboratorData(eventRef, eventId, uid, batch);
    await deleteComments(eventRef, batch);
    await deleteLikes(eventRef, batch);
    batch.delete(eventRef);
    await batch.commit();

    await deleteEventImages(eventData.media);

    return { success: true };
  } catch (err) {
    console.error("🔥 Failed to delete event:", err);
    throw err instanceof functions.https.HttpsError
      ? err
      : new functions.https.HttpsError("internal", "Failed to delete event.");
  }
});