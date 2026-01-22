import { Event, RecurrenceRule } from '../types';

/**
 * Checks if a date is actively within the recurrence range
 */
const isDateWithinRecurrenceRange = (date: Date, start: Date, rule: RecurrenceRule, count: number): boolean => {
  if (date < start) return false;
  if (rule.endDate && date > rule.endDate) return false;
  if (rule.occurrences && count >= rule.occurrences) return false;
  return true;
};

/**
 * Expands a list of events into individual instances for a specific date range.
 * Handles recurring events by generating instances.
 */
export const expandRecurringEvents = (events: Event[], rangeStart: Date, rangeEnd: Date): Event[] => {
  const expandedEvents: Event[] = [];

  events.forEach(event => {
    // 1. If it's not recurring, just check if it falls in the range
    if (!event.recurrence || event.recurrence.type === 'none') {
      if (event.date >= rangeStart && event.date <= rangeEnd) {
        expandedEvents.push(event);
      }
      return;
    }

    // 2. If it is recurring, generate instances
    const rule = event.recurrence;
    const instances: Event[] = [];
    let currentInstanceDate = new Date(event.date);
    let count = 0;

    // We need to iterate until we pass the rangeEnd OR the recurrence rules stop us
    // Optimization: If the start is way before rangeStart, we might want to skip ahead,
    // but for simple intervals iterating is safer for correctness (especially months).
    // For performance on years of data, we'd calculate the first occurrence >= rangeStart.

    // Allow a safety limit to prevent infinite loops with bad data
    const MAX_INSTANCES = 1000;

    while (
      count < MAX_INSTANCES &&
      (!rule.endDate || currentInstanceDate <= rule.endDate) &&
      (!rule.occurrences || count < rule.occurrences)
    ) {

      // If the current instance is past the range we are looking at, we can stop
      // BUT only if we are sure it's past.
      if (currentInstanceDate > rangeEnd) {
        break;
      }

      // If the instance is within the range, add it
      if (currentInstanceDate >= rangeStart) {
        // Clone the event and set the new date
        // Create a unique ID for the instance to avoid key collisions in React
        const instanceId = `${event.id}_${currentInstanceDate.getTime()}`;
        instances.push({
          ...event,
          id: instanceId,
          date: new Date(currentInstanceDate),
          // We might want to mark it as an instance if we need UI distinctness
        });
      }

      // Calculate next date
      const nextDate = new Date(currentInstanceDate);
      const interval = rule.interval || 1;

      switch (rule.type) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + interval);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + (interval * 7));
          // TODO: specific days of week support could go here logic-wise
          // For now, simple "every N weeks on the same day" logic
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + interval);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + interval);
          break;
        case 'custom':
          // Default to daily if custom logic not fully specified
          nextDate.setDate(nextDate.getDate() + interval);
          break;
        default:
          return; // Should not happen
      }

      currentInstanceDate = nextDate;
      count++;
    }

    expandedEvents.push(...instances);
  });

  return expandedEvents;
};
