import * as functions from "firebase-functions";
import { admin } from "../helpers/admin";

// === Helper Functions ===

function getEventRef(eventId: string) {
  return admin.firestore().collection("events").doc(eventId);
}

function getUserRef(userId: string) {
  return admin.firestore().collection("users").doc(userId);
}

async function assertUserNotOwner(eventId: string, userId: string) {
  const eventSnap = await getEventRef(eventId).get();

  if (!eventSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Event does not exist");
  }

  const eventData = eventSnap.data();
  if (eventData?.owner_id === userId) {
    throw new functions.https.HttpsError("failed-precondition", "Owner cannot leave the event");
  }
}

async function removeUserFromEvent(eventId: string, userId: string) {
  await assertUserNotOwner(eventId, userId);

  const eventRef = getEventRef(eventId);
  const userRef = getUserRef(userId);

  const batch = admin.firestore().batch();

  batch.delete(eventRef.collection("collaborators").doc(userId));
  batch.delete(userRef.collection("collaborations").doc(eventId));

  await batch.commit();
}

// === Main Function ===

export const leaveEvent = functions.https.onCall(async (request) => {
  const data = request.data;
  const context = request.auth;

  const eventId = data.event_id;
  const userId = data.user_id;

  if (!context) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!eventId || !userId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing eventId or userId");
  }

  try {
    await removeUserFromEvent(eventId, userId);
    console.log(`User ${userId} successfully left event ${eventId}`);
    return { success: true, message: "User left the event successfully" };
  } catch (error) {
    console.error("Error removing user from event:", error);
    throw new functions.https.HttpsError("internal", "Error leaving event");
  }
});
