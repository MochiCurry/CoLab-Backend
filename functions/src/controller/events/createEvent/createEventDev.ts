import * as functions from "firebase-functions";
import { admin, db } from '../../helpers/admin';
import { validateCreateEventInput } from "./validators";
import { fetchHostProfile, fetchCollaboratorDetails } from "../shared/eventService";
import { writeMainEvent, writeUserSubcollections } from "./createEventService";

import { CreateEventRequest, EventTimeRange } from "@/models/client/CreateEventRequest";
import { HostModel, FirestoreEventTimeRange } from "@/models/firestore/EventRecord";
import { CollaboratorModel, BasicUserData } from "@/models/runtime/CollaboratorModel";

export const createEventDev = functions.https.onCall(async (req) => {
  try {
    const uid = req.auth?.uid;
    if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not signed in");

    const data = req.data as CreateEventRequest;
    validateCreateEventInput(data);

    const owner_id = uid;
    const host = await fetchHostProfile(owner_id);
    const collaboratorsProfile = await fetchCollaboratorDetails(data.collaborators || []);

    const eventRef = db.collection("events").doc();
    const event_id = eventRef.id;

    const { dateRange, effective_date, date_source } = buildEventTimestamps(data.date);
    const users = buildCollaboratorsList(owner_id, host, collaboratorsProfile);

    const batch = db.batch();
    writeMainEvent(batch, eventRef, data, event_id, owner_id, host, dateRange, effective_date, date_source);
    writeUserSubcollections(batch, eventRef, users, event_id, data, host, dateRange, effective_date, date_source);

    await batch.commit();

    return {
      success: true,
      message: "Event created successfully.",
      event_id,
    };
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
  
    const dateRange = startTimestamp ? { start: startTimestamp, ...(endTimestamp && { end: endTimestamp }) } : null;
  
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