
import { onCall } from "firebase-functions/v2/https";
import { admin, db } from "../controller/helpers/admin";
import * as functions from "firebase-functions";

export const appEntryResolver = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "Not signed in");
  }

  const authUser = await admin.auth().getUser(uid);
  const isEmailVerified = authUser.emailVerified;

  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();

  const accountStatus = userData?.account_status;
  const hasCompletedOnboarding = userData?.has_completed_onboarding === true;

  // Block if pending deletion
  if (accountStatus === "pending_deletion") {
    return { route: "deletionLocked" };
  }

  // Block if email unverified
  if (!isEmailVerified) {
    return { route: "emailVerification" };
  }

  // If no Firestore doc or not onboarded → username creation
  if (!userData || !hasCompletedOnboarding) {
    return { route: "createUsername" };
  }

  // ✅ All good
  return { route: "mainApp" };
});
