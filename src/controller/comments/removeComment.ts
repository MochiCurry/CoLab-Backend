import { db } from '../helpers/admin';
import { onDocumentDeleted } from "firebase-functions/v2/firestore";

export const onCommentRemoved = onDocumentDeleted("events/{eventId}/comments/{commentId}", async (event) => {
  const { eventId } = event.params;
  const eventRef = db.collection("events").doc(eventId);

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(eventRef);
    const currentCount = snapshot.data()?.comment_count ?? 0;

    const newCount = Math.max(0, currentCount - 1);
    tx.update(eventRef, { comment_count: newCount });
  });
});