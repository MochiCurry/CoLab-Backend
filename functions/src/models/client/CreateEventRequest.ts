 export type CreateEventRequest = {
    title: string;
    description: string;
    location?: string;
    date?: EventTimeRange;
    collaborators?: string[];
    categories?: string[];
    required_items?: string[];
    optional_items?: string[];
  }

  export type EventTimeRange = {
    start?: number;
    end?: number;
  }