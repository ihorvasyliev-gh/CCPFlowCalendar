import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import CalendarView from './components/CalendarView';
import EventModal from './components/EventModal';
import LoginPage from './pages/LoginPage';
import SearchBar from './components/SearchBar';
import EventFiltersComponent from './components/EventFilters';
import ExportModal from './components/ExportModal';
import ErrorBoundary from './components/ErrorBoundary';
import { CalendarDaySkeleton } from './components/SkeletonLoader';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { User, Event, EventFilters } from './types';
import { getEvents, createEvent, updateEvent } from './services/eventService';
import { logout as logoutService, getCurrentUser } from './services/authService';
import { supabase } from './lib/supabase';
import { filterEvents } from './utils/filterEvents';

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  // Global State
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EventFilters>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Session restoration - get session immediately, then subscribe to changes
  const userIdRef = React.useRef<string | null>(null);
  const isInitializedRef = React.useRef(false);

  useEffect(() => {
    let isMounted = true;
    const initStartTime = performance.now();

    const fetchUserProfile = async (uid: string): Promise<boolean> => {
      // Skip if already loaded this user
      if (userIdRef.current === uid) {
        return true;
      }

      try {
        console.log('Fetching user details for:', uid);
        const currentUser = await getCurrentUser(uid);

        if (isMounted && currentUser) {
          userIdRef.current = currentUser.id;
          setUser(currentUser);
          console.log('User restored:', currentUser.email);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return false;
      }
    };

    const finishInitialization = () => {
      if (!isInitializedRef.current && isMounted) {
        isInitializedRef.current = true;
        setIsSessionLoading(false);
        console.log(`Session initialized in ${(performance.now() - initStartTime).toFixed(0)}ms`);
      }
    };

    // Get session immediately from localStorage (synchronous, no network delay)
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (session && !error) {
          // Session exists, restore user immediately
          await fetchUserProfile(session.user.id);
        }
        
        // Finish initialization regardless of whether session exists
        finishInitialization();
      } catch (error) {
        console.error('Error initializing session:', error);
        finishInitialization();
      }
    };

    // Initialize session immediately
    initializeSession();

    // Subscribe to auth state changes for future updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // User just logged in or token was refreshed
        if (session) {
          await fetchUserProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        userIdRef.current = null;
        setUser(null);
        setEvents([]);
        if (!isInitializedRef.current) {
          finishInitialization();
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Initial Load of Events
  useEffect(() => {
    if (user) {
      setLoadingEvents(true);
      getEvents()
        .then(data => {
          setEvents(data);
        })
        .catch(error => {
          console.error('Error loading events:', error);
          showToast('Failed to load events', 'error');
        })
        .finally(() => {
          setLoadingEvents(false);
        });
    }
  }, [user, showToast]);

  // Auth Handlers
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await logoutService();
    setUser(null);
  };

  // Event Handlers
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<Event, 'id' | 'createdAt'>) => {
    try {
      const newEvent = await createEvent(eventData, user.id, user.fullName);
      setEvents(prev => [...prev, newEvent]);
      showToast('Event created successfully', 'success');
    } catch (e) {
      console.error("Error saving event", e);
      showToast('Failed to create event', 'error');
      throw e;
    }
  };

  const handleUpdateEvent = async (id: string, eventData: Omit<Event, 'id' | 'createdAt'>) => {
    try {
      const updatedEvent = await updateEvent(id, eventData, user.id, user.fullName);
      setEvents(prev => prev.map(e => e.id === id ? updatedEvent : e));
      if (selectedEvent?.id === id) {
        setSelectedEvent(updatedEvent);
      }
      showToast('Event updated successfully', 'success');
    } catch (e) {
      console.error("Error updating event", e);
      showToast('Failed to update event', 'error');
      throw e;
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 200); // Clear after animation
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, { ...filters, search: searchQuery });
  }, [events, filters, searchQuery]);

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

  // Render Logic
  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onAddEventClick={handleCreateClick}
        onExportClick={() => setIsExportModalOpen(true)}
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
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-7 gap-2 lg:gap-4">
              {Array.from({ length: 35 }).map((_, idx) => (
                <CalendarDaySkeleton key={idx} />
              ))}
            </div>
          </div>
        ) : (
          <CalendarView events={filteredEvents} onEventClick={handleEventClick} />
        )}
      </main>

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        role={user.role}
        currentUserId={user.id}
        currentUserName={user.fullName}
        onSave={handleSaveEvent}
        onUpdate={handleUpdateEvent}
        onEventUpdate={(updatedEvent) => {
          setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
          if (selectedEvent?.id === updatedEvent.id) {
            setSelectedEvent(updatedEvent);
          }
        }}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        events={filteredEvents}
      />

      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
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
