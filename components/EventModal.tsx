import React, { useState, useRef, useEffect } from 'react';
import { Event, UserRole, EventCategory, EventStatus, Attachment, EventComment, EventHistoryEntry } from '../types';
import { X, MapPin, Clock, Calendar as CalendarIcon, Download, Upload, Loader2, Pencil, Tag, Users, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '../utils/date';
import { uploadPosterToR2, uploadAttachment, addComment } from '../services/eventService';
import { rsvpToEvent, cancelRsvp, hasUserRsvped } from '../services/rsvpService';
import EventComments from './EventComments';
import EventHistory from './EventHistory';
import { validateEvent } from '../utils/validation';
import { useTheme } from '../contexts/ThemeContext';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null; // If null, we are in "Create Mode"
  role: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  onSave?: (eventData: Omit<Event, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate?: (id: string, eventData: Omit<Event, 'id' | 'createdAt'>) => Promise<void>;
  onEventUpdate?: (event: Event) => void; // For RSVP and comment updates
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, event, role, currentUserId = '1', currentUserName = 'User', onSave, onUpdate, onEventUpdate }) => {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRsvping, setIsRsvping] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [status, setStatus] = useState<EventStatus>('published');
  const [tags, setTags] = useState<string>('');
  const [rsvpEnabled, setRsvpEnabled] = useState(false);
  const [maxAttendees, setMaxAttendees] = useState<number | ''>('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  // Lazy loaded states
  const [comments, setComments] = useState<EventComment[]>([]);
  const [history, setHistory] = useState<EventHistoryEntry[]>([]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [userHasRsvped, setUserHasRsvped] = useState(false);

  // Recurrence State
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Determine if we are creating a new event from scratch
  const isCreating = !event;
  // Show form if we are creating OR editing
  const showForm = isCreating || isEditing;

  // Initialize form state when opening or switching modes
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // We have an event (View/Edit mode)
        setTitle(event.title);
        setDescription(event.description);
        setLocation(event.location);
        setCategory(event.category || '');
        setStatus(event.status || 'published');
        setTags(event.tags?.join(', ') || '');
        setRsvpEnabled(event.rsvpEnabled || false);
        setMaxAttendees(event.maxAttendees || '');
        setPreviewUrl(event.posterUrl || null);

        // Initial values from props (might be incomplete if lazy loaded)
        setAttachments(event.attachments || []);
        setComments(event.comments || []);
        setHistory(event.history || []);
        setAttendees(event.attendees || []);
        setUserHasRsvped(hasUserRsvped(event.id, currentUserId));

        // Format Date for Input (YYYY-MM-DD)
        const yyyy = event.date.getFullYear();
        const mm = String(event.date.getMonth() + 1).padStart(2, '0');
        const dd = String(event.date.getDate()).padStart(2, '0');
        setDateStr(`${yyyy}-${mm}-${dd}`);

        // Format Time for Input (HH:MM)
        const hh = String(event.date.getHours()).padStart(2, '0');
        const min = String(event.date.getMinutes()).padStart(2, '0');
        setTimeStr(`${hh}:${min}`);

        setPosterFile(null);
        setNewAttachments([]);

        // Load Recurrence Data
        if (event.recurrence) {
          setRecurrenceType(event.recurrence.type as any);
          setRecurrenceInterval(event.recurrence.interval || 1);
          setRecurrenceEndDate(event.recurrence.endDate ? event.recurrence.endDate.toISOString().split('T')[0] : '');
        } else {
          setRecurrenceType('none');
          setRecurrenceInterval(1);
          setRecurrenceEndDate('');
        }

        setIsEditing(false); // Reset to view mode initially

        // LAZY LOAD: If details are missing, fetch them
        const needsLoading = !event.comments || !event.history || !event.attachments || !event.attendees;
        if (needsLoading) {
          setLoadingDetails(true);
          import('../services/eventService').then(({ fetchEventDetails }) => {
            fetchEventDetails(event.id).then(details => {
              if (details.attachments) setAttachments(details.attachments);
              if (details.comments) setComments(details.comments);
              if (details.history) setHistory(details.history);
              if (details.attendees) {
                setAttendees(details.attendees);
                // Re-check RSVP status with fresh attendees list
                setUserHasRsvped(details.attendees.includes(currentUserId));
              }
            }).catch(err => console.error("Failed to load event details", err))
              .finally(() => setLoadingDetails(false));
          });
        }

      } else {
        // Create Mode
        setTitle('');
        setDescription('');
        setDateStr('');
        setTimeStr('');
        setLocation('');
        setCategory('');
        setStatus('draft');
        setTags('');
        setRsvpEnabled(false);
        setMaxAttendees('');
        setPosterFile(null);
        setPreviewUrl(null);
        setAttachments([]);
        setNewAttachments([]);
        setComments([]);
        setHistory([]);
        setAttendees([]);
        setUserHasRsvped(false);
        setIsEditing(false);
        // Reset Recurrence
        setRecurrenceType('none');
        setRecurrenceInterval(1);
        setRecurrenceEndDate('');
      }
    }
  }, [isOpen, event, currentUserId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPosterFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const dateTime = new Date(`${dateStr}T${timeStr}`);
    const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const eventData = {
      title,
      description,
      location,
      date: dateTime,
      category: category || undefined,
      status: status || 'published',
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      rsvpEnabled,
      maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      recurrence: recurrenceType !== 'none' ? {
        type: recurrenceType,
        interval: recurrenceInterval,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      } : undefined
    };

    const validationErrors = validateEvent(eventData);
    if (validationErrors.length > 0) {
      alert(validationErrors.map(e => `${e.field}: ${e.message}`).join('\n'));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      let posterUrl = event?.posterUrl; // Default to existing URL if editing

      // Upload to R2 if a new file is selected
      if (posterFile) {
        posterUrl = await uploadPosterToR2(posterFile);
      }

      // Upload new attachments
      const uploadedAttachments: Attachment[] = [];
      const attachment = await uploadAttachment(file) as Attachment;
      uploadedAttachments.push(attachment);
    }

      const eventData = {
      title,
      description,
      location,
      date: dateTime,
      posterUrl,
      category: category || undefined,
      status: status || 'published',
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      rsvpEnabled,
      maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      attachments: [...attachments, ...uploadedAttachments],
      creatorId: event?.creatorId || currentUserId,
      recurrence: recurrenceType !== 'none' ? {
        type: recurrenceType,
        interval: recurrenceInterval,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      } : undefined
    };

    if (isCreating && onSave) {
      await onSave(eventData);
    } else if (isEditing && event && onUpdate) {
      await onUpdate(event.id, eventData);
    }

    onClose();
  } catch (err) {
    console.error(err);
    alert('Failed to save event');
  } finally {
    setIsSubmitting(false);
  }
};

