import * as functions from "firebase-functions";
import { db } from '../helpers/admin';

export const removeFriend = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ userId: string; friendId: string }>, context) => {
    const { userId, friendId } = request.data;

    if (!userId || !friendId) {
      throw new functions.https.HttpsError("invalid-argument", "Missing user IDs.");
    }

    const userFriendsRef = db.collection("users").doc(userId).collection("friends").doc(friendId);
    const friendFriendsRef = db.collection("users").doc(friendId).collection("friends").doc(userId);

    const userFriendDoc = await userFriendsRef.get();
    if (!userFriendDoc.exists) {
      throw new functions.https.HttpsError("failed-precondition", "Friendship does not exist.");
    }

    await userFriendsRef.delete();
    await friendFriendsRef.delete();

    return { success: true, message: "Friend removed." };
  }
);