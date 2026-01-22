import React, { useState, useMemo, useCallback } from 'react';
import { Event, ViewMode, EventCategory } from '../types';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, addMonths } from '../utils/date';
import { expandRecurringEvents } from '../utils/recurrence';
import { ChevronLeft, ChevronRight, Grid, List as ListIcon, MapPin, Clock, Tag } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onPrefetchMonth?: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick, onPrefetchMonth }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { theme } = useTheme();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  // Month navigation - memoized callbacks
  const nextMonth = useCallback(() => {
    setCurrentDate(prev => {
      const next = addMonths(prev, 1);
      // Prefetch next month on navigation
      if (onPrefetchMonth) {
        onPrefetchMonth(addMonths(next, 1));
      }
      return next;
    });
  }, [onPrefetchMonth]);
  
  const prevMonth = useCallback(() => {
    setCurrentDate(prev => {
      const prevMonth = addMonths(prev, -1);
      // Prefetch previous month on navigation
      if (onPrefetchMonth) {
        onPrefetchMonth(addMonths(prevMonth, -1));
      }
      return prevMonth;
    });
  }, [onPrefetchMonth]);
  
  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  // Prefetch next/previous month on hover over navigation buttons
  const handleNextMonthHover = useCallback(() => {
    if (onPrefetchMonth) {
      const nextMonthDate = addMonths(currentDate, 1);
      onPrefetchMonth(nextMonthDate);
    }
  }, [currentDate, onPrefetchMonth]);

  const handlePrevMonthHover = useCallback(() => {
    if (onPrefetchMonth) {
      const prevMonthDate = addMonths(currentDate, -1);
      onPrefetchMonth(prevMonthDate);
    }
  }, [currentDate, onPrefetchMonth]);

  // Grid Data Generation
  const calendarDays = useMemo(() => {
    const days = [];
    // Padding for empty start days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    return days;
  }, [currentDate, daysInMonth, firstDay]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Get start and end of current month view
  const monthStart = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  const monthEnd = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
  }, [currentDate]);

  // Expand recurring events for the current month view
  const displayEvents = useMemo(() => {
    // Expand recurring events
    const expanded = expandRecurringEvents(events, monthStart, monthEnd);
    // Sort by date
    return expanded.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events, monthStart, monthEnd]);

  // For List View: Filter out past events (strictly before now) AND limit to current month
  const listViewEvents = useMemo(() => {
    const now = new Date();
    // Reset time for strictly date based comparison if needed, but "past events" usually implies time too.
    // User request: "filter out events in past"
    return displayEvents.filter(e => {
      // Keep if it is in the future relative to NOW
      // OR if it's today (even if time passed, usually good to show today's events still)
      // Let's say strict > now for simplicity, or maybe end of today?
      // Let's use: e.date > now
      // ALSO ensure it belongs to the currently selected month (Calendar navigation behavior)

      const isFuture = e.date >= now;
      const isCurrentMonth = e.date.getMonth() === currentDate.getMonth() && e.date.getFullYear() === currentDate.getFullYear();

      return isFuture && isCurrentMonth;
    });
  }, [displayEvents, currentDate]);


  const getCategoryColor = (category?: EventCategory) => {
    if (!category) return 'bg-brand-50 text-brand-800 dark:bg-brand-900 dark:text-brand-100';

    const colors: Record<string, string> = {
      meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      workshop: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      social: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100',
      training: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
      community: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      celebration: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
      other: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className={`rounded-2xl overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800 ${theme === 'dark' ? 'glass-panel-dark' : 'bg-white shadow-sm'}`}>

      {/* Calendar Header */}
      <div className="p-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white w-48">{monthName}</h2>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button 
              onClick={prevMonth} 
              onMouseEnter={handlePrevMonthHover}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-all shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={nextMonth} 
              onMouseEnter={handleNextMonthHover}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-all shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button onClick={goToday} className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Today</button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <ListIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="p-6">
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-t border-l border-slate-100 dark:border-slate-800">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-32 bg-slate-50/50 dark:bg-slate-800/30 border-b border-r border-slate-100 dark:border-slate-800"></div>;

              const dayEvents = displayEvents.filter(e => isSameDay(e.date, day));
              const isToday = isSameDay(day, new Date());

              return (
                <div key={day.toISOString()} className={`min-h-[8rem] group border-b border-r border-slate-100 dark:border-slate-800 p-2 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50 ${isToday ? 'bg-brand-50 dark:bg-brand-900/50 ring-2 ring-brand-500 dark:ring-brand-400 ring-inset shadow-sm dark:shadow-brand-900/20' : 'bg-white dark:bg-slate-900/0'}`}>
                  <div className={`text-right text-xs font-semibold mb-2 ${isToday ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500'}`}>
                    {isToday ? (
                      <span className="bg-brand-500 dark:bg-brand-400 text-white dark:text-slate-900 px-2 py-1 rounded-full font-bold text-sm shadow-sm">{day.getDate()}</span>
                    ) : day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map(ev => {
                      const colorClass = getCategoryColor(ev.category);
                      const statusClass = ev.status === 'cancelled' ? 'line-through opacity-50' : ev.status === 'draft' ? 'opacity-70 dashed-border' : '';

                      return (
                        <div
                          key={ev.instanceKey ?? ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                          className={`w-full text-left ${colorClass} text-[10px] px-1.5 py-1 rounded-[4px] truncate font-medium transition-all hover:opacity-80 cursor-pointer ${statusClass}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {listViewEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No upcoming events found for this month.</div>
          ) : (
            listViewEvents.map(event => (
              <div key={event.instanceKey ?? event.id} onClick={() => onEventClick(event)} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-start gap-4 transition-colors group">
                {/* Date Badge - Minimal */}
                <div className="flex-shrink-0 w-14 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{event.date.toLocaleString('default', { month: 'short' })}</div>
                  <div className="text-xl font-semibold text-slate-900 dark:text-white">{event.date.getDate()}</div>
                </div>

                <div className="flex-grow min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold text-slate-900 dark:text-white truncate ${event.status === 'cancelled' ? 'line-through opacity-50' : ''}`}>
                        {event.title}
                      </h3>
                      {event.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{event.description}</p>}
                    </div>
                    {event.status === 'cancelled' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">
                        Cancelled
                      </span>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-3 mt-2">
                    <div className="flex items-center text-xs text-slate-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-xs text-slate-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(CalendarView, (prevProps, nextProps) => {
  // Only re-render if events array changed (by length or IDs)
  if (prevProps.events.length !== nextProps.events.length) return false;
  
  // Check if any event IDs changed
  const prevIds = prevProps.events.map(e => e.id).sort().join(',');
  const nextIds = nextProps.events.map(e => e.id).sort().join(',');
  if (prevIds !== nextIds) return false;
  
  // Check if event dates changed (for recurring events)
  const prevDates = prevProps.events.map(e => e.date.getTime()).sort().join(',');
  const nextDates = nextProps.events.map(e => e.date.getTime()).sort().join(',');
  if (prevDates !== nextDates) return false;
  
  if (prevProps.onEventClick !== nextProps.onEventClick) return false;
  if (prevProps.onPrefetchMonth !== nextProps.onPrefetchMonth) return false;
  
  return true; // Props are equal, skip re-render
});
