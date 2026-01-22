import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import CalendarView from './components/CalendarView';
import LoginPage from './pages/LoginPage';
import SearchBar from './components/SearchBar';
import EventFiltersComponent from './components/EventFilters';
import ErrorBoundary from './components/ErrorBoundary';
import { CalendarDaySkeleton } from './components/SkeletonLoader';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { User, Event, EventFilters } from './types';
import { getEvents, createEvent, updateEvent, deleteEvent, deleteRecurrenceInstance, getRecurrenceExceptions } from './services/eventService';
import { logout as logoutService, getCurrentUser } from './services/authService';
import { supabase } from './lib/supabase';
import { filterEvents } from './utils/filterEvents';
import { getCachedUser, cacheUser, clearUserCache, hasValidSession } from './utils/sessionCache';
import { getCachedEvents, cacheEvents, clearEventsCache } from './utils/eventsCache';
import { clearRecurrenceCache } from './utils/recurrence';

// Lazy load modals for code splitting
const EventModal = lazy(() => import('./components/EventModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  // Global State
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [recurrenceExceptions, setRecurrenceExceptions] = useState<Map<string, Date[]>>(new Map());

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EventFilters>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Session restoration - мгновенное восстановление из кэша
  const userIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Функция для загрузки профиля пользователя с сервера
    const fetchUserProfileFromServer = async (uid: string): Promise<User | null> => {
      try {
        const currentUser = await getCurrentUser(uid);
        if (currentUser && isMounted) {
          userIdRef.current = currentUser.id;
          setUser(currentUser);
          return currentUser;
        }
        return null;
      } catch (error) {
        console.error('Error fetching user profile from server:', error);
        return null;
      }
    };

    // Функция для синхронного восстановления сессии
    const restoreSessionSync = (): void => {
      // Шаг 1: Пытаемся восстановить пользователя из кэша (синхронно, мгновенно)
      const cachedUser = getCachedUser();
      if (cachedUser) {
        // Пользователь найден в кэше - восстанавливаем мгновенно
        userIdRef.current = cachedUser.id;
        setUser(cachedUser);

        // В фоне проверяем и обновляем данные пользователя с сервера
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (!isMounted || error || !session) {
            // Сессия невалидна - очищаем кэш и состояние
            if (isMounted) {
              clearUserCache();
              setUser(null);
            }
            return;
          }

          // Обновляем данные пользователя в фоне (не блокируем UI)
          fetchUserProfileFromServer(session.user.id).then((freshUser) => {
            if (freshUser && isMounted) {
              console.log('User data refreshed from server:', freshUser.email);
            }
          });
        });
        return;
      }

      // Шаг 2: Кэша нет - проверяем сессию через Supabase (асинхронно)
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!isMounted) return;

        if (session && !error) {
          // Сессия есть - загружаем пользователя с сервера
          fetchUserProfileFromServer(session.user.id);
        }
      });
    };

    // Запускаем синхронное восстановление сессии
    restoreSessionSync();

    // Подписываемся на изменения auth state для будущих обновлений
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Пользователь вошел или токен обновлен
        if (session) {
          await fetchUserProfileFromServer(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        // Пользователь вышел
        userIdRef.current = null;
        setUser(null);
        setEvents([]);
        clearUserCache();
        clearEventsCache();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Initial Load of Events: показываем кэш сразу, затем обновляем в фоне
  useEffect(() => {
    if (!user) return;

    const cached = getCachedEvents();
    if (cached && cached.length > 0) {
      setEvents(cached);
      setLoadingEvents(false);
    } else {
      setLoadingEvents(true);
    }

    // Background sync using requestIdleCallback for non-blocking updates
    const syncEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(data);
        cacheEvents(data);
        
        // Load recurrence exceptions for recurring events
        const recurringEventIds = data
          .filter(e => e.recurrence && e.recurrence.type !== 'none')
          .map(e => e.id);
        
        if (recurringEventIds.length > 0) {
          const exceptionsMap = new Map<string, Date[]>();
          await Promise.all(
            recurringEventIds.map(async (eventId) => {
              try {
                const exceptions = await getRecurrenceExceptions(eventId);
                if (exceptions.length > 0) {
                  exceptionsMap.set(eventId, exceptions);
                }
              } catch (err) {
                console.error(`Error loading exceptions for event ${eventId}:`, err);
              }
            })
          );
          setRecurrenceExceptions(exceptionsMap);
        }
      } catch (error) {
        console.error('Error loading events:', error);
        // Only show error if no cached data exists
        if (!cached || cached.length === 0) {
          showToast('Failed to load events', 'error');
        }
      } finally {
        setLoadingEvents(false);
      }
    };

    // Use requestIdleCallback if available, otherwise use setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(syncEvents, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(syncEvents, 100);
    }
  }, [user, showToast]);

  // Background periodic sync (every 2 minutes) when user is active
  useEffect(() => {
    if (!user) return;

    const syncInterval = setInterval(() => {
      // Only sync if page is visible and not in background
      if (document.visibilityState === 'visible') {
        const syncEvents = async () => {
          try {
            const data = await getEvents();
            setEvents((prev) => {
              // Only update if data actually changed
              const prevIds = prev.map(e => e.id).sort().join(',');
              const newIds = data.map(e => e.id).sort().join(',');
              if (prevIds !== newIds) {
                cacheEvents(data);
                return data;
              }
              return prev;
            });
            
            // Update recurrence exceptions
            const recurringEventIds = data
              .filter(e => e.recurrence && e.recurrence.type !== 'none')
              .map(e => e.id);
            
            if (recurringEventIds.length > 0) {
              const exceptionsMap = new Map<string, Date[]>();
              await Promise.all(
                recurringEventIds.map(async (eventId) => {
                  try {
                    const exceptions = await getRecurrenceExceptions(eventId);
                    if (exceptions.length > 0) {
                      exceptionsMap.set(eventId, exceptions);
                    }
                  } catch (err) {
                    console.error(`Error loading exceptions for event ${eventId}:`, err);
                  }
                })
              );
              setRecurrenceExceptions(exceptionsMap);
            }
          } catch (error) {
            console.error('Background sync error:', error);
            // Silent fail for background sync
          }
        };

        if ('requestIdleCallback' in window) {
          requestIdleCallback(syncEvents, { timeout: 5000 });
        } else {
          setTimeout(syncEvents, 100);
        }
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    return () => clearInterval(syncInterval);
  }, [user]);

  // Auth Handlers - memoized callbacks
  const handleLogin = useCallback((loggedInUser: User) => {
    // Кэшируем пользователя при логине
    cacheUser(loggedInUser);
    setUser(loggedInUser);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutService();
    clearUserCache();
    clearEventsCache();
    setUser(null);
  }, []);

  // Event Handlers - memoized callbacks
  const handleEventClick = useCallback((event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback(async (eventData: Omit<Event, 'id' | 'createdAt'>) => {
    if (!user) return;
    
    // Optimistic update: create event immediately with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticEvent: Event = {
      ...eventData,
      id: tempId,
      createdAt: new Date(),
      creatorId: user.id,
      attendees: undefined,
      comments: undefined,
      history: undefined,
      attachments: eventData.attachments || undefined
    };
    
    // Update UI immediately
    setEvents((prev) => {
      const next = [...prev, optimisticEvent];
      cacheEvents(next);
      return next;
    });
    
    // Close modal immediately for better UX
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 200);
    
    // Sync with server in background
    try {
      const serverEvent = await createEvent(eventData, user.id, user.fullName);
      // Replace temporary event with server response
      setEvents((prev) => {
        const next = prev.map(e => e.id === tempId ? serverEvent : e);
        cacheEvents(next);
        return next;
      });
      showToast('Event created successfully', 'success');
    } catch (e) {
      console.error("Error saving event", e);
      // Rollback optimistic update on error
      setEvents((prev) => {
        const next = prev.filter(e => e.id !== tempId);
        cacheEvents(next);
        return next;
      });
      showToast('Failed to create event', 'error');
      // Reopen modal with previous data on error
      setIsModalOpen(true);
      setSelectedEvent(null);
      throw e;
    }
  }, [user, showToast]);

  const handleUpdateEvent = useCallback(async (id: string, eventData: Omit<Event, 'id' | 'createdAt'>) => {
    if (!user) return;
    
    // Find original event for rollback
    const originalEvent = events.find(e => e.id === id);
    if (!originalEvent) {
      throw new Error('Event not found');
    }
    
    // Optimistic update: update event immediately
    const optimisticEvent: Event = {
      ...originalEvent,
      ...eventData,
      id: id,
      creatorId: originalEvent.creatorId,
      createdAt: originalEvent.createdAt
    };
    
    // Update UI immediately
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? optimisticEvent : e));
      cacheEvents(next);
      return next;
    });
    setSelectedEvent(prev => prev?.id === id ? optimisticEvent : prev);
    
    // Close modal immediately for better UX
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 200);
    
    // Sync with server in background
    try {
      const serverEvent = await updateEvent(id, eventData, user.id, user.fullName);
      // Replace optimistic event with server response
      setEvents((prev) => {
        const next = prev.map((e) => (e.id === id ? serverEvent : e));
        cacheEvents(next);
        return next;
      });
      showToast('Event updated successfully', 'success');
    } catch (e) {
      console.error("Error updating event", e);
      // Rollback optimistic update on error
      setEvents((prev) => {
        const next = prev.map((e) => (e.id === id ? originalEvent : e));
        cacheEvents(next);
        return next;
      });
      setSelectedEvent(prev => prev?.id === id ? originalEvent : prev);
      showToast('Failed to update event', 'error');
      // Reopen modal with original data on error
      setIsModalOpen(true);
      setSelectedEvent(originalEvent);
      throw e;
    }
  }, [user, showToast, events]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 200); // Clear after animation
  }, []);

  const handleEventUpdate = useCallback((updatedEvent: Event) => {
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
      cacheEvents(next);
      return next;
    });
    setSelectedEvent(prev => prev?.id === updatedEvent.id ? updatedEvent : prev);
  }, []);

  const handleDeleteInstance = useCallback(async (eventId: string, instanceDate: Date) => {
    if (!user) return;
    
    // Обновляем исключения
    setRecurrenceExceptions((prev) => {
      const next = new Map(prev);
      const exceptions = next.get(eventId) || [];
      const normalizedDate = new Date(instanceDate);
      normalizedDate.setHours(0, 0, 0, 0);
      
      // Добавляем исключение, если его еще нет
      if (!exceptions.some(d => {
        const dNormalized = new Date(d);
        dNormalized.setHours(0, 0, 0, 0);
        return dNormalized.getTime() === normalizedDate.getTime();
      })) {
        next.set(eventId, [...exceptions, normalizedDate]);
      }
      return next;
    });
    
    // Очищаем кэш повторений
    clearRecurrenceCache();
    
    showToast('Event instance deleted', 'success');
  }, [user, showToast]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!user) return;
    
    // Find the event to determine if it's recurring
    const eventToDelete = events.find(e => e.id === id);
    if (!eventToDelete) {
      showToast('Event not found', 'error');
      return;
    }
    
    // Optimistic update: remove event immediately
    setEvents((prev) => {
      const next = prev.filter(e => e.id !== id);
      cacheEvents(next);
      return next;
    });
    
    // Clear recurrence cache
    clearRecurrenceCache();
    
    // Close modal if it's open for this event
    if (selectedEvent?.id === id) {
      setIsModalOpen(false);
      setTimeout(() => setSelectedEvent(null), 200);
    }
    
    // Sync with server in background
    try {
      await deleteEvent(id, user.id, user.fullName);
      showToast('Event deleted successfully', 'success');
      
      // Reload exceptions if it was a recurring event
      if (eventToDelete.recurrence && eventToDelete.recurrence.type !== 'none') {
        setRecurrenceExceptions((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (e) {
      console.error("Error deleting event", e);
      // Rollback optimistic update on error
      setEvents((prev) => {
        const next = [...prev, eventToDelete];
        cacheEvents(next);
        return next;
      });
      showToast('Failed to delete event', 'error');
    }
  }, [user, events, selectedEvent, showToast]);

  // Prefetch events for a specific month (for smooth navigation)
  const handlePrefetchMonth = useCallback((date: Date) => {
    // Prefetch in background using requestIdleCallback
    const prefetchEvents = () => {
      getEvents()
        .then((data) => {
          // Cache the prefetched events
          cacheEvents(data);
        })
        .catch((error) => {
          console.error('Prefetch error:', error);
          // Silent fail for prefetch
        });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchEvents, { timeout: 3000 });
    } else {
      setTimeout(prefetchEvents, 500);
    }
  }, []);

  const handleExportClick = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, { ...filters, search: searchQuery }, user?.role);
  }, [events, filters, searchQuery, user?.role]);

  // Extract unique values for filters
  const availableLocations = useMemo(() => {
    return Array.from(new Set(events.map(e => e.location))).sort();
  }, [events]);

  const availableCreators = useMemo(() => {
    const creatorMap = new Map<string, string>();
    events.forEach(e => {
      if (!creatorMap.has(e.creatorId)) {
        // In a real app, we'd fetch user names from a service
        creatorMap.set(e.creatorId, `Creator ${e.creatorId}`);
      }
    });
    return Array.from(creatorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  // Render Logic - always show content immediately (cache loads instantly)
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onAddEventClick={handleCreateClick}
        onExportClick={handleExportClick}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <EventFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            availableLocations={availableLocations}
            availableCreators={availableCreators}
          />
        </div>

        {loadingEvents ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="grid grid-cols-7 gap-2 lg:gap-4">
              {Array.from({ length: 35 }).map((_, idx) => (
                <CalendarDaySkeleton key={idx} />
              ))}
            </div>
          </div>
        ) : (
          <CalendarView 
            events={filteredEvents} 
            onEventClick={handleEventClick}
            onPrefetchMonth={handlePrefetchMonth}
            recurrenceExceptions={recurrenceExceptions}
          />
        )}
      </main>

      {isModalOpen && (
        <Suspense fallback={null}>
          <EventModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            event={selectedEvent}
            role={user.role}
            currentUserId={user.id}
            currentUserName={user.fullName}
            onSave={handleSaveEvent}
            onUpdate={handleUpdateEvent}
            onEventUpdate={handleEventUpdate}
            onDelete={handleDeleteEvent}
            onDeleteInstance={handleDeleteInstance}
          />
        </Suspense>
      )}

      {isExportModalOpen && (
        <Suspense fallback={null}>
          <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            events={filteredEvents}
          />
        </Suspense>
      )}

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Cork City Partnership. Internal Use Only.
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
