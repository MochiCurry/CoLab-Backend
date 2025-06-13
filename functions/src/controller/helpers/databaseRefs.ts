import { db } from "../helpers/admin"; // adjust path as needed

// ────────────────
// User-level Refs
// ────────────────

export const userRef = (userId: string) =>
  db.collection("users").doc(userId);

export const userCollaborationsRef = (userId: string) =>
  userRef(userId).collection("collaborations");

export const userCollaborationRef = (userId: string, eventId: string) =>
  userCollaborationsRef(userId).doc(eventId);

// ────────────────
// Event Refs
// ────────────────

export const eventRef = (eventId: string) =>
  db.collection("events").doc(eventId);

export const eventCollaboratorsRef = (eventId: string) =>
  eventRef(eventId).collection("collaborators");

export const eventCollaboratorRef = (eventId: string, userId: string) =>
  eventCollaboratorsRef(eventId).doc(userId);

// ────────────────
// Project Refs
// ────────────────

export const projectRef = (projectId: string) =>
  db.collection("projects").doc(projectId);

export const projectCollaboratorsRef = (projectId: string) =>
  projectRef(projectId).collection("collaborators");

export const projectCollaboratorRef = (projectId: string, userId: string) =>
  projectCollaboratorsRef(projectId).doc(userId);

// Optional nested structure (if you ever use it)
export const projectEventsRef = (projectId: string) =>
  projectRef(projectId).collection("events");

// ────────────────
// General Helpers
// ────────────────

export const usersCollection = () => db.collection("users");
export const eventsCollection = () => db.collection("events");
export const projectsCollection = () => db.collection("projects");
