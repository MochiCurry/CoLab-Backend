// import { onCall } from "firebase-functions/v2/https";
// import * as functions from "firebase-functions";
// import { db } from "../helpers/admin";

// export const requestDeleteUserAccount = onCall(async (request) => {
//   const uid = request.auth?.uid;

//   // 🔒 Confirm explicit intent
//   if (!request.data?.confirmation) {
//     throw new functions.https.HttpsError("failed-precondition", "Explicit confirmation required.");
//   }

//   // 🔒 Ensure user is authenticated
//   if (!uid) {
//     throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
//   }

//   try {
//     const userRef = db.collection("users").doc(uid);

//     // 🧠 Optional: check if already pending
//     const snapshot = await userRef.get();
//     const existingStatus = snapshot.data()?.account_status;
//     if (existingStatus === "pending_deletion") {
//       return { success: true, message: "Already scheduled for deletion." };
//     }

//     // 🧼 Mark user for background deletion
//     await userRef.update({
//       account_status: "pending_deletion",
//       deleted_at: new Date(),
//     });

//     console.log(`🔒 Marked user ${uid} for deletion`);
//     return { success: true };
//   } catch (error) {
//     console.error("❌ Failed to mark user for deletion:", error);
//     throw new functions.https.HttpsError("internal", "Failed to process account deletion.");
//   }
// });


import { onCall } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import { db, auth } from "../helpers/admin";

// ✅ Helper: Backup user data before deletion
async function backupUserData(uid: string, userData: any) {
  const ref = db.collection("deleted_accounts").doc(uid);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    console.log(`🧠 Backup already exists for ${uid}`);
    return;
  }

  const authUser = await auth.getUser(uid);
  const email = authUser.email ?? null; 
  const { username } = userData;

  await ref.set({
    email: email ?? null,
    username: username ?? null,
    deleted_at: new Date(),
    deletion_reason: "user_requested",
  });

  console.log(`✅ Backed up user ${uid} to deleted_accounts`);
}

// ✅ Helper: Mark user as pending deletion
async function markUserPending(uid: string) {
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new functions.https.HttpsError("not-found", "User document not found.");
  }

  const userData = snapshot.data();
  const alreadyPending = userData?.account_status === "pending_deletion";

  if (!alreadyPending) {
    await userRef.update({
      account_status: "pending_deletion",
      deleted_at: new Date(),
    });
    console.log(`🔒 Marked user ${uid} as pending_deletion`);
  } else {
    console.log(`⚠️ User ${uid} is already marked as pending_deletion`);
  }

  return { userData, alreadyPending };
}

// ✅ Helper: Delete Auth user safely
async function deleteAuthUserIfExists(uid: string) {
  try {
    await auth.getUser(uid);
    await auth.deleteUser(uid);
    console.log(`🔥 Auth user ${uid} deleted`);
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      console.log(`⚠️ Auth user ${uid} already deleted`);
    } else {
      throw err;
    }
  }
}

// 🚀 Main callable function
export const requestDeleteUserAccount = onCall(async (request) => {
  const uid = request.auth?.uid;

  if (!request.data?.confirmation) {
    throw new functions.https.HttpsError("failed-precondition", "Explicit confirmation required.");
  }

  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  try {
    const userRef = db.collection("users").doc(uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new functions.https.HttpsError("not-found", "User document not found.");
    }

    const userData = snapshot.data();

    // ✅ FIRST: Backup data
    await backupUserData(uid, userData);

    // ✅ SECOND: Mark as pending_deletion
    const { alreadyPending } = await markUserPending(uid);
    if (alreadyPending) {
      console.log(`⚠️ User ${uid} was already pending_deletion — continuing to ensure Auth is deleted`);
    }

    // ✅ THIRD: Delete auth account
    await deleteAuthUserIfExists(uid);

    return { success: true };
  } catch (error) {
    console.error("❌ Deletion failed:", error);
    throw new functions.https.HttpsError("internal", "Failed to process account deletion.");
  }
});
