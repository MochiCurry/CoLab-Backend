// functions/src/events/add/addCollaboratorsToEvent.ts
import * as functions from "firebase-functions";
import { db } from "../../helpers/admin";
import { validateInput } from "./validators";
import { fetchCollaboratorDetails, fetchEventCollaboratorIds } from "../shared/eventService";
import { eventCollaboratorsRef } from "../../helpers/databaseRefs";
import { enqueueCollaborationWrites } from "../shared/collaborationMapping";
import { EventRecord } from "@/models/firestore/EventRecord";
import { CollaboratorModel } from "@/models/runtime/CollaboratorModel";

export const addCollaboratorsToEvent = functions.https.onCall(async (req) => {
  const { eventId, userIds } = req.data as { eventId: string; userIds: string[] };
  validateInput(eventId, userIds);

  // 1) Load event (source of truth for projection)
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Event not found");
  }
  const eventData = eventSnap.data() as EventRecord;
  eventData.id = eventData.id || eventId;

  // 2) Filter out existing collaborators
  const collabRef = eventCollaboratorsRef(eventId);
  const existingCollaboratorIds = await fetchEventCollaboratorIds(collabRef);
  const newCollaboratorIds = userIds.filter((id) => !existingCollaboratorIds.includes(id));
  if (newCollaboratorIds.length === 0) {
    return { message: "No new collaborators to add." };
  }

  // 3) Fetch normalized collaborator profiles (Option A)
  //    This returns BasicUserData[] with { user_id, username, profile_image_url? }
  const profiles = await fetchCollaboratorDetails(newCollaboratorIds);

  // 4) Shape into CollaboratorModel[] (consistent with create flow)
  const users: CollaboratorModel[] = profiles.map((p) => ({
    user_id: p.user_id,
    username: p.username,
    profile_image_url: p.profile_image_url ?? null,
    role: "member",
    status: "pending",
  }));

  // 5) Enqueue writes on both sides and commit
  const batch = db.batch();
  enqueueCollaborationWrites(batch, eventData, users);
  await batch.commit();

  return { success: true, added: newCollaboratorIds.length };
});
