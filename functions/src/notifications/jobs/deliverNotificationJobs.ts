// src/notifications/jobs/deliver.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const deliverNotificationJobs = onSchedule(
  { schedule: "every 1 minutes", timeZone: "America/Los_Angeles", region: "us-central1" },
  async () => {
    const db = getFirestore();
    const snap = await db.collection("notif_jobs").orderBy("created_at").limit(200).get();
    if (snap.empty) return;

    for (const doc of snap.docs) {
      const job = doc.data() as {
        uid: string; type: string; title: string; body: string;
        thing_ref: string; cta_url?: string | null; group_key?: string | null;
        metadata?: any; actors?: string[]; created_at?: Timestamp;
      };

      // 1) Write to in-app inbox
      const inboxRef = db.collection(`notifications/${job.uid}/feed`).doc();
      await inboxRef.set({
        type: job.type,
        title: job.title,
        body: job.body,
        cta_url: job.cta_url ?? null,
        thing_ref: job.thing_ref,
        group_key: job.group_key ?? null,
        actors: job.actors ?? [],
        created_at: Timestamp.now(),
        read: false,
        seen: false,
      });

      // 2) Load active device tokens
      const tokensSnap = await db.collection(`users/${job.uid}/devices`).get();
      const tokens = tokensSnap.docs.map(d => d.get("fcm_token")).filter(Boolean) as string[];

      // 3) Send push (best-effort)
      if (tokens.length) {
        const resp = await getMessaging().sendEachForMulticast({
          tokens,
          notification: { title: job.title, body: job.body },
          data: {
            type: job.type,
            cta_url: job.cta_url ?? "",
            notif_id: inboxRef.id,
          },
          apns: {
            payload: { aps: { sound: "default", badge: 1 } },
          },
        });

        // Remove invalid tokens
        const bad: string[] = [];
        resp.responses.forEach((r, i) => {
          if (!r.success) {
            const code = r.error?.code ?? "";
            if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
              bad.push(tokens[i]);
            }
          }
        });
        if (bad.length) {
          const batch = db.batch();
          tokensSnap.docs.forEach(d => {
            if (bad.includes(d.get("fcm_token"))) batch.delete(d.ref);
          });
          await batch.commit();
        }
      }

      // 4) Delete job (idempotent job IDs keep you safe on retries)
      await doc.ref.delete();
    }
  }
);
