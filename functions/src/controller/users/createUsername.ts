import * as functions from "firebase-functions";
import { admin, db } from "../helpers/admin";

export const createUsername = functions.https.onCall(async (req) => {
  try {
    const { username } = req.data;
    const uid = req.auth?.uid;

    if (!uid || typeof username !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Invalid username or unauthenticated request.");
    }

    const cleanUsername = username.trim().toLowerCase();

    const isValidLength = cleanUsername.length >= 4 && cleanUsername.length <= 15;
    const isValidChars = /^[a-z0-9_]+$/.test(cleanUsername);

    if (!isValidLength || !isValidChars) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Username must be 4–15 characters and contain only letters, numbers, or underscores."
      );
    }

    const usernameRef = db.collection("usernames").doc(cleanUsername);
    const userRef = db.collection("users").doc(uid);

    const takenSnap = await usernameRef.get();
    if (takenSnap.exists) {
      throw new functions.https.HttpsError("already-exists", "Username is already taken.");
    }

    await db.runTransaction(async (tx) => {
      tx.set(usernameRef, { uid });
      tx.set(userRef, {
        user_id: uid,
        username: cleanUsername,
        date_created: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return { success: true };

  } catch (error: any) {
    console.error("🔥 createUsername error:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError("internal", error?.message || "Unexpected error occurred while creating username.");
  }
});
