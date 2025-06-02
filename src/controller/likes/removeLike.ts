import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import { db } from '../helpers/admin';

export const onLikeRemoved = onDocumentDeleted("events/{eventId}/likes/{userId}", async (event) => {
  const { eventId } = event.params;
  const ref = db.collection("events").doc(eventId);

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const currentCount = snapshot.data()?.like_count ?? 0;

    const newCount = Math.max(0, currentCount - 1);
    tx.update(ref, { like_count: newCount });
  });
});