import { admin, db } from '../helpers/admin';
import { onDocumentCreated } from "firebase-functions/v2/firestore";


export const onCommentAdded = onDocumentCreated("events/{eventId}/comments/{commentId}", async (event) => {
    const { eventId } = event.params;
    const eventRef = db.collection("events").doc(eventId);
  
    await eventRef.update({
      comment_count: admin.firestore.FieldValue.increment(1),
    });
  });