// functions/src/controller/events/create/createEventV2.ts
import * as functions from "firebase-functions";
import { admin, db } from "../../helpers/admin";
import { validateCreateEventInput } from "./validators";
import { fetchHostProfile, fetchCollaboratorDetails } from "../shared/eventService";
import { enqueueCollaborationWrites } from "../shared/collaborationMapping";

import { CreateEventRequest, EventTimeRange } from "@/models/client/CreateEventRequest";
import { EventRecord, HostModel, FirestoreEventTimeRange, Visibility } from "@/models/firestore/EventRecord";
import { CollaboratorModel, BasicUserData } from "@/models/runtime/CollaboratorModel";

export const createEventDevV2 = functions.https.onCall(async (req) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not signed in");

    const data = req.data as CreateEventRequest & {
      visibility?: Visibility;                           // "private" | "public" | "unlisted"
      join_policy?: "invite" | "open" | "request";
    };

    validateCreateEventInput(data);

    // If creating as public, enforce minimal publish requirements
    const visibility: Visibility = data.visibility ?? "private";
    if (visibility === "public") ensurePublishReady(data);

    const owner_id = uid;
    const host = await fetchHostProfile(owner_id);
    const collaboratorsProfile = await fetchCollaboratorDetails(data.collaborators || []);

    const eventRef = db.collection("events").doc();
    const event_id = eventRef.id;

    const { dateRange, effective_date, date_source } = buildEventTimestamps(data.date);
    const users = buildCollaboratorsList(owner_id, host, collaboratorsProfile);

    // Build the EventRecord once (source of truth)
    const eventData: EventRecord = {
      id: event_id,
      title: data.title,
      description: data.description,
      owner_id,
      host,
      location: data.location ?? null,
      categories: data.categories ?? [],
      required_items: data.required_items ?? [],
      optional_items: data.optional_items ?? [],
      effective_date,
      date_source,
      ...(dateRange && {
        date: { start: dateRange.start, ...(dateRange.end && { end: dateRange.end }) },
      }),
      visibility,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    } as any;

    const batch = db.batch();
    batch.set(eventRef, eventData);                             // main event
    enqueueCollaborationWrites(batch, eventData, users);        // both sides
    await batch.commit();

    return { success: true, message: "Event created successfully.", event_id };
  } catch (err) {
    console.error("🔥 Failed to create event:", err);
    throw new functions.https.HttpsError(
      "internal",
      err instanceof functions.https.HttpsError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Unknown error"
    );
  }
});

/** Minimal publish checks used when creating a public event (reused later for edit/publish flow) */
function ensurePublishReady(data: CreateEventRequest) {
  if (!data.title?.trim()) {
    throw new functions.https.HttpsError("failed-precondition", "Public events require a title.");
  }
  if (!data.description?.trim()) {
    throw new functions.https.HttpsError("failed-precondition", "Public events require a description.");
  }
}

function buildEventTimestamps(date?: EventTimeRange): {
  dateRange: FirestoreEventTimeRange | null;
  effective_date: admin.firestore.Timestamp;
  date_source: string;
} {
  const startTimestamp = date?.start
    ? admin.firestore.Timestamp.fromMillis(date.start * 1000)
    : null;

  const endTimestamp = date?.end
    ? admin.firestore.Timestamp.fromMillis(date.end * 1000)
    : undefined;

  const dateRange = startTimestamp
    ? { start: startTimestamp, ...(endTimestamp && { end: endTimestamp }) }
    : null;

  return {
    dateRange,
    effective_date: startTimestamp ?? admin.firestore.Timestamp.now(),
    date_source: startTimestamp ? "eventDate" : "createdAt",
  };
}

function buildCollaboratorsList(
  owner_id: string,
  host: HostModel,
  collabs: BasicUserData[]
): CollaboratorModel[] {
  const hostCollaborator: CollaboratorModel = {
    user_id: owner_id,
    username: host.username,
    profile_image_url: host.profile_image_url ?? null,
    role: "host",
    status: "active",
  };

  const otherCollaborators: CollaboratorModel[] = collabs.map((c) => ({
    user_id: c.user_id,
    username: c.username,
    profile_image_url: c.profile_image_url ?? null,
    role: "member",
    status: "pending",
  }));

  return [hostCollaborator, ...otherCollaborators];
}
