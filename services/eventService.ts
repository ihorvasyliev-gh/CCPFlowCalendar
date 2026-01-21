import { Event } from '../types';

let MOCK_EVENTS: Event[] = [
  {
    id: '101',
    title: 'CCP Annual Gala',
    description: 'The biggest event of the year celebrating our community achievements. Black tie attire required.',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 18, 0),
    location: 'Grand Ballroom, City Center',
    posterUrl: 'https://picsum.photos/800/600?random=1',
    status: 'published',
    category: 'celebration',
    tags: ['gala', 'annual', 'formal'],
    rsvpEnabled: true,
    maxAttendees: 200,
    attendees: ['1', '2'],
    creatorId: '1',
    createdAt: new Date()
  },
  {
    id: '102',
    title: 'Town Hall Meeting',
    description: 'Quarterly review and Q&A session with the board.',
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 22, 10, 0),
    location: 'Conference Room B',
    status: 'published',
    category: 'meeting',
    tags: ['meeting', 'quarterly'],
    rsvpEnabled: false,
    creatorId: '1',
    createdAt: new Date()
  },
  {
    id: '103',
    title: 'Community Cleanup',
    description: 'Join us in making our city cleaner. Gloves and bags provided.',
    date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5, 9, 0),
    location: 'Central Park Entrance',
    posterUrl: 'https://picsum.photos/800/600?random=2',
    status: 'published',
    category: 'community',
    tags: ['volunteer', 'community'],
    rsvpEnabled: true,
    maxAttendees: 50,
    attendees: [],
    creatorId: '1',
    createdAt: new Date()
  }
];

export const getEvents = async (): Promise<Event[]> => {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_EVENTS]), 500);
  });
};

export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt'>, userId: string = '1', userName: string = 'User'): Promise<Event> => {
  return new Promise((resolve) => {
    const newEvent: Event = {
      ...eventData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      history: [{
        id: Math.random().toString(36).substr(2, 9),
        eventId: '',
        userId,
        userName,
        action: 'created',
        timestamp: new Date()
      }]
    };
    // Set eventId in history
    if (newEvent.history && newEvent.history[0]) {
      newEvent.history[0].eventId = newEvent.id;
    }
    MOCK_EVENTS.push(newEvent);
    setTimeout(() => resolve(newEvent), 800);
  });
};

export const updateEvent = async (id: string, eventData: Omit<Event, 'id' | 'createdAt'>, userId: string = '1', userName: string = 'User'): Promise<Event> => {
  return new Promise((resolve, reject) => {
    const index = MOCK_EVENTS.findIndex(e => e.id === id);
    if (index !== -1) {
      const oldEvent = MOCK_EVENTS[index];
      
      // Detect changes
      const changes: Record<string, { old: any; new: any }> = {};
      if (eventData.title !== oldEvent.title) changes.title = { old: oldEvent.title, new: eventData.title };
      if (eventData.description !== oldEvent.description) changes.description = { old: oldEvent.description, new: eventData.description };
      if (eventData.location !== oldEvent.location) changes.location = { old: oldEvent.location, new: eventData.location };
      if (eventData.status !== oldEvent.status) changes.status = { old: oldEvent.status, new: eventData.status };
      if (eventData.category !== oldEvent.category) changes.category = { old: oldEvent.category, new: eventData.category };

      const historyEntry = {
        id: Math.random().toString(36).substr(2, 9),
        eventId: id,
        userId,
        userName,
        action: eventData.status === 'cancelled' ? 'status_changed' as const : 'updated' as const,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        timestamp: new Date()
      };

      const updatedEvent = {
        ...oldEvent,
        ...eventData,
        history: [...(oldEvent.history || []), historyEntry]
      };
      MOCK_EVENTS[index] = updatedEvent;
      setTimeout(() => resolve(updatedEvent), 800);
    } else {
      reject(new Error('Event not found'));
    }
  });
};

// Simulation of Cloudflare R2 Upload
// In production: Request a presigned URL from Supabase Edge Function, then PUT to R2.
export const uploadPosterToR2 = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    console.log(`Simulating upload of ${file.name} to Cloudflare R2...`);
    // Return a fake URL after delay
    setTimeout(() => {
      resolve(URL.createObjectURL(file)); 
    }, 1500);
  });
};

export const uploadAttachment = async (file: File): Promise<{ id: string; name: string; url: string; type: string; size: number; uploadedAt: Date }> => {
  return new Promise((resolve) => {
    console.log(`Simulating upload of ${file.name} to Cloudflare R2...`);
    setTimeout(() => {
      const attachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document',
        size: file.size,
        uploadedAt: new Date()
      };
      resolve(attachment);
    }, 1500);
  });
};

export const deleteEvent = async (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const index = MOCK_EVENTS.findIndex(e => e.id === id);
    if (index !== -1) {
      MOCK_EVENTS.splice(index, 1);
      setTimeout(() => resolve(), 500);
    } else {
      reject(new Error('Event not found'));
    }
  });
};

export const addComment = async (eventId: string, userId: string, userName: string, content: string): Promise<Event> => {
  return new Promise((resolve, reject) => {
    const event = MOCK_EVENTS.find(e => e.id === eventId);
    if (!event) {
      reject(new Error('Event not found'));
      return;
    }

    const comment = {
      id: Math.random().toString(36).substr(2, 9),
      eventId,
      userId,
      userName,
      content,
      createdAt: new Date()
    };

    if (!event.comments) {
      event.comments = [];
    }
    event.comments.push(comment);

    setTimeout(() => resolve({ ...event }), 500);
  });
};
