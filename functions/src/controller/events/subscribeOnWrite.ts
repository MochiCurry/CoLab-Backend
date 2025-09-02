import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../helpers/admin";
import { enqueueJobs } from "../../notifications/jobs/enqueue";

export const events_collaborators_subscribeOnWrite = onDocumentWritten(
  { document: "events/{eventId}/collaborators/{uid}", region: "us-central1" },
  async (chg) => {
    const { eventId, uid } = chg.params as { eventId: string; uid: string };
    const existedBefore = !!chg.data?.before?.exists;
    const existsAfter   = !!chg.data?.after?.exists;

    const subRef = db.doc(`subscriptions/${uid}/items/${eventId}`);

    if (!existedBefore && existsAfter) {
      await subRef.set({ type: "event", created_at: new Date() }, { merge: true });

      // enqueue "added/created" notification for THIS user
      const evSnap = await db.doc(`events/${eventId}`).get();
      const title = evSnap.exists ? (evSnap.get("title") ?? "New event") : "New event";

      await enqueueJobs([uid], {
        type: "event.created",
        title,
        body: "You were added as a collaborator",
        thing_ref: `events/${eventId}`,
        group_key: `event:${eventId}`,
        cta_url: `/e/${eventId}`,
      });
    } else if (existedBefore && !existsAfter) {
      await subRef.delete().catch(() => {});
      // optional: enqueue a "removed" notification
    }
  }
);