const handleRsvp = async () => {
  if (!event) return;
  setIsRsvping(true);
  try {
    if (userHasRsvped) {
      await cancelRsvp(event.id, currentUserId);
      setUserHasRsvped(false);
      if (onEventUpdate && event) {
        const updatedEvent = { ...event, attendees: (event.attendees || []).filter(id => id !== currentUserId) };
        onEventUpdate(updatedEvent);
      }
    } else {
      await rsvpToEvent(event.id, currentUserId);
      setUserHasRsvped(true);
      if (onEventUpdate && event) {
        const updatedEvent = { ...event, attendees: [...(event.attendees || []), currentUserId] };
        onEventUpdate(updatedEvent);
      }
    }
  } catch (err) {
    console.error(err);
    alert('Failed to update RSVP');
  } finally {
    setIsRsvping(false);
  }
};

const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    const files = Array.from(e.target.files);
    setNewAttachments(prev => [...prev, ...files]);
  }
};

const removeAttachment = (index: number) => {
  setAttachments(prev => prev.filter((_, i) => i !== index));
};

const removeNewAttachment = (index: number) => {
  setNewAttachments(prev => prev.filter((_, i) => i !== index));
};

const handleAddComment = async (content: string) => {
  if (!event) return;
  try {
    const updatedEvent = await addComment(event.id, currentUserId, currentUserName, content);
    if (onEventUpdate) {
      onEventUpdate(updatedEvent);
    }
  } catch (err) {
    console.error('Failed to add comment', err);
    throw err;
  }
};

