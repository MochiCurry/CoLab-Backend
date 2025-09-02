import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../../helpers/admin";
import { enqueueJobs } from "../../../notifications/jobs/enqueue";

export const friendRequests_notifyOnWrite = onDocumentWritten(
  { document: "users/{targetUid}/friendRequests/{fromUid}", region: "us-central1" },
  async (chg) => {
    const { targetUid, fromUid } = chg.params as { targetUid: string; fromUid: string };

    const existedBefore = !!chg.data?.before?.exists;
    const existsAfter   = !!chg.data?.after?.exists;

    // Only on create
    if (existedBefore || !existsAfter) return;

    // (Optional) fetch requestor display name
    const fromSnap = await db.doc(`users/${fromUid}`).get().catch(() => null);
    const fromName =
    fromSnap?.exists
      ? (fromSnap.data()?.username || "Someone")
      : "Someone";
  
    await enqueueJobs([targetUid], {
      type: "friend.requested",
      title: "New friend request",
      body: `${fromName} sent you a friend request`,
      thing_ref: `users/${targetUid}/friendRequests/${fromUid}`,
      group_key: `friendreq:${targetUid}:${fromUid}`,
      cta_url: `/u/${fromUid}`, // deep link to the requestor’s profile
      metadata: { fromUid },
    });
  }
);
