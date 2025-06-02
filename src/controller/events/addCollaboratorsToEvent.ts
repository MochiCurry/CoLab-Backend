import * as functions from "firebase-functions";
import { admin, db } from '../helpers/admin';

export const addCollaboratorsToEvent = functions.https.onCall(async (req) => {
    const { eventId, userIds } = req.data;
    if (!eventId || !Array.isArray(userIds)) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const eventRef = db.collection("events").doc(eventId);
    const collabRef = eventRef.collection("collaborators");

    const snapshot = await collabRef.get();
    const existingUserIds = snapshot.docs.map(doc => doc.id);

    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
        return { message: "No new collaborators to add." };
    }

    const userDocs = await db
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", newUserIds)
        .get();

    const batch = db.batch();
    for (const doc of userDocs.docs) {
        const userId = doc.id;
        const userData = doc.data();

        const role = "member";
        const status = "pending";
        const joinedAt = admin.firestore.FieldValue.serverTimestamp();

        const collabDocRef = collabRef.doc(userId);
        const userCollabRef = db.collection("users").doc(userId).collection("collaborations").doc(eventId);

        batch.set(collabDocRef, {
            user_id: userId,
            username: userData.username,
            profile_image_url: userData.profile_image_url ?? null,
            role,
            status,
            joined_at: joinedAt
        });

        batch.set(userCollabRef, {
            id: eventId,
            title: "[optional event title]",
            description: "[optional event description]",
            role,
            status,
            joined_at: joinedAt
        });
    }

    await batch.commit();
    return { success: true, added: newUserIds.length };
});
