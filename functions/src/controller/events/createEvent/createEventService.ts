import * as functions from "firebase-functions";
import { admin, db } from '../../helpers/admin';
import { CreateEventRequest, EventTimeRange } from "@/models/client/CreateEventRequest";
import { EventRecord, EventCollaboratorRecord, UserCollaborationRecord, HostModel, FirestoreEventTimeRange } from "@/models/firestore/EventRecord";
import { CollaboratorModel, BasicUserData } from "@/models/runtime/CollaboratorModel";

export function writeMainEvent(
    batch: admin.firestore.WriteBatch,
    ref: admin.firestore.DocumentReference,
    data: CreateEventRequest,
    event_id: string,
    owner_id: string,
    host: HostModel,
    dateRange: FirestoreEventTimeRange | null,
    effective_date: admin.firestore.Timestamp,
    date_source: string
  ) {
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
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
  
    if (dateRange) {
      eventData.date = {
        start: dateRange.start,
        ...(dateRange.end && { end: dateRange.end })
      };
    }
  
    batch.set(ref, eventData);
  }

  export function writeUserSubcollections(
    batch: admin.firestore.WriteBatch,
    eventRef: admin.firestore.DocumentReference,
    users: CollaboratorModel[],
    event_id: string,
    data: CreateEventRequest,
    host: HostModel,
    dateRange: FirestoreEventTimeRange | null,
    effective_date: admin.firestore.Timestamp,
    date_source: string
  ) {
    for (const user of users) {
      const eventCollabRef = eventRef.collection("collaborators").doc(user.user_id);
      const userCollabRef = db.collection("users").doc(user.user_id).collection("collaborations").doc(event_id);

      const eventCollaboratorRecord = buildEventCollaboratorRecord(user);
      const userCollabRecord = buildUserCollaborationRecord({
        event_id,
        data,
        host,
        userRole: user.role,
        dateRange,
        effective_date,
        date_source,
      });
  
      batch.set(eventCollabRef, eventCollaboratorRecord);
      batch.set(userCollabRef, userCollabRecord);
    }
  }

  function buildEventCollaboratorRecord(user: CollaboratorModel): EventCollaboratorRecord {
    return {
      user_id: user.user_id,
      username: user.username,
      profile_image_url: user.profile_image_url ?? null,
      role: user.role,
      status: user.status,
      joined_at: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  function buildUserCollaborationRecord(params: {
    event_id: string;
    data: CreateEventRequest;
    host: HostModel;
    userRole: "host" | "member"; 
    dateRange: FirestoreEventTimeRange | null;
    effective_date: admin.firestore.Timestamp;
    date_source: string;
  }): UserCollaborationRecord {
    const {
      event_id,
      data,
      host,
      userRole,
      dateRange,
      effective_date,
      date_source,
    } = params;
  
    return {
      id: event_id,
      title: data.title,
      description: data.description,
      categories: data.categories ?? [],
      host,
      role: userRole,
      effective_date,
      date_source,
      joined_at: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      ...(dateRange && {
        date: {
          start: dateRange.start,
          ...(dateRange.end && { end: dateRange.end }),
        },
      }),
    };
  }
  