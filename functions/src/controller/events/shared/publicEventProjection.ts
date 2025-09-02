// src/controller/events/shared/publicEventProjection.ts
import { admin, db } from "../../helpers/admin";
import { EventRecord } from "@/models/firestore/EventRecord";
import { PublicEventRecord } from "@/models/firestore/PublicEventRecord";

/** Pure projector: EventRecord -> PublicEventCard (no server timestamps) */
export function buildPublicEventCard(
  event: EventRecord
): Omit<PublicEventRecord, "created_at"> {

  const banner = event.media?.thumbnail?.url ?? undefined;

  return {
    id: event.id,
    visibility: event.visibility,
    title: event.title,
    description: (event.description || "").slice(0, 800),
    categories: event.categories ?? [],
    host: event.host,
    ...(banner && { banner }),  
    effective_date: event.effective_date,
    date_source: event.date_source,
    ...(event.date && {
      date: {
        start: event.date.start,
        ...(event.date.end && { end: event.date.end }),
      },
    }),
  };
}

// Not used at the moment
/** Enqueue write: /public_events/{eventId} (adds created_at server timestamp) */
export function enqueuePublicEventWrite(
  batch: admin.firestore.WriteBatch,
  event: EventRecord
) {
  const ref = db.collection("public_events").doc(event.id);
  const card = buildPublicEventCard(event);
  batch.set(ref, { ...card, created_at: admin.firestore.FieldValue.serverTimestamp() });
}

/** Enqueue delete: /public_events/{eventId} */
export function enqueuePublicEventDelete(
  batch: admin.firestore.WriteBatch,
  eventId: string
) {
  const ref = db.collection("public_events").doc(eventId);
  batch.delete(ref);
}
