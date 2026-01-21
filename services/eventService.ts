import { Event, Attachment, EventComment, EventHistoryEntry, RecurrenceRule } from '../types';
import { supabase } from '../lib/supabase';

// Преобразуем данные из Supabase (snake_case) в TypeScript типы (camelCase)
const mapSupabaseEventToEvent = async (supabaseEvent: any): Promise<Event> => {
  // Загружаем связанные данные
  const [attachmentsResult, commentsResult, historyResult, rsvpsResult] = await Promise.all([
    supabase
      .from('event_attachments')
      .select('*')
      .eq('event_id', supabaseEvent.id)
      .order('uploaded_at', { ascending: true }),
    supabase
      .from('event_comments')
      .select('*')
      .eq('event_id', supabaseEvent.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('event_history')
      .select('*')
      .eq('event_id', supabaseEvent.id)
      .order('timestamp', { ascending: true }),
    supabase
      .from('rsvps')
      .select('user_id')
      .eq('event_id', supabaseEvent.id)
      .eq('status', 'going')
  ]);

  const attachments: Attachment[] = (attachmentsResult.data || []).map((att: any) => ({
    id: att.id,
    name: att.name,
    url: att.url,
    type: att.type,
    size: att.size,
    uploadedAt: new Date(att.uploaded_at)
  }));

  const comments: EventComment[] = (commentsResult.data || []).map((comm: any) => ({
    id: comm.id,
    eventId: comm.event_id,
    userId: comm.user_id,
    userName: comm.user_name,
    content: comm.content,
    createdAt: new Date(comm.created_at)
  }));

  const history: EventHistoryEntry[] = (historyResult.data || []).map((hist: any) => ({
    id: hist.id,
    eventId: hist.event_id,
    userId: hist.user_id,
    userName: hist.user_name,
    action: hist.action,
    changes: hist.changes || undefined,
    timestamp: new Date(hist.timestamp)
  }));

  const attendees: string[] = (rsvpsResult.data || []).map((rsvp: any) => rsvp.user_id);

  // Формируем recurrence rule если есть
  let recurrence: RecurrenceRule | undefined;
  if (supabaseEvent.recurrence_type && supabaseEvent.recurrence_type !== 'none') {
    recurrence = {
      type: supabaseEvent.recurrence_type,
      interval: supabaseEvent.recurrence_interval || undefined,
      endDate: supabaseEvent.recurrence_end_date ? new Date(supabaseEvent.recurrence_end_date) : undefined,
      occurrences: supabaseEvent.recurrence_occurrences || undefined,
      daysOfWeek: supabaseEvent.recurrence_days_of_week || undefined
    };
  }

  // Получаем posterUrl из первого attachment типа image, если есть
  const posterAttachment = attachments.find(att => att.type === 'image');
  const posterUrl = posterAttachment?.url || supabaseEvent.poster_url || undefined;

  return {
    id: supabaseEvent.id,
    title: supabaseEvent.title,
    description: supabaseEvent.description || '',
    date: new Date(supabaseEvent.date),
    location: supabaseEvent.location || '',
    posterUrl,
    attachments: attachments.length > 0 ? attachments : undefined,
    category: supabaseEvent.category || undefined,
    tags: supabaseEvent.tags || [],
    status: supabaseEvent.status,
    recurrence,
    rsvpEnabled: supabaseEvent.rsvp_enabled || false,
    maxAttendees: supabaseEvent.max_attendees || undefined,
    attendees: attendees.length > 0 ? attendees : undefined,
    comments: comments.length > 0 ? comments : undefined,
    history: history.length > 0 ? history : undefined,
    creatorId: supabaseEvent.creator_id,
    createdAt: new Date(supabaseEvent.created_at)
  };
};

export const getEvents = async (): Promise<Event[]> => {
  const { data: eventsData, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    throw new Error(error.message || 'Failed to fetch events');
  }

  if (!eventsData || eventsData.length === 0) {
    return [];
  }

  // Преобразуем все события
  const events = await Promise.all(eventsData.map(mapSupabaseEventToEvent));
  return events;
};

export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt'>, userId: string, userName: string): Promise<Event> => {
  // Подготавливаем данные для вставки в БД
  const eventInsert = {
    title: eventData.title,
    description: eventData.description || null,
    date: eventData.date.toISOString(),
    location: eventData.location || null,
    poster_url: eventData.posterUrl || null,
    status: eventData.status,
    category: eventData.category || null,
    tags: eventData.tags || [],
    recurrence_type: eventData.recurrence?.type || 'none',
    recurrence_interval: eventData.recurrence?.interval || null,
    recurrence_end_date: eventData.recurrence?.endDate ? eventData.recurrence.endDate.toISOString() : null,
    recurrence_occurrences: eventData.recurrence?.occurrences || null,
    recurrence_days_of_week: eventData.recurrence?.daysOfWeek || null,
    rsvp_enabled: eventData.rsvpEnabled || false,
    max_attendees: eventData.maxAttendees || null,
    creator_id: userId
  };

  const { data: newEventData, error: eventError } = await supabase
    .from('events')
    .insert(eventInsert)
    .select()
    .single();

  if (eventError || !newEventData) {
    console.error('Error creating event:', eventError);
    throw new Error(eventError?.message || 'Failed to create event');
  }

  // Если есть attachments, сохраняем их
  if (eventData.attachments && eventData.attachments.length > 0) {
    const attachmentsInsert = eventData.attachments.map(att => ({
      event_id: newEventData.id,
      name: att.name,
      url: att.url,
      type: att.type,
      size: att.size,
      uploaded_by: userId
    }));

    const { error: attachmentsError } = await supabase
      .from('event_attachments')
      .insert(attachmentsInsert);

    if (attachmentsError) {
      console.error('Error creating attachments:', attachmentsError);
      // Не прерываем создание события, только логируем ошибку
    }
  }

  // История создается автоматически через триггер, но можем убедиться
  // Преобразуем обратно в Event формат
  const createdEvent = await mapSupabaseEventToEvent(newEventData);
  return createdEvent;
};

