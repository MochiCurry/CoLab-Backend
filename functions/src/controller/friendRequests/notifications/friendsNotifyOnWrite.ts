import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../../helpers/admin";
import { enqueueJobs } from "../../../notifications/jobs/enqueue";

export const friends_notifyOnWrite = onDocumentWritten(
  { document: "users/{uid}/friends/{otherUid}", region: "us-central1" },
  async (chg) => {
    const { uid, otherUid } = chg.params as { uid: string; otherUid: string };

    const existedBefore = !!chg.data?.before?.exists;
    const existsAfter   = !!chg.data?.after?.exists;

    // Only react to creation
    if (existedBefore || !existsAfter) return;

    // Require reciprocal (mutual) friend doc
    const reciprocalRef = db.doc(`users/${otherUid}/friends/${uid}`);
    const reciprocal = await reciprocalRef.get();
    if (!reciprocal.exists) return;

    // Canonicalize to send only once
    const a = uid < otherUid ? uid : otherUid;
    const b = uid < otherUid ? otherUid : uid;
    if (uid !== a) return; // let only the lexicographically smaller uid send

    // (Optional) fetch display names
    const [aSnap, bSnap] = await Promise.all([
      db.doc(`users/${a}`).get().catch(() => null),
      db.doc(`users/${b}`).get().catch(() => null),
    ]);
   
    const aName =
    aSnap?.exists
    ? (aSnap.data()?.username || "You")
    : "You";

    const bName =
    bSnap?.exists
    ? (bSnap.data()?.username || "your friend")
    : "your friend";


    const pairKey = `friendship:${a}:${b}`;

    await enqueueJobs([a, b], {
      type: "friend.added",
      title: "You’re now friends!",
      body: `${aName} and ${bName} are now connected`,
      thing_ref: `users/${a}/friends/${b}`,   // any canonical reference is fine
      group_key: pairKey,                     // prevents dupes/retries
      cta_url: `/u/${b}`,                     // deep link; adjust if you want different for each user
      metadata: { a, b },
    });
  }
);
