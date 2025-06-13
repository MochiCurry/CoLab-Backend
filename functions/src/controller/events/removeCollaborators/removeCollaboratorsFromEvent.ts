import * as functions from "firebase-functions";
import { db } from '../../helpers/admin';
import { validateInput, validateUserIsOwner } from "./validators";
import { eventRef, eventCollaboratorRef, userCollaborationRef } from "../../helpers/databaseRefs";

export type RemoveCollaboratorsRequest = {
  event_id: string;
  user_ids_to_kick: string[];
}

export const removeCollaboratorsFromEvent = functions.https.onCall(async (request) => {
  try {
    const uid = request.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not signed in");

    const data = request.data as RemoveCollaboratorsRequest;
    validateInput(data);

    const eventReference = eventRef(data.event_id);
    const eventSnap = await eventReference.get();

    validateUserIsOwner(uid, eventSnap);

    const filteredUserIds = data.user_ids_to_kick.filter(id => id !== uid);
    if (filteredUserIds.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "No valid users to kick.");
    }

    const batch = db.batch();
    for (const userId of filteredUserIds) {
      batch.delete(eventCollaboratorRef(data.event_id, userId));
      batch.delete(userCollaborationRef(userId, data.event_id));
    }

    await batch.commit();
    return { success: true, kicked: filteredUserIds };

  } catch (err) {
    console.error("❌ removeCollaboratorsFromEvent failed:", err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError("internal", "Something went wrong");
  }
});
