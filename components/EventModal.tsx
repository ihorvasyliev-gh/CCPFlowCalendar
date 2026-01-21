import React, { useState, useRef, useEffect } from 'react';
import { Event, UserRole, EventCategory, EventStatus, Attachment } from '../types';
import { X, MapPin, Clock, Calendar as CalendarIcon, Download, Upload, Loader2, Pencil, Tag, Users, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '../utils/date';
import { uploadPosterToR2, uploadAttachment, addComment } from '../services/eventService';
import { rsvpToEvent, cancelRsvp, hasUserRsvped } from '../services/rsvpService';
import EventComments from './EventComments';
import EventHistory from './EventHistory';
import { validateEvent } from '../utils/validation';

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
  const [userHasRsvped, setUserHasRsvped] = useState(false);

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
        setAttachments(event.attachments || []);
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
        setIsEditing(false); // Reset to view mode initially
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
        setUserHasRsvped(false);
        setIsEditing(false);
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
      for (const file of newAttachments) {
        const attachment = await uploadAttachment(file);
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
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background Overlay */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          
          {/* Header */}
          <div className="bg-slate-50 px-4 py-3 sm:px-6 flex justify-between items-center border-b border-gray-100">
            <h3 className="text-lg leading-6 font-semibold text-gray-900" id="modal-title">
              {isCreating ? 'Create New Event' : (isEditing ? 'Edit Event' : 'Event Details')}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            
            {/* VIEW MODE (When event exists and NOT editing) */}
            {!showForm && event ? (
              <div className="space-y-4">
                {/* Status and Category Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {event.status === 'cancelled' && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Cancelled</span>
                  )}
                  {event.status === 'draft' && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Draft</span>
                  )}
                  {event.category && (
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      event.category === 'meeting' ? 'bg-blue-100 text-blue-800' :
                      event.category === 'workshop' ? 'bg-purple-100 text-purple-800' :
                      event.category === 'social' ? 'bg-pink-100 text-pink-800' :
                      event.category === 'training' ? 'bg-green-100 text-green-800' :
                      event.category === 'community' ? 'bg-orange-100 text-orange-800' :
                      event.category === 'celebration' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.category}
                    </span>
                  )}
                </div>

                {/* Poster/Attachments */}
                {(event.posterUrl || (event.attachments && event.attachments.length > 0)) && (
                  <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
                    {event.posterUrl && (
                      <div className="relative group">
                        <img src={event.posterUrl} alt={event.title} className="w-full h-48 sm:h-64 object-cover" />
                        <a href={event.posterUrl} download className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity text-gray-700" title="Download Poster">
                          <Download className="h-5 w-5" />
                        </a>
                      </div>
                    )}
                    {event.attachments && event.attachments.length > 0 && (
                      <div className="p-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments</h4>
                        <div className="space-y-2">
                          {event.attachments.map((att, idx) => (
                            <a key={idx} href={att.url} download={att.name} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50">
                              <span className="text-sm text-gray-700 truncate">{att.name}</span>
                              <Download className="h-4 w-4 text-gray-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <h2 className={`text-2xl font-bold text-gray-900 ${
                    event.status === 'cancelled' ? 'line-through opacity-60' : 
                    event.status === 'draft' ? 'opacity-50' : ''
                  }`}>
                    {event.title}
                  </h2>
                  {role === UserRole.ADMIN && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                      title="Edit Event"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center text-gray-600 mt-2">
                  <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
                  <span>{formatDate(event.date)} at {formatTime(event.date)}</span>
                </div>
                
                <div className="flex items-center text-gray-600 mt-1">
                  <MapPin className="h-5 w-5 mr-2 text-red-500" />
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline transition-colors"
                    title="Open in Google Maps"
                  >
                    {event.location}
                  </a>
                </div>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex items-center flex-wrap gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    {event.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 prose prose-sm text-gray-600 bg-slate-50 p-4 rounded-md">
                  <p>{event.description}</p>
                </div>

                {/* RSVP Section */}
                {event.rsvpEnabled && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          Attendees
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {event.attendees?.length || 0}
                          {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attending
                        </p>
                      </div>
                      <button
                        onClick={handleRsvp}
                        disabled={isRsvping || (event.maxAttendees && (event.attendees?.length || 0) >= event.maxAttendees && !userHasRsvped)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          userHasRsvped
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isRsvping ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : userHasRsvped ? (
                          <>
                            <XCircle className="h-4 w-4 inline mr-1" />
                            Cancel RSVP
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 inline mr-1" />
                            RSVP
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-2">
                  <button 
                    onClick={handleAddToCalendar}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add to Calendar (Google)
                  </button>
                </div>

                {/* Comments Section */}
                {event.comments !== undefined && (
                  <EventComments
                    comments={event.comments || []}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    onAddComment={handleAddComment}
                  />
                )}

                {/* History Section */}
                {event.history && event.history.length > 0 && (
                  <EventHistory history={event.history} />
                )}
              </div>
            ) : (
            // FORM MODE (Create OR Edit)
              <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Title</label>
                  <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g. Summer Picnic" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input required type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <input required type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input required type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g. Meeting Room A" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as EventCategory | '')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      <option value="">Select category</option>
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
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g. workshop, training, community" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Details about the event..." />
                </div>

                {/* RSVP Settings */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="rsvp-enabled"
                      checked={rsvpEnabled}
                      onChange={(e) => setRsvpEnabled(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="rsvp-enabled" className="text-sm font-medium text-gray-700">
                      Enable RSVP
                    </label>
                  </div>
                  {rsvpEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Attendees (optional)</label>
                      <input type="number" min="1" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value ? Number(e.target.value) : '')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Leave empty for unlimited" />
                    </div>
                  )}
                </div>

                {/* Poster Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Poster / Image (Optional)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="space-y-1 text-center">
                      {previewUrl ? (
                         <img src={previewUrl} className="mx-auto h-32 object-contain" alt="Preview" />
                      ) : (
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      )}
                      <div className="flex text-sm text-gray-600 justify-center">
                        <span className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                          {previewUrl ? 'Change file' : 'Upload a file'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Attachments</label>
                  {(attachments.length > 0 || newAttachments.length > 0) && (
                    <div className="mb-2 space-y-2">
                      {attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                          <span className="text-sm text-gray-700 truncate">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {newAttachments.map((file, idx) => (
                        <div key={`new-${idx}`} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeNewAttachment(idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4 inline mr-2" />
                    Add Attachment
                  </button>
                  <input ref={attachmentInputRef} type="file" className="hidden" multiple onChange={handleAttachmentChange} />
                </div>
              </form>
            )}

          </div>

          {/* Footer */}
          {showForm ? (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                form="event-form"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Save Changes' : 'Create Event'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false); // Go back to view mode
                  } else {
                    onClose();
                  }
                }}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            // View Mode Footer (just Cancel/Close is usually enough as Edit is in header/body, but let's keep it clean)
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
               <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;
