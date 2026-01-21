import React, { useState } from 'react';
import { Filter, X, Calendar, MapPin, User, Tag } from 'lucide-react';
import { EventFilters, EventCategory, EventStatus } from '../types';

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  availableLocations: string[];
  availableCreators: { id: string; name: string }[];
  onClose?: () => void;
}

const EventFiltersComponent: React.FC<EventFiltersProps> = ({
  filters,
  onFiltersChange,
  availableLocations,
  availableCreators,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const categories: { value: EventCategory; label: string }[] = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'social', label: 'Social' },
    { value: 'training', label: 'Training' },
    { value: 'community', label: 'Community' },
    { value: 'celebration', label: 'Celebration' },
    { value: 'other', label: 'Other' }
  ];

  const statuses: { value: EventStatus; label: string }[] = [
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const quickDateFilters = [
    { label: 'Today', getRange: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: today, end: tomorrow };
    }},
    { label: 'This Week', getRange: () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start, end };
    }},
    { label: 'This Month', getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { start, end };
    }},
    { label: 'Next Month', getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 1);
      return { start, end };
    }}
  ];

  const hasActiveFilters = 
    filters.category || 
    filters.status || 
    filters.dateRange || 
    filters.location || 
    filters.creatorId ||
    (filters.tags && filters.tags.length > 0);

  const clearFilters = () => {
    onFiltersChange({});
  };

  const applyQuickDate = (getRange: () => { start: Date; end: Date }) => {
    const range = getRange();
    onFiltersChange({ ...filters, dateRange: range });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
        aria-label="Filter events"
        aria-expanded={isOpen}
      >
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
            {[
              filters.category ? 1 : 0,
              filters.status ? 1 : 0,
              filters.dateRange ? 1 : 0,
              filters.location ? 1 : 0,
              filters.creatorId ? 1 : 0,
              filters.tags?.length || 0
            ].reduce((a, b) => a + b, 0)}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Date Filters */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Quick Date Filters
              </label>
              <div className="grid grid-cols-2 gap-2">
                {quickDateFilters.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={() => applyQuickDate(filter.getRange)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 text-left"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const start = e.target.value ? new Date(e.target.value) : undefined;
                    onFiltersChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, start }
                    });
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
                <input
                  type="date"
                  value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const end = e.target.value ? new Date(e.target.value) : undefined;
                    onFiltersChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, end }
                    });
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    category: e.target.value ? (e.target.value as EventCategory) : undefined
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    status: e.target.value ? (e.target.value as EventStatus) : undefined
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            {availableLocations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </label>
                <select
                  value={filters.location || ''}
                  onChange={(e) => {
                    onFiltersChange({
                      ...filters,
                      location: e.target.value || undefined
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Creator Filter */}
            {availableCreators.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Creator
                </label>
                <select
                  value={filters.creatorId || ''}
                  onChange={(e) => {
                    onFiltersChange({
                      ...filters,
                      creatorId: e.target.value || undefined
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Creators</option>
                  {availableCreators.map((creator) => (
                    <option key={creator.id} value={creator.id}>
                      {creator.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EventFiltersComponent;
