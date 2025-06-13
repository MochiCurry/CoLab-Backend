import * as functions from "firebase-functions";
import { db, bucket, admin } from "../../helpers/admin";
import { HostModel } from "@/models/firestore/EventRecord";
import { BasicUserData } from "@/models/runtime/CollaboratorModel";


export async function fetchEventData(eventId: string) {
  const eventRef = db.collection("events").doc(eventId);
  const snapshot = await eventRef.get();

  if (!snapshot.exists) {
    throw new functions.https.HttpsError("not-found", "Event does not exist.");
  }

  return {
    eventRef,
    eventData: snapshot.data() as admin.firestore.DocumentData,
  };
}

export async function fetchHostProfile(uid: string): Promise<HostModel> {
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

export async function fetchUsers(userIds: string[]) {
  const usersRef = db.collection("users");
  return await usersRef
    .where(admin.firestore.FieldPath.documentId(), "in", userIds)
    .get();
}

export async function fetchEventCollaboratorIds(collabRef: admin.firestore.CollectionReference) {
  const snapshot = await collabRef.get();
  return snapshot.docs.map(doc => doc.id);
}

export async function fetchCollaboratorDetails(user_ids: string[]): Promise<BasicUserData[]> {
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

export async function deleteCollaboratorData(
  eventRef: admin.firestore.DocumentReference,
  eventId: string,
  ownerId: string,
  batch: admin.firestore.WriteBatch
) {
  const snapshot = await eventRef.collection("collaborators").get();

  // Collect user IDs from subcollection doc IDs
  const collaboratorIds = snapshot.docs.map(doc => doc.id);
  const userIds = [ownerId, ...collaboratorIds];

  // Delete each user's /collaborations/{eventId} doc
  for (const uid of userIds) {
    const ref = db.collection("users").doc(uid).collection("collaborations").doc(eventId);
    batch.delete(ref);
  }
  // Delete each /events/{eventId}/collaborators/{uid} doc
  snapshot.forEach(doc => batch.delete(doc.ref));
}

export async function deleteComments(
  eventRef: admin.firestore.DocumentReference,
  batch: admin.firestore.WriteBatch
) {
  const snapshot = await eventRef.collection("comments").get();
  snapshot.forEach(doc => batch.delete(doc.ref));
}

export async function deleteLikes(
  eventRef: admin.firestore.DocumentReference,
  batch: admin.firestore.WriteBatch
) {
  const snapshot = await eventRef.collection("likes").get();
  snapshot.forEach(doc => batch.delete(doc.ref));
}

export async function deleteEventImages(media: { banner?: string; thumbnail?: { path?: string } } | undefined) {
  if (!media) return;

  try {
    if (media.banner) {
      const originalFile = bucket.file(media.banner);
      const [originalExists] = await originalFile.exists();
      if (originalExists) {
        await originalFile.delete();
      }
    }

    if (media.thumbnail?.path) {
      const thumbFile = bucket.file(media.thumbnail.path);
      const [thumbExists] = await thumbFile.exists();
      if (thumbExists) {
        await thumbFile.delete();
      }
    }
  } catch (error) {
    console.warn("⚠️ Storage cleanup failed:", error);
  }
}


  