const handleAddToCalendar = () => {
  if (!event) return;
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.date.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(event.date.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&sf=true&output=xml`;
  window.open(googleUrl, '_blank');
};

return (
  <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:flex sm:items-center sm:p-0">

      {/* Transparent Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" aria-hidden="true" onClick={onClose}></div>

      <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      {/* Modal Panel - Minimalist */}
      <div className={`relative inline-block align-bottom rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full border border-white/20 animate-scale-in ${theme === 'dark' ? 'glass-panel-dark' : 'bg-white'}`}>

        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <h3 className={`text-lg font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} id="modal-title">
            {isCreating ? 'Create New Event' : (isEditing ? 'Edit Event' : 'Event Details')}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors focus:outline-none">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

          {/* VIEW MODE */}
          {!showForm && event ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {event.status === 'cancelled' && <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 rounded-full border border-red-100 dark:border-red-800">Cancelled</span>}
                  {event.status === 'draft' && <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full">Draft</span>}
                  {event.category && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${event.category === 'meeting' ? 'bg-blue-50 text-blue-700' :
                      event.category === 'workshop' ? 'bg-purple-50 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                      {event.category}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start gap-4">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} ${event.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>
                    {event.title}
                  </h2>
                  {role === UserRole.ADMIN && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-all"
                      title="Edit Event"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Poster & Attachments */}
              {(event.posterUrl || (event.attachments && event.attachments.length > 0)) && (
                <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                  {event.posterUrl && (
                    <div className="relative group">
                      <img src={event.posterUrl} alt={event.title} className="w-full h-56 object-cover" />
                      <a href={event.posterUrl} download className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all text-slate-700 hover:scale-105">
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  {event.attachments && event.attachments.length > 0 && (
                    <div className={`p-4 ${event.posterUrl ? 'border-t border-slate-100 dark:border-slate-800' : ''} bg-slate-50/50 dark:bg-slate-800/30`}>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Attachments</h4>
                      <div className="grid gap-2">
                        {event.attachments.map((att, idx) => (
                          <a key={idx} href={att.url} download={att.name} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-brand-200 transition-colors group">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{att.name}</span>
                            <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <CalendarIcon className="h-5 w-5 mr-3 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Date & Time</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatDate(event.date)} at {formatTime(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <MapPin className="h-5 w-5 mr-3 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Location</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-brand-600 truncate block">
                      {event.location}
                    </a>
                  </div>
                </div>
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <Tag className="w-3 h-3 mr-1.5 opacity-50" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="prose prose-sm max-w-none text-slate-600 dark:text-slate-300">
                <p className="whitespace-pre-line leading-relaxed">{event.description}</p>
              </div>

              {/* RSVP Section */}
              {event.rsvpEnabled && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-500" /> RSVP Status
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {attendees.length} {event.maxAttendees ? `/ ${event.maxAttendees}` : ''} attending
                      </p>
                    </div>
                    <button
                      onClick={handleRsvp}
                      disabled={isRsvping || (event.maxAttendees && attendees.length >= event.maxAttendees && !userHasRsvped)}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all active:scale-95 ${userHasRsvped
                        ? 'bg-white text-red-600 border border-red-100 hover:bg-red-50'
                        : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isRsvping ? <Loader2 className="h-4 w-4 animate-spin" /> : userHasRsvped ? 'Cancel RSVP' : 'Join Event'}
                    </button>
                  </div>
                </div>
              )}

              <button onClick={handleAddToCalendar} className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Add to Google Calendar
              </button>

              {loadingDetails && (
                <div className="flex justify-center p-4">
                  <Loader2 className="animate-spin h-5 w-5 text-slate-400" />
                </div>
              )}

              <EventComments comments={comments} currentUserId={currentUserId} currentUserName={currentUserName} onAddComment={handleAddComment} />
              {history.length > 0 && <EventHistory history={history} />}
            </div>
          ) : (
            // FORM MODE
            <form id="event-form" onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Event Title</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium placeholder-slate-400" placeholder="e.g. Summer Strategy Meeting" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                  <input required type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Time</label>
                  <input required type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input required type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="block w-full pl-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" placeholder="Conference Room A" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as EventCategory | '')} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
                    <option value="">Select...</option>
                    <option value="meeting">Meeting</option>
                    <option value="workshop">Workshop</option>
                    <option value="social">Social</option>
                    <option value="training">Training</option>
                    <option value="community">Community</option>
                    <option value="celebration">Celebration</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {role === UserRole.ADMIN && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none" placeholder="Enter event details..." />
              </div>

              {/* File Uploads Section simplified */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Poster Image</label>
                <div onClick={() => fileInputRef.current?.click()} className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                  {previewUrl ? <img src={previewUrl} className="h-32 mx-auto object-contain rounded-lg" /> : <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />}
                  <span className="text-xs text-brand-600 font-bold">{previewUrl ? 'Change Image' : 'Click to Upload'}</span>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              {/* Recurrence Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">RECURRENCE</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Repeat</label>
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value as any)}
                      className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  {recurrenceType !== 'none' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Interval (Every X)</label>
                        <input
                          type="number"
                          min="1"
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                          className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">End Date</label>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-slate-100 dark:border-slate-800">
          {showForm ? (
            <>
              <button type="submit" form="event-form" disabled={isSubmitting} className="inline-flex justify-center rounded-lg px-5 py-2 bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50 text-sm">
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : (isEditing ? 'Save Changes' : 'Create Event')}
              </button>
              <button type="button" onClick={() => { isEditing ? setIsEditing(false) : onClose() }} disabled={isSubmitting} className="inline-flex justify-center rounded-lg px-5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 border border-slate-200 dark:border-slate-600 transition-all text-sm">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="inline-flex justify-center rounded-lg px-5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 border border-slate-200 dark:border-slate-600 transition-all text-sm">
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  </div>
};

export default EventModal;
