import { Event, EventFilters } from '../types';

export const filterEvents = (events: Event[], filters: EventFilters): Event[] => {
  let filtered = [...events];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(event =>
      event.title.toLowerCase().includes(searchLower) ||
      event.description.toLowerCase().includes(searchLower) ||
      event.location.toLowerCase().includes(searchLower) ||
      event.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // Category filter
  if (filters.category) {
    filtered = filtered.filter(event => event.category === filters.category);
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter(event => event.status === filters.status);
  } else {
    // By default, show only published events (unless status filter is explicitly set)
    filtered = filtered.filter(event => event.status === 'published' || event.status === undefined);
  }

  // Date range filter
  if (filters.dateRange) {
    filtered = filtered.filter(event => {
      const eventDate = new Date(event.date);
      if (filters.dateRange?.start && eventDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange?.end && eventDate >= filters.dateRange.end) {
        return false;
      }
      return true;
    });
  }

  // Location filter
  if (filters.location) {
    filtered = filtered.filter(event => event.location === filters.location);
  }

  // Creator filter
  if (filters.creatorId) {
    filtered = filtered.filter(event => event.creatorId === filters.creatorId);
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(event =>
      event.tags && filters.tags!.some(tag => event.tags!.includes(tag))
    );
  }

  return filtered;
};
