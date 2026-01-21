import React, { useState, useMemo } from 'react';
import { Event, ViewMode, EventCategory } from '../types';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, addMonths } from '../utils/date';
import { ChevronLeft, ChevronRight, Grid, List as ListIcon, MapPin, Clock, Tag } from 'lucide-react';

interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  // Filter events for the current month view (optional for list but good for context)
  const sortedEvents = useMemo(() => {
      return [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Calendar Header */}
      <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-slate-800 w-48">{monthName}</h2>
          <div className="flex space-x-1">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-600"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-600"><ChevronRight className="h-5 w-5" /></button>
            <button onClick={goToday} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md font-medium">Today</button>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md flex items-center space-x-2 text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md flex items-center space-x-2 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ListIcon className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 lg:gap-4 auto-rows-fr">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-24 sm:h-32 bg-slate-50/50 rounded-lg"></div>;
              
              const dayEvents = events.filter(e => isSameDay(e.date, day));
              const isToday = isSameDay(day, new Date());

              return (
                <div key={day.toISOString()} className={`min-h-[6rem] sm:min-h-[8rem] border rounded-lg p-2 transition-all hover:shadow-md ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
                  <div className={`text-right text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map(ev => {
                      const categoryColors: Record<EventCategory, string> = {
                        meeting: 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200',
                        workshop: 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-200',
                        social: 'bg-pink-100 hover:bg-pink-200 text-pink-800 border-pink-200',
                        training: 'bg-green-100 hover:bg-green-200 text-green-800 border-green-200',
                        community: 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-200',
                        celebration: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-200',
                        other: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200'
                      };
                      const colorClass = ev.category ? categoryColors[ev.category] : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200';
                      const statusClass = ev.status === 'cancelled' ? 'line-through opacity-60' : ev.status === 'draft' ? 'opacity-50' : '';
                      
                      return (
                        <button 
                          key={ev.id}
                          onClick={() => onEventClick(ev)}
                          className={`w-full text-left ${colorClass} text-xs px-2 py-1 rounded truncate transition-colors border ${statusClass}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
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
        <div className="divide-y divide-slate-100">
          {sortedEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No upcoming events found.</div>
          ) : (
            sortedEvents.map(event => (
              <div key={event.id} onClick={() => onEventClick(event)} className="p-4 hover:bg-slate-50 cursor-pointer flex items-start space-x-4 transition-colors group">
                {/* Date Badge */}
                <div className="flex-shrink-0 w-16 text-center bg-slate-100 rounded-lg p-2 group-hover:bg-white group-hover:shadow-sm transition-all">
                  <div className="text-xs text-slate-500 uppercase font-bold">{event.date.toLocaleString('default', { month: 'short' })}</div>
                  <div className="text-xl font-bold text-slate-800">{event.date.getDate()}</div>
                </div>

                <div className="flex-grow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors ${
                        event.status === 'cancelled' ? 'line-through opacity-60' : 
                        event.status === 'draft' ? 'opacity-50' : ''
                      }`}>
                        {event.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{event.description}</p>
                    </div>
                    {event.status === 'cancelled' && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Cancelled
                      </span>
                    )}
                    {event.status === 'draft' && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    <div className="flex items-center text-xs text-slate-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {event.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="flex items-center text-xs text-slate-400">
                      <MapPin className="h-3 w-3 mr-1" />
                      {event.location}
                    </div>
                    {event.category && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
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
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex items-center text-xs text-slate-400">
                        <Tag className="h-3 w-3 mr-1" />
                        {event.tags.slice(0, 2).join(', ')}
                        {event.tags.length > 2 && ` +${event.tags.length - 2}`}
                      </div>
                    )}
                  </div>
                </div>

                {event.posterUrl && (
                  <img src={event.posterUrl} alt="" className="h-16 w-16 object-cover rounded-md hidden sm:block" />
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
