// import * as functions from "firebase-functions";
// import { admin, db, bucket } from '../helpers/admin';

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

// export const createEventDev = functions.https.onCall(async (req) => {
//   const uid = req.auth?.uid;
//   if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not signed in");

//   const data = req.data;
//   validate_input(data);

//   const owner_id = uid;
//   const host = await get_host_profile(owner_id);
//   const event_ref = db.collection("events").doc();
//   const event_id = event_ref.id;

//   const { event_timestamp, effective_date, date_source } = get_event_timestamps(data.date);
//   const banner_image_url = get_banner_image_url(data.banner_image_path);
//   const collaborators_profile = await fetch_collaborator_details(data.collaborators || []);
//   const users = build_collaborators_list(owner_id, host, collaborators_profile);

//   const batch = db.batch();
//   write_main_event(batch, event_ref, data, event_id, owner_id, host, event_timestamp, effective_date, date_source);
//   write_user_subcollections(batch, event_ref, users, event_id, data, host, banner_image_url, event_timestamp, effective_date, date_source);

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

// function validate_input(data: any) {
//   if (!data.title || !data.description) {
//     throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
//   }
//   if ((data.collaborators || []).length > 4) {
//     throw new functions.https.HttpsError("invalid-argument", "There can only be 4 collaborators.");
//   }
// }

// async function get_host_profile(uid: string) {
//   const user_snap = await db.collection("users").doc(uid).get();
//   const user_data = user_snap.data();
//   if (!user_data || !user_data.username) {
//     throw new functions.https.HttpsError("not-found", "User profile incomplete or missing");
//   }
//   return {
//     id: uid,
//     username: user_data.username,
//     profile_image_url: user_data.profile_image?.thumbnail_url ?? null,
//   };
// }

// function get_event_timestamps(date?: number) {
//   const event_timestamp = date ? admin.firestore.Timestamp.fromMillis(date * 1000) : null;
//   return {
//     event_timestamp,
//     effective_date: event_timestamp ?? admin.firestore.Timestamp.now(),
//     date_source: event_timestamp ? "eventDate" : "createdAt",
//   };
// }

// function get_banner_image_url(path?: string): string | null {
//   if (!path) return null;
//   const thumb_path = `thumbnails/${path.replace("original.jpg", "original_300x300.jpg")}`;
//   return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(thumb_path)}?alt=media`;
// }

// function build_collaborators_list(owner_id: string, host: any, collabs: BasicUserData[]): CollaboratorModel[] {
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

// function write_main_event(
//   batch: admin.firestore.WriteBatch,
//   ref: admin.firestore.DocumentReference,
//   data: any,
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
//     banner_image_path: data.banner_image_path || null,
//     categories: data.categories || [],
//     required_items: data.required_items || [],
//     optional_items: data.optional_items || [],
//     ...(event_timestamp && { date: event_timestamp }),
//     effective_date,
//     date_source,
//     created_at: admin.firestore.FieldValue.serverTimestamp(),
//   });
// }

// function write_user_subcollections(
//   batch: admin.firestore.WriteBatch,
//   event_ref: admin.firestore.DocumentReference,
//   users: CollaboratorModel[],
//   event_id: string,
//   data: any,
//   host: any,
//   banner_image_url: string | null,
//   event_timestamp: admin.firestore.Timestamp | null,
//   effective_date: admin.firestore.Timestamp,
//   date_source: string
// ) {
//   for (const user of users) {
//     const joined_at = admin.firestore.FieldValue.serverTimestamp();
//     const event_collab_ref = event_ref.collection("collaborators").doc(user.user_id);
//     const user_collab_ref = db.collection("users").doc(user.user_id).collection("collaborations").doc(event_id);

//     batch.set(event_collab_ref, {
//       user_id: user.user_id,
//       username: user.username,
//       profile_image_url: user.profile_image_url ?? null,
//       role: user.role,
//       status: user.status,
//       joined_at,
//     });

//     batch.set(user_collab_ref, {
//       id: event_id,
//       title: data.title,
//       description: data.description,
//       categories: data.categories || [],
//       host,
//       role: user.role,
//       ...(banner_image_url && { banner_image_url }),
//       ...(event_timestamp && { date: event_timestamp }),
//       effective_date,
//       date_source,
//       joined_at,
//       created_at: admin.firestore.FieldValue.serverTimestamp(),
//     });
//   }
// }

// async function fetch_collaborator_details(user_ids: string[]): Promise<BasicUserData[]> {
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
import { admin, db, bucket } from '../helpers/admin';
import { validateInput } from "./shared/eventValidators";

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

interface CreateEventRequest {
  title: string;
  description: string;
  location?: string;
  date?: number;
  collaborators?: string[];
  categories?: string[];
  required_items?: string[];
  optional_items?: string[];
}

export const createEventDev = functions.https.onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Not signed in");

  const data = req.data as CreateEventRequest;
  validateInput(data);

  const owner_id = uid;
  const host = await getHostProfile(owner_id);
  const eventRef = db.collection("events").doc();
  const event_id = eventRef.id;

  const { event_timestamp, effective_date, date_source } = getEventTimestamps(data.date);
  const collaboratorsProfile = await fetchCollaboratorDetails(data.collaborators || []);
  const users = buildCollaboratorsList(owner_id, host, collaboratorsProfile);

  const batch = db.batch();
  writeMainEvent(batch, eventRef, data, event_id, owner_id, host, event_timestamp, effective_date, date_source);
  writeUserSubcollections(batch, eventRef, users, event_id, data, host, event_timestamp, effective_date, date_source);

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

function getEventTimestamps(date?: number) {
  const event_timestamp = date ? admin.firestore.Timestamp.fromMillis(date * 1000) : null;
  return {
    event_timestamp,
    effective_date: event_timestamp ?? admin.firestore.Timestamp.now(),
    date_source: event_timestamp ? "eventDate" : "createdAt",
  };
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
  event_timestamp: admin.firestore.Timestamp | null,
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
    ...(event_timestamp && { date: event_timestamp }),
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
  event_timestamp: admin.firestore.Timestamp | null,
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
      ...(event_timestamp && { date: event_timestamp }),
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
