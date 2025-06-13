// import * as functions from "firebase-functions";
// import { admin, db, bucket } from '../helpers/admin';
// import { validateInput } from "./shared/eventValidators";

// interface CollaboratorModel {
//   user_id: string;
//   username: string;
//   profile_image_url?: string;
//   role: string;
//   status: string;
// }

// interface BasicUserData {
//   user_id: string;
//   username: string;
//   profile_image_url?: string;
// }

// interface CreateEventRequest {
//   title: string;
//   description: string;
//   location?: string;
//   date?: number;
//   collaborators?: string[];
//   categories?: string[];
//   required_items?: string[];
//   optional_items?: string[];
// }

// export const createEvent = functions.https.onCall(async (req) => {
//   const uid = req.auth?.uid;
//   if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not signed in");

//   const data = req.data as CreateEventRequest;
//   validateInput(data);

//   const owner_id = uid;
//   const host = await getHostProfile(owner_id);
//   const eventRef = db.collection("events").doc();
//   const event_id = eventRef.id;

//   const { event_timestamp, effective_date, date_source } = getEventTimestamps(data.date);
//   const collaboratorsProfile = await fetchCollaboratorDetails(data.collaborators || []);
//   const users = buildCollaboratorsList(owner_id, host, collaboratorsProfile);

//   const batch = db.batch();
//   writeMainEvent(batch, eventRef, data, event_id, owner_id, host, event_timestamp, effective_date, date_source);
//   writeUserSubcollections(batch, eventRef, users, event_id, data, host, event_timestamp, effective_date, date_source);

//   try {
//     await batch.commit();
//     return {
//       success: true,
//       message: "Event created successfully.",
//       event_id
//     };
//   } catch (err) {
//     console.error("🔥 Failed to commit batch:", err);
//     throw new functions.https.HttpsError("internal", err instanceof Error ? err.message : "Unknown error");
//   }
// });

// async function getHostProfile(uid: string) {
//   const userSnap = await db.collection("users").doc(uid).get();
//   const userData = userSnap.data();
//   if (!userData || !userData.username) {
//     throw new functions.https.HttpsError("not-found", "User profile incomplete or missing");
//   }
//   return {
//     id: uid,
//     username: userData.username,
//     profile_image_url: userData.profile_image?.thumbnail_url ?? null,
//   };
// }

// function getEventTimestamps(date?: number) {
//   const event_timestamp = date ? admin.firestore.Timestamp.fromMillis(date * 1000) : null;
//   return {
//     event_timestamp,
//     effective_date: event_timestamp ?? admin.firestore.Timestamp.now(),
//     date_source: event_timestamp ? "eventDate" : "createdAt",
//   };
// }

// function buildCollaboratorsList(owner_id: string, host: any, collabs: BasicUserData[]): CollaboratorModel[] {
//   return [
//     {
//       user_id: owner_id,
//       username: host.username,
//       profile_image_url: host.profile_image_url,
//       role: "host",
//       status: "accepted",
//     },
//     ...collabs.map((c) => ({
//       user_id: c.user_id,
//       username: c.username,
//       profile_image_url: c.profile_image_url ?? null,
//       role: "member",
//       status: "pending",
//     })),
//   ];
// }

// function writeMainEvent(
//   batch: admin.firestore.WriteBatch,
//   ref: admin.firestore.DocumentReference,
//   data: CreateEventRequest,
//   event_id: string,
//   owner_id: string,
//   host: any,
//   event_timestamp: admin.firestore.Timestamp | null,
//   effective_date: admin.firestore.Timestamp,
//   date_source: string
// ) {
//   batch.set(ref, {
//     id: event_id,
//     title: data.title,
//     description: data.description,
//     owner_id,
//     host,
//     location: data.location || null,
//     categories: data.categories || [],
//     required_items: data.required_items || [],
//     optional_items: data.optional_items || [],
//     ...(event_timestamp && { date: event_timestamp }),
//     effective_date,
//     date_source,
//     created_at: admin.firestore.FieldValue.serverTimestamp(),
//   });
// }

// function writeUserSubcollections(
//   batch: admin.firestore.WriteBatch,
//   eventRef: admin.firestore.DocumentReference,
//   users: CollaboratorModel[],
//   event_id: string,
//   data: CreateEventRequest,
//   host: any,
//   event_timestamp: admin.firestore.Timestamp | null,
//   effective_date: admin.firestore.Timestamp,
//   date_source: string
// ) {
//   for (const user of users) {
//     const joined_at = admin.firestore.FieldValue.serverTimestamp();
//     const eventCollabRef = eventRef.collection("collaborators").doc(user.user_id);
//     const userCollabRef = db.collection("users").doc(user.user_id).collection("collaborations").doc(event_id);

//     batch.set(eventCollabRef, {
//       user_id: user.user_id,
//       username: user.username,
//       profile_image_url: user.profile_image_url ?? null,
//       role: user.role,
//       status: user.status,
//       joined_at,
//     });

//     batch.set(userCollabRef, {
//       id: event_id,
//       title: data.title,
//       description: data.description,
//       categories: data.categories || [],
//       host,
//       role: user.role,
//       ...(event_timestamp && { date: event_timestamp }),
//       effective_date,
//       date_source,
//       joined_at,
//       created_at: admin.firestore.FieldValue.serverTimestamp(),
//     });
//   }
// }

// async function fetchCollaboratorDetails(user_ids: string[]): Promise<BasicUserData[]> {
//   if (!user_ids.length) return [];
//   try {
//     const snapshot = await db.collection("users")
//       .where(admin.firestore.FieldPath.documentId(), "in", user_ids)
//       .get();
//     return snapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         user_id: doc.id,
//         username: data.username,
//         profile_image_url: data.profile_image?.thumbnail_url ?? null,
//       };
//     });
//   } catch (err) {
//     console.error("❌ Error fetching collaborator details:", err);
//     return [];
//   }
// }


