// src/controller/events/getEvent.ts
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import * as admin from "firebase-admin";
import "firebase-admin/storage";

// ---------- Firebase init (explicit bucket = *.firebasestorage.app)
const PROJECT_BUCKET = "colab-3e6dd.firebasestorage.app";

if (!admin.apps.length) {
  admin.initializeApp({ storageBucket: PROJECT_BUCKET });
}
const db = admin.firestore();
const bucket = admin.storage().bucket(PROJECT_BUCKET);

// ---------- Types
type Visibility = "public" | "unlisted" | "private";

type HostModel = {
  id: string;
  profile_image_url?: string | null;
  username?: string | null;
};

type TimeRange = {
  start?: admin.firestore.Timestamp | string | null;
  end?: admin.firestore.Timestamp | string | null;
  timezone?: string | null;
};

type EventRecord = {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  host: HostModel;
  location: string | null;
  categories: string[];
  required_items: string[];
  optional_items: string[];
  date?: TimeRange;
  effective_date: admin.firestore.Timestamp;
  date_source: string;
  visibility: Visibility;
  created_at: admin.firestore.Timestamp;
  media?: unknown | null;
};

// ---------- Helpers
const iso = (v?: admin.firestore.Timestamp | string | null) =>
  v ? (typeof v === "string" ? new Date(v).toISOString() : v.toDate().toISOString()) : undefined;

/** From a Storage *path* -> public URL (token if present, else a short-lived signed URL). */
async function urlFromPath(path: string): Promise<string | null> {
  try {
    const file = bucket.file(path);
    const [meta] = await file.getMetadata();
    const token = (meta as any)?.metadata?.firebaseStorageDownloadTokens?.split(",")?.[0];
    if (token) {
      return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        path
      )}?alt=media&token=${token}`;
    }
  } catch {
    // fall through to signed URL attempt
  }
  try {
    const [signed] = await bucket
      .file(path)
      .getSignedUrl({ action: "read", expires: Date.now() + 6 * 60 * 60 * 1000 }); // 6h
    return signed;
  } catch {
    return null;
  }
}

// ---------- HTTPS Function
export const getEvent = onRequest(
  { region: "us-central1", cors: true },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.query.id || "").trim();
      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }

      // Prefer doc id; fall back to an 'id' field.
      let snap = await db.doc(`events/${id}`).get();
      if (!snap.exists) {
        const qs = await db.collection("events").where("id", "==", id).limit(1).get();
        if (!qs.empty) snap = qs.docs[0];
      }
      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const raw = snap.data() as EventRecord;

      // ---- Build banner_url from your media shape
      const m: any = (raw as any).media || {};
      const bannerPath: string | undefined = m.banner;          // "events/<id>/original.jpg"
      const thumbPath: string | undefined = m.thumbnail?.path;  // "thumbnails/events/<id>/..."
      const thumbUrl: string | undefined = m.thumbnail?.url;    // absolute (may already work)

      const banner_url: string | null =
        (bannerPath ? await urlFromPath(bannerPath) : null) ||
        (thumbPath ? await urlFromPath(thumbPath) : null) ||
        thumbUrl ||
        null;

      // ---- Host passthrough with safe fallbacks
      const host: HostModel = {
        id: (raw.host?.id as string) || raw.owner_id || "",
        profile_image_url: (raw.host as any)?.profile_image_url ?? null,
        username: (raw.host as any)?.username ?? null,
      };

      // ---- Public payload
      const payload = {
        id: raw.id ?? snap.id,
        title: raw.title,
        description: raw.description ?? "",
        owner_id: raw.owner_id ?? "",
        host,
        location: raw.location ?? null,
        categories: raw.categories ?? [],
        required_items: raw.required_items ?? [],
        optional_items: raw.optional_items ?? [],
        date: {
          start: iso(raw.date?.start) ?? iso(raw.effective_date),
          end: iso(raw.date?.end) ?? null,
          timezone: raw.date?.timezone ?? null,
        },
        effective_date: iso(raw.effective_date)!,
        date_source: raw.date_source ?? "",
        visibility: raw.visibility ?? "public",
        created_at: iso(raw.created_at)!,
        media: { banner_url },
      };

      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
      res.json(payload);
    } catch (e) {
      console.error("[getEvent] error", e);
      res.status(500).json({ error: "Server error" });
    }
  }
);
