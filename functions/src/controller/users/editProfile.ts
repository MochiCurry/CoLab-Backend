import { admin, db } from '../helpers/admin';
import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";

export type EditUserRequest = {
	username?: string;
    bio?: string;
    profile_image?: ProfileImage;
  }

  export type ProfileImage = {
	  image_path: string;
	  thumbnail_url: string;
  }

// --- Helpers ---
const isNonEmptyString = (value: any) => typeof value === 'string' && value.trim() !== '';
const getUserRef = (uid: string) => db.collection("users").doc(uid);
const getUsernameRef = (username: string) => db.collection("usernames").doc(username.toLowerCase());

// async function ensureUsernameIsAvailable(tx: admin.firestore.Transaction, newUsername: string) {
// 	const usernameRef = getUsernameRef(newUsername);
// 	const usernameSnap = await tx.get(usernameRef);
// 	if (usernameSnap.exists) {
// 		throw new HttpsError("already-exists", "That username is already taken.");
// 	}
// 	return usernameRef;
// }

// async function handleUsernameUpdate(
// 	tx: admin.firestore.Transaction,
// 	uid: string,
// 	newUsername: string,
// 	currentUsername: string | undefined
// ): Promise<{ update: Partial<EditUserRequest> }> {
// 	if (newUsername === currentUsername) return { update: {} };

// 	const newUsernameRef = await ensureUsernameIsAvailable(tx, newUsername);
// 	const oldUsernameRef = currentUsername ? getUsernameRef(currentUsername) : null;

// 	tx.set(newUsernameRef, { uid, createdAt: new Date() });
// 	if (oldUsernameRef) tx.delete(oldUsernameRef);

// 	return {
// 		update: { username: newUsername.toLowerCase() }
// 	};
// }

function validateBio(bio: any): string {
	if (typeof bio !== 'string') {
		throw new HttpsError("invalid-argument", "Bio must be a string.");
	}
	
	const trimmed = bio.trim();

	if (trimmed === '') {
		throw new HttpsError("invalid-argument", "Bio cannot be empty.");
	}

	if (trimmed.length > 300) {
		throw new HttpsError("invalid-argument", "Bio must be 300 characters or fewer.");
	}

	return trimmed;
}

export function validateProfileImage(image: ProfileImage): ProfileImage {
	if (!image || typeof image !== 'object') {
		throw new HttpsError("invalid-argument", "Profile image must be a valid object.");
	}

	if (!isNonEmptyString(image.image_path)) {
		throw new HttpsError("invalid-argument", "Profile image must include a non-empty image_path.");
	}

	if (!isNonEmptyString(image.thumbnail_url)) {
		throw new HttpsError("invalid-argument", "Profile image must include a non-empty thumbnail_url.");
	}

	return {
		image_path: image.image_path.trim(),
		thumbnail_url: image.thumbnail_url.trim(),
	};
}
  
// --- Main Function ---
export const editUserProfile = onCall(async (request) => {
	const uid = request.auth?.uid;
	if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");

	const data = request.data as EditUserRequest;
	const userRef = getUserRef(uid);

	try {
		await db.runTransaction(async (tx) => {
			const userSnap = await tx.get(userRef);
			if (!userSnap.exists) {
				throw new HttpsError("not-found", "User document not found.");
			}

			const currentData = userSnap.data();
			// const currentUsername = currentData?.username;
			const updateData: any = {};

			// Username logic (commented out)
			// if (data.username) {
			//   const result = await handleUsernameUpdate(tx, uid, data.username, currentUsername);
			//   Object.assign(updateData, result.update);
			// }

			if (typeof data.bio === 'string') {
				updateData.bio = validateBio(data.bio);
			}

			if (
				data.profile_image &&
				isNonEmptyString(data.profile_image.image_path) &&
				isNonEmptyString(data.profile_image.thumbnail_url)
			) {
				updateData.profile_image = validateProfileImage(data.profile_image);
			}

			// Throw if there's nothing to update
			if (Object.keys(updateData).length === 0) {
				throw new HttpsError("invalid-argument", "No valid fields to update.");
			}
			
			tx.update(userRef, updateData);
		});

		return { success: true };
	} catch (err: any) {
		console.error("editUserProfile failed:", err);
		if (err instanceof HttpsError) throw err;
		throw new HttpsError("internal", "Failed to update user profile.");
	}
});