import * as functions from "firebase-functions";
import { admin, db, bucket } from '../../helpers/admin';
import { validateCreateEventInput } from "./validators";

interface CollaboratorModel {
  user_id: string;
  username: string;
  profile_image_url?: string;
  role: string;
  status: string;
}

interface BasicUserData {
  user_id: string;
  username: string;
  profile_image_url?: string;
}

interface EventTimeRange {
  start?: number;
  end?: number;
}

interface CreateEventRequest {
  title: string;
  description: string;
  location?: string;
  date?: EventTimeRange;
  collaborators?: string[];
  categories?: string[];
  required_items?: string[];
  optional_items?: string[];
}

export const createEvent = functions.https.onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not signed in");

  const data = req.data as CreateEventRequest;
  validateCreateEventInput(data);

  const owner_id = uid;
  const host = await getHostProfile(owner_id);
  const eventRef = db.collection("events").doc();
  const event_id = eventRef.id;

  const { startTimestamp, endTimestamp, effective_date, date_source } = getEventTimestamps(data.date);
  const collaboratorsProfile = await fetchCollaboratorDetails(data.collaborators || []);
  const users = buildCollaboratorsList(owner_id, host, collaboratorsProfile);

  const batch = db.batch();
  writeMainEvent(batch, eventRef, data, event_id, owner_id, host, startTimestamp, endTimestamp, effective_date, date_source);
  writeUserSubcollections(batch, eventRef, users, event_id, data, host, startTimestamp, endTimestamp, effective_date, date_source);

  try {
    await batch.commit();
    return {
      success: true,
      message: "Event created successfully.",
      event_id
    };
  } catch (err) {
    console.error("🔥 Failed to commit batch:", err);
    throw new functions.https.HttpsError("internal", err instanceof Error ? err.message : "Unknown error");
  }
});

async function getHostProfile(uid: string) {
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data();
  if (!userData || !userData.username) {
    throw new functions.https.HttpsError("not-found", "User profile incomplete or missing");
  }
  return {
    id: uid,
    username: userData.username,
    profile_image_url: userData.profile_image?.thumbnail_url ?? null,
  };
}

function getEventTimestamps(date?: EventTimeRange) {
  const startTimestamp = date?.start ? admin.firestore.Timestamp.fromMillis(date.start * 1000) : null;
  const endTimestamp = date?.end ? admin.firestore.Timestamp.fromMillis(date.end * 1000) : null;
  const effective_date = startTimestamp ?? admin.firestore.Timestamp.now();
  const date_source = startTimestamp ? "eventDate" : "createdAt";
  return { startTimestamp, endTimestamp, effective_date, date_source };
}

function buildCollaboratorsList(owner_id: string, host: any, collabs: BasicUserData[]): CollaboratorModel[] {
  return [
    {
      user_id: owner_id,
      username: host.username,
      profile_image_url: host.profile_image_url,
      role: "host",
      status: "accepted",
    },
    ...collabs.map((c) => ({
      user_id: c.user_id,
      username: c.username,
      profile_image_url: c.profile_image_url ?? null,
      role: "member",
      status: "pending",
    })),
  ];
}

function writeMainEvent(
  batch: admin.firestore.WriteBatch,
  ref: admin.firestore.DocumentReference,
  data: CreateEventRequest,
  event_id: string,
  owner_id: string,
  host: any,
  startTimestamp: admin.firestore.Timestamp | null,
  endTimestamp: admin.firestore.Timestamp | null,
  effective_date: admin.firestore.Timestamp,
  date_source: string
) {
  batch.set(ref, {
    id: event_id,
    title: data.title,
    description: data.description,
    owner_id,
    host,
    location: data.location || null,
    categories: data.categories || [],
    required_items: data.required_items || [],
    optional_items: data.optional_items || [],
    ...(startTimestamp && { start: startTimestamp }),
    ...(endTimestamp && { end: endTimestamp }),
    effective_date,
    date_source,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function writeUserSubcollections(
  batch: admin.firestore.WriteBatch,
  eventRef: admin.firestore.DocumentReference,
  users: CollaboratorModel[],
  event_id: string,
  data: CreateEventRequest,
  host: any,
  startTimestamp: admin.firestore.Timestamp | null,
  endTimestamp: admin.firestore.Timestamp | null,
  effective_date: admin.firestore.Timestamp,
  date_source: string
) {
  for (const user of users) {
    const joined_at = admin.firestore.FieldValue.serverTimestamp();
    const eventCollabRef = eventRef.collection("collaborators").doc(user.user_id);
    const userCollabRef = db.collection("users").doc(user.user_id).collection("collaborations").doc(event_id);

    batch.set(eventCollabRef, {
      user_id: user.user_id,
      username: user.username,
      profile_image_url: user.profile_image_url ?? null,
      role: user.role,
      status: user.status,
      joined_at,
    });

    batch.set(userCollabRef, {
      id: event_id,
      title: data.title,
      description: data.description,
      categories: data.categories || [],
      host,
      role: user.role,
      ...(startTimestamp && { start: startTimestamp }),
      ...(endTimestamp && { end: endTimestamp }),
      effective_date,
      date_source,
      joined_at,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function fetchCollaboratorDetails(user_ids: string[]): Promise<BasicUserData[]> {
  if (!user_ids.length) return [];
  try {
    const snapshot = await db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", user_ids)
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        user_id: doc.id,
        username: data.username,
        profile_image_url: data.profile_image?.thumbnail_url ?? null,
      };
    });
  } catch (err) {
    console.error("❌ Error fetching collaborator details:", err);
    return [];
  }
}
