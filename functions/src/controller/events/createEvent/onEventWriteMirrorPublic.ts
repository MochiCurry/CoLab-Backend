// functions/src/triggers/publicEventsMirror.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { admin, db } from "../../helpers/admin";
import { EventRecord } from "@/models/firestore/EventRecord";
import { buildPublicEventCard } from "../shared/publicEventProjection";

export const onEventWriteMirrorPublic = onDocumentWritten(
  "events/{id}",
  async (event) => {
    const id = event.params.id as string;
    const before = event.data?.before?.data() as Partial<EventRecord> | undefined;
    const after = event.data?.after?.data() as Partial<EventRecord> | undefined;

    const wasPublic = before?.visibility === "public";
    const isPublic = after?.visibility === "public";

    const mirrorRef = db.collection("public_events").doc(id);

    // Deleted
    if (!after) {
      if (wasPublic) {
        await mirrorRef.delete().catch(() => {});
        logger.info(`public_events/${id} removed (source deleted)`);
      }
      return;
    }

    // Turned private/unlisted
    if (wasPublic && !isPublic) {
      await mirrorRef.delete().catch(() => {});
      logger.info(`public_events/${id} removed (no longer public)`);
      return;
    }

    // Not public → no mirror
    if (!isPublic) return;

    // Public → upsert mirror
    const evt = { id, ...(after as any) } as EventRecord & { id: string };
    const mirror = buildPublicEventCard(evt);

    await mirrorRef.set(
      { ...mirror, created_at: admin.firestore.FieldValue.serverTimestamp() },
      { merge: false }
    );

    logger.info(`public_events/${id} upserted`);
  }
);
