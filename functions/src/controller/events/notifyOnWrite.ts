import { db } from "../helpers/admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { diffEvent } from "../../notifications/diff/eventDiff";
import { enqueueJobs } from "../../notifications/jobs/enqueue";

export const events_notifyOnWrite = onDocumentWritten(
  { document: "events/{eventId}", region: "us-central1", concurrency: 80 },
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after  = event.data?.after?.data()  ?? null;

    const diff = diffEvent(before, after);
    if (!diff) return;

    const eventId = event.params.eventId;

    // who is subscribed?
    const subsSnap = await db.collectionGroup("items")
      .where("type", "==", "event")
      .where("__name__", "==", eventId) // adjust if you store thingId differently
      .get();

    const userIds: string[] = subsSnap.docs.map(d => d.ref.parent!.parent!.id);

    if (userIds.length === 0) return;

    await enqueueJobs(userIds, {
      type: diff.type, // 'event.updated'
      title: after?.title ?? "Event updated",
      body: diff.summary, // e.g. "Time moved to 7:30 PM; location changed"
      thing_ref: `events/${eventId}`,
      group_key: `event:${eventId}`, // collapse multiple updates
      cta_url: `/e/${eventId}`,
      metadata: { changedFields: diff.changedFields },
    });
  }
);
