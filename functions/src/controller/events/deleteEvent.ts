import { onCall } from "firebase-functions/v2/https";
import { db } from "../helpers/admin";

import { verifyOwnership } from "./shared/eventValidators";
import {
  getEventData,
  deleteCollaboratorData,
  deleteComments,
  deleteEventImages,
} from "./shared/eventService";


export const deleteEvent = onCall({ region: "us-central1" }, async (request) => {
  const { event_id: eventId } = request.data;
  const uid = request.auth?.uid;

  if (!eventId || !uid) {
    throw new Error("Missing event ID or user not authenticated.");
  }

  const { eventRef, eventData } = await getEventData(eventId);

  verifyOwnership(eventData, uid);

  const batch = db.batch();

  await deleteCollaboratorData(eventRef, eventId, uid, batch);
  await deleteComments(eventRef, batch);
  batch.delete(eventRef);
  await batch.commit();

  await deleteEventImages(eventData.media.banner);

  return { success: true };
});
