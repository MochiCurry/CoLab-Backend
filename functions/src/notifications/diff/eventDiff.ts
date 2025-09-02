// functions/src/notifications/diff/eventDiff.ts

export interface EventDiff {
    type: "event.created" | "event.updated" | "event.deleted";
    summary: string;
    changedFields: string[];
  }
  
  /**
   * Compares before/after snapshots of an event doc and returns a diff
   * describing meaningful changes. Returns null if no important changes.
   */
  export function diffEvent(before: any, after: any): EventDiff | null {
    // Handle create / delete cases
    // if (!before && after) {
    //   return {
    //     type: "event.created",
    //     summary: "New event created",
    //     changedFields: ["all"],
    //   };
    // }
    if (!before && after) return null; // let collaborators trigger handle creates

    if (before && !after) {
      return {
        type: "event.deleted",
        summary: "Event deleted",
        changedFields: ["all"],
      };
    }
    if (!before || !after) return null;
  
    const changed: string[] = [];
    const messages: string[] = [];
  
    // Title change
    if (before.title !== after.title) {
      changed.push("title");
      messages.push(`title updated`);
    }
  
    // Start time change
    if (before.start_time !== after.start_time) {
      changed.push("start_time");
      messages.push(
        `time changed to ${formatTime(after.start_time)}`
      );
    }
  
    // End time change
    if (before.end_time !== after.end_time) {
      changed.push("end_time");
      messages.push(
        `end time changed to ${formatTime(after.end_time)}`
      );
    }
  
    // Location change
    if (before.location !== after.location) {
      changed.push("location");
      messages.push(`location changed to ${after.location || "TBD"}`);
    }
  
    // Description change (optional, noisy if long)
    if (before.description !== after.description) {
      changed.push("description");
      messages.push("description updated");
    }
  
    // Add other important fields as needed, ignore noisy fields like updated_at
  
    if (changed.length === 0) return null;
  
    return {
      type: "event.updated",
      summary: messages.join("; "),
      changedFields: changed,
    };
  }
  
  function formatTime(value: string | number | Date): string {
    try {
      const d = new Date(value);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return String(value);
    }
  }
  