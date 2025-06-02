import * as functions from "firebase-functions";
import { db } from '../helpers/admin';

export const removeCollaboratorsFromEvent = functions.https.onCall(async (req) => {
  const { eventId, userIdsToKick, requesterId } = req.data;

  if (!eventId || !Array.isArray(userIdsToKick) || !requesterId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const eventRef = db.collection("events").doc(eventId);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Event not found.");
  }

  const eventData = eventSnap.data();

  if (!eventData || eventData.owner_id !== requesterId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the host can kick collaborators."
    );
  }

  const filteredUserIds = userIdsToKick.filter((id) => id !== requesterId);
  if (filteredUserIds.length === 0) {
    return { message: "No valid users to kick." };
  }

  const batch = db.batch();

  for (const userId of filteredUserIds) {
    const eventCollabRef = eventRef.collection("collaborators").doc(userId);
    const userCollabRef = db.collection("users").doc(userId).collection("collaborations").doc(eventId);

    batch.delete(eventCollabRef);
    batch.delete(userCollabRef);
  }

  await batch.commit();
  return { success: true, kicked: filteredUserIds };
});
