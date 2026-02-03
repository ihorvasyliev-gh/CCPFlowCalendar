import React, { Suspense, lazy, useMemo } from 'react';
import Navbar from './components/Navbar';
import CalendarView from './components/CalendarView';
import LoginPage from './pages/LoginPage';
import SearchBar from './components/SearchBar';
import EventFiltersComponent from './components/EventFilters';
import ErrorBoundary from './components/ErrorBoundary';
import { CalendarDaySkeleton } from './components/SkeletonLoader';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserRole } from './types';
import { useSession } from './hooks/useSession';
import { useEvents } from './hooks/useEvents';
import { useFilters } from './hooks/useFilters';
import { useEventHandlers } from './hooks/useEventHandlers';
import BottomNavigation from './components/BottomNavigation';
import { useMedia } from './hooks/useMedia';
import { expandRecurringEvents } from './utils/recurrence';

const EventModal = lazy(() => import('./components/EventModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const { user, isSessionLoading, handleLogin, handleLogout } = useSession();
  const isMobile = useMedia('(max-width: 640px)');

  const {
    events,
    setEvents,
    loadingEvents,
    refreshEvents,
    recurrenceExceptions,
    setRecurrenceExceptions,
    userRsvpEventIds,
    setUserRsvpEventIds,
    availableLocations,
    availableCreators,
  } = useEvents(user, showToast);

  const { searchQuery, setSearchQuery, filters, setFilters, filteredEvents } = useFilters(
    events,
    user?.role
  );

  const {
    isModalOpen,
    selectedEvent,
    createWithDate,
    isExportModalOpen,
    setIsExportModalOpen,
    handleEventClick,
    handleCreateClick,
    handleAddEventForDate,
    handleSaveEvent,
    handleUpdateEvent,
    handleCloseModal,
    handleEventUpdate,
    handleDeleteInstance,
    handleDeleteEvent,
    handlePrefetchMonth,
    handleExportClick,
  } = useEventHandlers(
    user,
    events,
    setEvents,
    setRecurrenceExceptions,
    setUserRsvpEventIds,
    showToast
  );

  // Expanded upcoming events for NotificationCenter (per-occurrence RSVP)
  const upcomingExpandedEvents = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    end.setHours(23, 59, 59, 999);
    return expandRecurringEvents(filteredEvents, start, end, recurrenceExceptions);
  }, [filteredEvents, recurrenceExceptions]);

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

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
        onRefresh={() => refreshEvents(true)}
        events={upcomingExpandedEvents}
        userRsvpEventIds={userRsvpEventIds}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            onAddEventForDate={user.role === UserRole.ADMIN ? handleAddEventForDate : undefined}
            recurrenceExceptions={recurrenceExceptions}
            userRole={user.role}
          />
        )}
      </main>

      {isModalOpen && (
        <Suspense fallback={null}>
          <EventModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            event={selectedEvent}
            initialDate={createWithDate}
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

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto py-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 dark:text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Cork City Partnership. Internal Use Only.
        </div>
      </footer>

      {isMobile && (
        <BottomNavigation
          user={user}
          onHomeClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          onCreateClick={handleCreateClick}
          onProfileClick={() => showToast('Profile settings coming soon', 'info')}
          activeTab="home"
        />
      )}
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
