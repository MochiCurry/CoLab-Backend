import * as functions from "firebase-functions";
import { admin, db } from "../../helpers/admin";
import { validateInput } from "./validators";
import { writeCollaborators } from "./addCollaboratorsService"
import { fetchUsers, fetchEventCollaboratorIds } from "../shared/eventService"
import {
  eventRef,
  eventCollaboratorsRef,
  userRef,
  userCollaborationRef,
} from "../../helpers/databaseRefs"; 

// ─────────────────────────────
// Main Function
// ─────────────────────────────

export const addCollaboratorsToEvent = functions.https.onCall(async (req) => {
  const { eventId, userIds } = req.data;
  validateInput(eventId, userIds);

  const collabRef = eventCollaboratorsRef(eventId)

  const existingCollaboratorIds = await fetchEventCollaboratorIds(collabRef);
  const newCollaboratorIds = filterNewUserIds(userIds, existingCollaboratorIds);

  if (newCollaboratorIds.length === 0) {
    return { message: "No new collaborators to add." };
  }

  const newUserDocs = await fetchUsers(newCollaboratorIds);
  const batch = db.batch();
  writeCollaborators(batch, newUserDocs, collabRef, eventId);

  await batch.commit();
  return { success: true, added: newCollaboratorIds.length };
});


// ─────────────────────────────
// Helper Functions
// ─────────────────────────────

function filterNewUserIds(userIds: string[], existingUserIds: string[]) {
  return userIds.filter(id => !existingUserIds.includes(id));
}