export const updateEvent = async (id: string, eventData: Omit<Event, 'id' | 'createdAt'>, userId: string, userName: string): Promise<Event> => {
  // Сначала получаем старое событие для отслеживания изменений
  const { data: oldEventData, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !oldEventData) {
    throw new Error('Event not found');
  }

  // Определяем изменения
  const changes: Record<string, { old: any; new: any }> = {};
  if (eventData.title !== oldEventData.title) changes.title = { old: oldEventData.title, new: eventData.title };
  if (eventData.description !== oldEventData.description) changes.description = { old: oldEventData.description || '', new: eventData.description || '' };
  if (eventData.location !== oldEventData.location) changes.location = { old: oldEventData.location || '', new: eventData.location || '' };
  if (eventData.status !== oldEventData.status) changes.status = { old: oldEventData.status, new: eventData.status };
  if (eventData.category !== oldEventData.category) changes.category = { old: oldEventData.category || null, new: eventData.category || null };

  // Подготавливаем данные для обновления
  const eventUpdate = {
    title: eventData.title,
    description: eventData.description || null,
    date: eventData.date.toISOString(),
    location: eventData.location || null,
    poster_url: eventData.posterUrl || null,
    status: eventData.status,
    category: eventData.category || null,
    tags: eventData.tags || [],
    recurrence_type: eventData.recurrence?.type || 'none',
    recurrence_interval: eventData.recurrence?.interval || null,
    recurrence_end_date: eventData.recurrence?.endDate ? eventData.recurrence.endDate.toISOString() : null,
    recurrence_occurrences: eventData.recurrence?.occurrences || null,
    recurrence_days_of_week: eventData.recurrence?.daysOfWeek || null,
    rsvp_enabled: eventData.rsvpEnabled || false,
    max_attendees: eventData.maxAttendees || null
  };

  const { data: updatedEventData, error: updateError } = await supabase
    .from('events')
    .update(eventUpdate)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updatedEventData) {
    console.error('Error updating event:', updateError);
    throw new Error(updateError?.message || 'Failed to update event');
  }

  // Создаем запись в истории изменений
  const action = eventData.status === 'cancelled' && oldEventData.status !== 'cancelled' 
    ? 'status_changed' 
    : 'updated';

  const { error: historyError } = await supabase
    .from('event_history')
    .insert({
      event_id: id,
      user_id: userId,
      user_name: userName,
      action: action,
      changes: Object.keys(changes).length > 0 ? changes : null
    });

  if (historyError) {
    console.error('Error creating history entry:', historyError);
    // Не прерываем обновление события, только логируем ошибку
  }

  // Если есть новые attachments, добавляем их
  if (eventData.attachments && eventData.attachments.length > 0) {
    // Получаем существующие attachments
    const { data: existingAttachments } = await supabase
      .from('event_attachments')
      .select('id, url')
      .eq('event_id', id);

    const existingUrls = new Set(existingAttachments?.map(att => att.url) || []);

    // Добавляем только новые attachments
    const newAttachments = eventData.attachments.filter(att => !existingUrls.has(att.url));
    
    if (newAttachments.length > 0) {
      const attachmentsInsert = newAttachments.map(att => ({
        event_id: id,
        name: att.name,
        url: att.url,
        type: att.type,
        size: att.size,
        uploaded_by: userId
      }));

      const { error: attachmentsError } = await supabase
        .from('event_attachments')
        .insert(attachmentsInsert);

      if (attachmentsError) {
        console.error('Error creating attachments:', attachmentsError);
        // Не прерываем обновление события
      }
    }
  }

  // Преобразуем обратно в Event формат
  const updatedEvent = await mapSupabaseEventToEvent(updatedEventData);
  return updatedEvent;
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
  // Сначала проверяем, существует ли событие
  const { data: eventData, error: fetchError } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !eventData) {
    throw new Error('Event not found');
  }

  // Удаляем событие (каскадное удаление удалит связанные записи автоматически)
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting event:', deleteError);
    throw new Error(deleteError.message || 'Failed to delete event');
  }
};

export const addComment = async (eventId: string, userId: string, userName: string, content: string): Promise<Event> => {
  // Проверяем, существует ли событие
  const { data: eventData, error: fetchError } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .single();

  if (fetchError || !eventData) {
    throw new Error('Event not found');
  }

  // Добавляем комментарий
  const { data: commentData, error: commentError } = await supabase
    .from('event_comments')
    .insert({
      event_id: eventId,
      user_id: userId,
      user_name: userName,
      content: content
    })
    .select()
    .single();

  if (commentError || !commentData) {
    console.error('Error adding comment:', commentError);
    throw new Error(commentError?.message || 'Failed to add comment');
  }

  // Получаем обновленное событие со всеми данными
  const { data: updatedEventData, error: eventFetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventFetchError || !updatedEventData) {
    throw new Error('Failed to fetch updated event');
  }

  const updatedEvent = await mapSupabaseEventToEvent(updatedEventData);
  return updatedEvent;
};
