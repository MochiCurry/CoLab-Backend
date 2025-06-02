import * as functions from "firebase-functions";
import { admin, db, bucket } from '../helpers/admin';

interface CollaboratorModel {
  userId: string;
  username: string;
  profileImageUrl?: string;
}

export const createEvent = functions.https.onCall(async (req) => {
  const data = req.data;
  const {
    title,
    description,
    owner_id,
    banner_image_path,
    host,
    date,
    location,
    collaborators = [],
    categories = [],
    required_items = [],
    optional_items = []
  } = data;

  if (!title || !description || !owner_id || !host) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  if (collaborators.length > 4) {
    throw new functions.https.HttpsError("invalid-argument", "There can only be 4 collaborators.")
  }

  const eventRef = db.collection("events").doc();
  const eventId = eventRef.id;

  let bannerImageUrl: string | null = null;
  let eventTimestamp: admin.firestore.Timestamp | null = null;
  let effectiveDate: admin.firestore.Timestamp;
  let dateSource: string;

  if (date) {
    eventTimestamp = admin.firestore.Timestamp.fromMillis(date * 1000);
    effectiveDate = eventTimestamp;
    dateSource = "eventDate";
  } else {
    effectiveDate = admin.firestore.Timestamp.now();
    dateSource = "createdAt";
  }

  if (banner_image_path) {
    const thumbnailPath = `thumbnails/${banner_image_path.replace("original.jpg", "original_300x300.jpg")}`;
    bannerImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(thumbnailPath)}?alt=media`;
  }

  // Fetch all collaborator details in one batch request
  const collaboratorsProfile = await fetchCollaboratorDetails(collaborators);

  const users = [
    {
      userId: owner_id,
      username: host.username,
      profileImageUrl: host.profile_image_url,
      role: "host",
      status: "accepted",
    },
    ...collaboratorsProfile.map((c: any) => ({
      ...c,
      role: "member",
      status: "pending",
    })),
  ];

  const batch = db.batch();

  // Write to the main events collection
  batch.set(eventRef, {
    id: eventId,
    title,
    description,
    owner_id,
    host,
    location: location || null,
    banner_image_path: banner_image_path || null,
    categories,
    required_items,
    optional_items,
    ...(eventTimestamp && { date: eventTimestamp }),
    effective_date: effectiveDate,
    date_source: dateSource,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Store the collaborators in the subcollection
  for (const [index, user] of users.entries()) {
    const { userId, username, profileImageUrl = null } = user;

    const role = userId === owner_id ? "host" : "member";
    const status = userId === owner_id ? "accepted" : "pending";
    const joinedAt = admin.firestore.FieldValue.serverTimestamp();

    const eventCollabRef = eventRef.collection("collaborators").doc(userId);
    const collaborationRef = db.collection("users").doc(userId).collection("collaborations").doc(eventId);

    batch.set(eventCollabRef, {
      user_id: userId,
      username,
      profile_image_url: profileImageUrl,
      role,
      status,
      joined_at: joinedAt,
    });

    batch.set(collaborationRef, {
      id: eventId,
      title,
      description,
      categories,
      host,
      role,
      ...(bannerImageUrl && { banner_image_url: bannerImageUrl }),
      ...(eventTimestamp && { date: eventTimestamp }),
      effective_date: effectiveDate,
      date_source: dateSource,
      joined_at: joinedAt,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  try {
    await batch.commit();
    return { success: true, event_id: eventId };
  } catch (err) {
    console.error("🔥 Failed to commit batch:", err);
    if (err instanceof Error) {
      throw new functions.https.HttpsError("internal", `Batch commit failed: ${err.message}`);
    } else {
      throw new functions.https.HttpsError("internal", "An unknown error occurred.");
    }
  }
});

async function fetchCollaboratorDetails(userIds: string[]) {
  try {
    // Batch fetch documents
    const userDocs = await db.collection("users").where(admin.firestore.FieldPath.documentId(), "in", userIds).get();

    if (userDocs.empty) {
      console.error("❌ No users found for the given IDs:", userIds);
      return [];
    }

    const collaborators = userDocs.docs.map((doc) => {
      const userData = doc.data();
      return {
        userId: doc.id,
        username: userData.username,
        profileImageUrl: userData.profile_image_url ?? null,
      };
    });

    return collaborators;
  } catch (err) {
    console.error(`❌ Error fetching collaborators data for userIds ${userIds}:`, err);
    return [];
  }
}
