import * as functions from "firebase-functions";
import { db } from '../helpers/admin';

interface RequestFriendData {
  senderId: string;
  receiverId: string;
}

// ✅ 3️⃣ Decline Friend Request
export const declineFriendRequest = functions.https.onCall(
    async (request: functions.https.CallableRequest<RequestFriendData>, context) => {
      const { receiverId, senderId } = request.data;
  
      if (!receiverId || !senderId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing user IDs.");
      }
  
      const receiverRef = db.collection("users").doc(receiverId);
      const requestRef = receiverRef.collection("friendRequests").doc(senderId);
  
      const requestDoc = await requestRef.get();
      if (!requestDoc.exists) {
        throw new functions.https.HttpsError("failed-precondition", "No friend request found.");
      }
  
      await requestRef.delete();
  
      return { success: true, message: "Friend request declined." };
    }
  );