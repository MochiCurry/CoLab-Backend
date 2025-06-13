import { admin, db } from "../../helpers/admin";

export function writeCollaborators(
    batch: admin.firestore.WriteBatch,
    userDocs: admin.firestore.QuerySnapshot,
    collabRef: admin.firestore.CollectionReference,
    eventId: string
  ) {
    const joinedAt = admin.firestore.FieldValue.serverTimestamp();
  
    for (const doc of userDocs.docs) {
      const userId = doc.id;
      const userData = doc.data();
  
      const collabDocRef = collabRef.doc(userId);
      const userCollabRef = db.collection("users").doc(userId).collection("collaborations").doc(eventId);
  
      const role = "member";
      const status = "pending";
  
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
  }