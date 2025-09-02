// functions/src/notifications/jobs/enqueue.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

export interface NotificationJob {
  uid: string;                     // target user
  type: string;                    // e.g. "event.updated"
  title: string;
  body: string;
  thing_ref: string;               // document path, e.g. "events/{id}"
  cta_url?: string;                // deep link
  group_key?: string;              // used to collapse multiple jobs
  metadata?: Record<string, any>;  // arbitrary extra info
  actors?: string[];               // who triggered the change
}

/**
 * Enqueue one or more notification jobs for later delivery.
 * Creates idempotent job IDs based on uid + group_key + type + minute bucket,
 * so retried triggers won't duplicate jobs.
 */
export async function enqueueJobs(
  userIds: string[],
  baseJob: Omit<NotificationJob, "uid">
): Promise<void> {
  if (!userIds.length) return;

  const db = getFirestore();
  const batch = db.batch();
  const now = new Date();

  for (const uid of userIds) {
    const id = makeJobId(uid, baseJob.group_key ?? baseJob.thing_ref, baseJob.type, now);
    const ref = db.collection("notif_jobs").doc(id);

    batch.set(ref, {
      uid,
      type: baseJob.type,
      title: baseJob.title,
      body: baseJob.body,
      thing_ref: baseJob.thing_ref,
      cta_url: baseJob.cta_url ?? null,
      group_key: baseJob.group_key ?? null,
      metadata: baseJob.metadata ?? {},
      actors: baseJob.actors ?? [],
      created_at: FieldValue.serverTimestamp(),
    }, { merge: true }); // merge = idempotent: safe to retry
  }

  await batch.commit();
}

/**
 * Builds a deterministic job ID to prevent duplicates.
 * Includes a time bucket (1 min) so repeated changes collapse together.
 */
function makeJobId(uid: string, key: string, type: string, date: Date): string {
  const minuteBucket = Math.floor(date.getTime() / 60000); // 1-min bucket
  const raw = `${uid}|${key}|${type}|${minuteBucket}`;
  return crypto.createHash("sha1").update(raw).digest("hex");
}
