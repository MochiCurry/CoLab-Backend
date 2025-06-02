import { onSchedule } from "firebase-functions/v2/scheduler";
import { admin, db, bucket } from "../controller/helpers/admin";

// === Field normalization ===
function getUserRef(uid: string) {
  return db.collection("users").doc(uid);
}
function getUsernameRef(username: string) {
  return db.collection("usernames").doc(username);
}
function getDeletedAccountRef(uid: string) {
  return db.collection("deleted_accounts").doc(uid);
}

async function getUsersPendingDeletion(cutoff: Date) {
  return await db.collection("users")
    .where("account_status", "==", "pending_deletion")
    .where("deleted_at", "<=", cutoff)              
    .get();
}

async function deleteUsernameIfOwned(uid: string, username: string, batch: admin.firestore.WriteBatch) {
  const usernameRef = getUsernameRef(username);
  const usernameSnap = await usernameRef.get();
  if (usernameSnap.exists && usernameSnap.data()?.uid === uid) {
    batch.delete(usernameRef);
  }
}

async function deleteUserFirestoreData(uid: string, username: string | undefined) {
  const batch = db.batch();
  const userRef = getUserRef(uid);

  if (username) {
    await deleteUsernameIfOwned(uid, username, batch);
  }

  batch.delete(userRef);
  batch.delete(getDeletedAccountRef(uid));
  await batch.commit();
}

async function deleteUserStorage(uid: string) {
  try {
    await bucket.file(`profileImages/${uid}`).delete();
  } catch (err: any) {
    if (err.code !== 404) {
      console.warn("⚠️ Error deleting profile image:", err);
    }
  }
}

async function purgeUser(uid: string, data: any) {
  const username = data.username;

  await deleteUserFirestoreData(uid, username);
  await deleteUserStorage(uid);

  // 🔁 Optional double-check for auth user
  try {
    await admin.auth().deleteUser(uid);
    console.log(`🟢 Double-check deleted Auth user ${uid}`);
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      console.log(`🟡 Auth user already deleted: ${uid}`);
    } else {
      throw err;
    }
  }

  console.log(`✅ Purged user ${uid}`);
}

export const purgeDeletedUsers = onSchedule("every 24 hours", async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const snapshot = await getUsersPendingDeletion(cutoff);
  console.log(`🧹 Found ${snapshot.size} users to purge.`);

  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const data = doc.data();

    try {
      await purgeUser(uid, data);
    } catch (err) {
      console.error(`❌ Failed to purge user ${uid}`, err);
    }
  }
});
