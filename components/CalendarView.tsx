import React, { useState, useMemo } from 'react';
import { Event, ViewMode, EventCategory } from '../types';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, addMonths } from '../utils/date';
import { expandRecurringEvents } from '../utils/recurrence';
import { ChevronLeft, ChevronRight, Grid, List as ListIcon, MapPin, Clock, Tag } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { theme } = useTheme();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  // Month navigation
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const goToday = () => setCurrentDate(new Date());

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
    if (!category) return 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-700/50';

    const colors: Record<string, string> = {
      meeting: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50',
      workshop: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50',
      social: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700/50',
      training: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50',
      community: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50',
      celebration: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50',
      other: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className={`rounded-3xl shadow-xl overflow-hidden animate-fade-in ${theme === 'dark' ? 'glass-panel-dark' : 'glass-panel'}`}>

      {/* Calendar Header */}
      <div className="p-6 flex flex-col sm:flex-row justify-between items-center border-b border-slate-200/50 dark:border-slate-700/50 gap-4">
        <div className="flex items-center gap-6">
          <h2 className={`text-2xl font-display font-bold w-48 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{monthName}</h2>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-all shadow-sm hover:shadow-md"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 transition-all shadow-sm hover:shadow-md"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <button onClick={goToday} className="px-4 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl font-bold transition-colors">Today</button>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <ListIcon className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="p-6">
          <div className="grid grid-cols-7 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3 lg:gap-4">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-28 sm:h-36 bg-slate-50/30 dark:bg-slate-800/20 rounded-2xl"></div>;

              const dayEvents = displayEvents.filter(e => isSameDay(e.date, day));
              const isToday = isSameDay(day, new Date());

              return (
                <div key={day.toISOString()} className={`min-h-[7rem] sm:min-h-[9rem] border rounded-2xl p-3 transition-all hover:scale-[1.02] hover:shadow-lg ${isToday ? 'bg-brand-50/50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-700' : 'bg-white/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700'}`}>
                  <div className={`text-right text-sm font-bold mb-2 ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1.5 cursor-pointer">
                    {dayEvents.map(ev => {
                      const colorClass = getCategoryColor(ev.category);
                      const statusClass = ev.status === 'cancelled' ? 'line-through opacity-60' : ev.status === 'draft' ? 'opacity-50 dashed-border' : '';

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                          className={`w-full text-left ${colorClass} border text-[10px] sm:text-xs px-2 py-1.5 rounded-lg truncate font-medium transition-all hover:brightness-95 ${statusClass}`}
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
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {listViewEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">No upcoming events found for this month.</div>
          ) : (
            listViewEvents.map(event => (
              <div key={event.id} onClick={() => onEventClick(event)} className="p-6 hover:bg-white/50 dark:hover:bg-slate-800/50 cursor-pointer flex items-start gap-6 transition-all group border-l-4 border-transparent hover:border-brand-500">
                {/* Date Badge */}
                <div className={`flex-shrink-0 w-20 text-center rounded-2xl p-3 transition-transform group-hover:scale-105 shadow-sm ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{event.date.toLocaleString('default', { month: 'short' })}</div>
                  <div className="text-2xl font-display font-bold text-brand-600 dark:text-brand-400">{event.date.getDate()}</div>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-bold text-slate-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate ${event.status === 'cancelled' ? 'line-through opacity-60' :
                        event.status === 'draft' ? 'opacity-70' : ''
                        }`}>
                        {event.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{event.description}</p>
                    </div>
                    {event.status === 'cancelled' && (
                      <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
                        Cancelled
                      </span>
                    )}
                    {event.status === 'draft' && (
                      <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-lg">
                        Draft
                      </span>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-3 mt-3">
                    <div className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      {event.location}
                    </div>
                    {event.category && (
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getCategoryColor(event.category)}`}>
                        {event.category}
                      </span>
                    )}
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex items-center text-xs font-medium text-slate-400">
                        <Tag className="h-3.5 w-3.5 mr-1.5" />
                        {event.tags.slice(0, 2).join(', ')}
                        {event.tags.length > 2 && ` +${event.tags.length - 2}`}
                      </div>
                    )}
                  </div>
                </div>

                {event.posterUrl && (
                  <div className="hidden sm:block flex-shrink-0 h-20 w-20 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-all">
                    <img src={event.posterUrl} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
