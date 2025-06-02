import * as functions from "firebase-functions";
import { admin, db } from "../helpers/admin";

// === Helpers ===

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function isValidUsernameFormat(username: string): boolean {
  const isValidLength = username.length >= 4 && username.length <= 15;
  const isValidChars = /^[a-z0-9_]+$/.test(username);
  return isValidLength && isValidChars;
}

function getUsernameRef(username: string) {
  return db.collection("usernames").doc(username);
}

function getUserRef(uid: string) {
  return db.collection("users").doc(uid);
}

// === Main Function ===

export const createUsername = functions.https.onCall(async (req) => {
  try {
    const uid = req.auth?.uid;
    const rawUsername = req.data?.username;

    if (!uid || typeof rawUsername !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Invalid username or unauthenticated request.");
    }

    const cleanUsername = normalizeUsername(rawUsername);

    if (!isValidUsernameFormat(cleanUsername)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Username must be 4–15 characters and contain only lowercase letters, numbers, or underscores."
      );
    }

    const usernameRef = getUsernameRef(cleanUsername);
    const userRef = getUserRef(uid);

    const takenSnap = await usernameRef.get();
    if (takenSnap.exists) {
      throw new functions.https.HttpsError("already-exists", "Username is already taken.");
    }

    await db.runTransaction(async (tx) => {
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      tx.set(usernameRef, {
        user_id: uid,
        createdAt: timestamp,
        updatedAt: timestamp,
        claimedByFunction: "createUsername"
      });

      tx.set(userRef, {
        user_id: uid,
        username: cleanUsername,
        date_created: timestamp,
        has_completed_onboarding: true
      }, { merge: true });
    });

    return { success: true };

  } catch (error: any) {
    console.error("🔥 createUsername error:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      error?.message || "Unexpected error occurred while creating username."
    );
  }
});
