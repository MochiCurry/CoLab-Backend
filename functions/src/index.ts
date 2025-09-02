/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Controller exports
export * from './controller/events/createEvent/createEvent';
export * from './controller/events/editEvent/editEvent';
export * from './controller/comments/addComment';
export * from './controller/comments/removeComment';
export * from './controller/events/deleteEvent/deleteEvent';
export * from './controller/events/leaveEvent/leaveEvent';
export * from './controller/events/addCollaborators/addCollaboratorsToEvent';
export * from './controller/events/removeCollaborators/removeCollaboratorsFromEvent';
export * from './controller/friendRequests/acceptFriendRequest';
export * from './controller/friendRequests/cancelFriendRequest';
export * from './controller/friendRequests/declineFriendRequest';
export * from './controller/friendRequests/removeFriend';
export * from './controller/friendRequests/sendFriendRequest';
export * from './controller/likes/addLike';
export * from './controller/likes/removeLike';
export * from './controller/thumbnails/eventThumbnail';
export * from './controller/thumbnails/profileThumbnail';
export * from './controller/users/editProfile';
export * from './controller/users/updateProfile';
export * from './controller/users/createUsername';
export * from './controller/users/requestDeleteUserAccount';

// Schedule
// export * from './scheduled/purgeDeletedUsers';

// App Entry
export * from './controller/appEntryResolver';

// Dev
export * from './controller/events/createEvent/createEventDev'; // this is in production

export * from './controller/events/createEvent/createEventDevV2';
export * from './controller/events/createEvent/onEventWriteMirrorPublic';

// Web
export { getEvent } from "./controller/events/getEvent";

// Notifications
// src/index.ts  (or your main barrel)
export { events_notifyOnWrite } from "./controller/events/notifyOnWrite";
export { events_collaborators_subscribeOnWrite } from "./controller/events/subscribeOnWrite";
export { friendRequests_notifyOnWrite } from "./controller/friendRequests/notifications/FriendRequestNotifyOnWrite";
export { friends_notifyOnWrite } from "./controller/friendRequests/notifications/friendsNotifyOnWrite";

export { deliverNotificationJobs } from "./notifications/jobs/deliverNotificationJobs";
