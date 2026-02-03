import { Event } from '../types';
import { supabase } from '../lib/supabase';


export type NotificationType = 'event_reminder' | 'event_created' | 'event_updated' | 'event_cancelled' | 'rsvp_update';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  eventId?: string;
  event?: Event;
  read: boolean;
  createdAt: Date;
}

// Mock notifications storage
let MOCK_NOTIFICATIONS: Notification[] = [];

// Request browser notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showBrowserNotification = (title: string, options?: NotificationOptions) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  }
};

// Create notification
export const createNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification => {
  const newNotification: Notification = {
    ...notification,
    id: Math.random().toString(36).substr(2, 9),
    read: false,
    createdAt: new Date()
  };
  MOCK_NOTIFICATIONS.unshift(newNotification);
  return newNotification;
};

// Get notifications
export const getNotifications = async (userId: string, unreadOnly: boolean = false): Promise<Notification[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let notifications = [...MOCK_NOTIFICATIONS];
      if (unreadOnly) {
        notifications = notifications.filter(n => !n.read);
      }
      resolve(notifications);
    }, 300);
  });
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const notification = MOCK_NOTIFICATIONS.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
      resolve();
    }, 200);
  });
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      MOCK_NOTIFICATIONS.forEach(n => n.read = true);
      resolve();
    }, 200);
  });
};

// Delete notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      MOCK_NOTIFICATIONS = MOCK_NOTIFICATIONS.filter(n => n.id !== notificationId);
      resolve();
    }, 200);
  });
};

// Schedule event reminder
export const scheduleEventReminder = (event: Event, reminderMinutes: number): void => {
  const reminderTime = new Date(event.date.getTime() - reminderMinutes * 60 * 1000);
  const now = new Date();
  const delay = reminderTime.getTime() - now.getTime();

  if (delay > 0) {
    setTimeout(() => {
      createNotification({
        type: 'event_reminder',
        title: `Reminder: ${event.title}`,
        message: `Event "${event.title}" starts in ${reminderMinutes} minutes`,
        eventId: event.id,
        event
      });
      showBrowserNotification(`Reminder: ${event.title}`, {
        body: `Event starts in ${reminderMinutes} minutes at ${event.location}`,
        tag: `event-reminder-${event.id}`
      });
    }, delay);
  }
};

export const checkTomorrowRSVPEvents = async (userId: string): Promise<void> => {
  // 1. Get user's RSVPs
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'going');

  if (!rsvps || rsvps.length === 0) return;

  const eventIds = rsvps.map(r => r.event_id);
  if (eventIds.length === 0) return;

  // 2. Get events for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds)
    .gte('date', tomorrow.toISOString())
    .lt('date', dayAfterTomorrow.toISOString());

  if (!events || events.length === 0) return;

  // 3. Notify
  // Check permission first
  const permission = await requestNotificationPermission();
  if (!permission) return;

  // Check if we already notified today (simple localStorage check to avoid spam on refresh)
  const notifiedKey = `notified_events_${new Date().toDateString()}`;
  const notifiedEvents = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

  for (const event of events) {
    if (!notifiedEvents.includes(event.id)) {
      showBrowserNotification(`Upcoming Event: ${event.title}`, {
        body: `You have an event tomorrow at ${new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${event.location || 'No location'}`,
        icon: event.poster_url || '/favicon.ico'
      });
      notifiedEvents.push(event.id);
    }
  }

  localStorage.setItem(notifiedKey, JSON.stringify(notifiedEvents));
};
