import { Event } from '../types';

// Mock RSVP data stored per event
const MOCK_RSVPS: Record<string, string[]> = {};

export const rsvpToEvent = async (eventId: string, userId: string): Promise<Event> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!MOCK_RSVPS[eventId]) {
        MOCK_RSVPS[eventId] = [];
      }
      
      if (MOCK_RSVPS[eventId].includes(userId)) {
        reject(new Error('Already RSVPed to this event'));
        return;
      }

      MOCK_RSVPS[eventId].push(userId);
      
      // In a real app, we'd fetch the updated event from the backend
      // For now, we'll just return a mock updated event
      const updatedEvent = {
        id: eventId,
        attendees: MOCK_RSVPS[eventId]
      } as Event;
      
      resolve(updatedEvent);
    }, 500);
  });
};

export const cancelRsvp = async (eventId: string, userId: string): Promise<Event> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!MOCK_RSVPS[eventId] || !MOCK_RSVPS[eventId].includes(userId)) {
        reject(new Error('Not RSVPed to this event'));
        return;
      }

      MOCK_RSVPS[eventId] = MOCK_RSVPS[eventId].filter(id => id !== userId);
      
      const updatedEvent = {
        id: eventId,
        attendees: MOCK_RSVPS[eventId]
      } as Event;
      
      resolve(updatedEvent);
    }, 500);
  });
};

export const getEventAttendees = (eventId: string): string[] => {
  return MOCK_RSVPS[eventId] || [];
};

export const hasUserRsvped = (eventId: string, userId: string): boolean => {
  return MOCK_RSVPS[eventId]?.includes(userId) || false;
};
