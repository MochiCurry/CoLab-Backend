import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { admin, db } from '../helpers/admin';


export const onLikeAdded = onDocumentCreated("events/{eventId}/likes/{userId}", async (event) => {
  const { eventId, userId } = event.params;
  const ref = db.collection("events").doc(eventId);

  console.log(`✅ Incrementing like count for event ${eventId} by ${userId}`);
  await ref.update({
    like_count: admin.firestore.FieldValue.increment(1),
  });
});