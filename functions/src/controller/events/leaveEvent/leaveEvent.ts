import * as functions from "firebase-functions";
import { admin } from "../../helpers/admin";
import { eventCollaboratorRef, userCollaborationRef } from "../../helpers/databaseRefs";
import { validateInput, validateUserIsNotOwner } from "./validators";

// === Helper Functions ===

async function removeUserFromEvent(eventId: string, userId: string) {
  try {
    await validateUserIsNotOwner(eventId, userId);

    const batch = admin.firestore().batch();
    batch.delete(eventCollaboratorRef(eventId, userId));
    batch.delete(userCollaborationRef(userId, eventId));

    await batch.commit();
  } catch (err) {
    console.error(`❌ Failed to remove user ${userId} from event ${eventId}:`, err);
    throw err instanceof functions.https.HttpsError
      ? err
      : new functions.https.HttpsError("internal", "Failed to leave event");
  }
}

// === Main Function ===

export const leaveEvent = functions.https.onCall(async (request) => {
  try {
    validateInput(request);

    const data = request.data;
    const eventId = data.event_id;
    const userId = data.user_id;

    await removeUserFromEvent(eventId, userId);
    console.log(`✅ User ${userId} successfully left event ${eventId}`);
    return { success: true, message: "User left the event successfully" };

  } catch (err) {
    console.error("❌ Error in leaveEvent:", err);
    throw err instanceof functions.https.HttpsError
      ? err
      : new functions.https.HttpsError("internal", "Unexpected error occurred while leaving event");
  }
});
