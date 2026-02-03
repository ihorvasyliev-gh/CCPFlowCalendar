import { supabase } from '../lib/supabase';

// Subscribe to RSVP changes for real-time updates (optional, handled by optimistic UI for now)

export const rsvpToEvent = async (eventId: string, userId: string, userName: string): Promise<void> => {
  const { error } = await supabase
    .from('rsvps')
    .upsert({
      event_id: eventId,
      user_id: userId,
      user_name: userName,
      status: 'going'
    }, { onConflict: 'event_id,user_id' });

  if (error) {
    console.error('Error RSVPing to event:', error);
    throw new Error(error.message || 'Failed to RSVP');
  }
};

export const cancelRsvp = async (eventId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error cancelling RSVP:', error);
    throw new Error(error.message || 'Failed to cancel RSVP');
  }
};

export const getEventAttendees = async (eventId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('rsvps')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'going');

  if (error) {
    console.error('Error fetching attendees:', error);
    return [];
  }

  return data.map(r => r.user_id);
};

export const hasUserRsvped = async (eventId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('rsvps')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'going')
    .maybeSingle(); // Use maybeSingle to avoid error if not found

  if (error) {
    console.error('Error checking RSVP status:', error);
    return false;
  }

  return !!data;
};

export const getUserRsvps = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('rsvps')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'going');

  if (error) {
    console.error('Error fetching user RSVPs:', error);
    return [];
  }

  return data.map(r => r.event_id);
};

