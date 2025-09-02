// collaborationMapping.ts
import { admin, db } from "../../helpers/admin";
import {
  EventRecord,
  EventCollaboratorRecord,
  UserCollaborationRecord,
} from "@/models/firestore/EventRecord";
import { CollaboratorModel } from "@/models/runtime/CollaboratorModel";

// One helper that makes BOTH payloads for a given user+event
function buildCollabPair(
  event: EventRecord,
  user: CollaboratorModel
): {
  eventSide: Omit<EventCollaboratorRecord, "joined_at">;
  userSide: Omit<UserCollaborationRecord, "created_at" | "joined_at">;
} {
  return {
    userSide: {
      id: event.id,
      title: event.title,
      description: event.description,
      categories: event.categories ?? [],
      host: event.host,
      role: user.role,
      effective_date: event.effective_date,
      date_source: event.date_source,
      ...(event.date && {
        date: { start: event.date.start, ...(event.date.end && { end: event.date.end }) },
      }),
    },
    eventSide: {
      user_id: user.user_id,
      username: user.username,
      profile_image_url: user.profile_image_url ?? null,
      role: user.role,
      status: user.status,
    },
  };
}

export function enqueueCollaborationWrites(
  batch: admin.firestore.WriteBatch,
  event: EventRecord,
  users: CollaboratorModel[]
) {
  const eventRef = db.collection("events").doc(event.id);

  for (const user of users) {
    const { eventSide, userSide } = buildCollabPair(event, user);

    // event-side
    const eventCollabRef = eventRef.collection("collaborators").doc(user.user_id);
    batch.set(eventCollabRef, {
      ...eventSide,
      joined_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // user-side
    const userCollabRef = db.collection("users")
      .doc(user.user_id)
      .collection("collaborations")
      .doc(event.id);

    batch.set(userCollabRef, {
      ...userSide,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      joined_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}
