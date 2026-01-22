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
    const interval = rule.interval || 1;
    let currentInstanceDate = new Date(event.date);

    // SAFETY CHECK: If interval is somehow 0 or negative, force to 1 to avoid infinite loops
    if (interval <= 0) return;

    // OPTIMIZATION: Jump ahead to rangeStart if event started long ago
    // Only optimize if we don't have a strict occurrences limit (or if we Accept approximation)
    // If 'occurrences' is set, we technically must count from the start to know when to stop.
    // However, for typical calendar usage, 'occurrences' is rare vs 'endDate' or 'infinite'.
    // We will skip optimization if occurrences is set to be safe.
    const shouldOptimizeJump = !rule.occurrences && currentInstanceDate < rangeStart;

    if (shouldOptimizeJump) {
      if (rule.type === 'daily') {
        const diffTime = rangeStart.getTime() - currentInstanceDate.getTime();
        const daysToJump = Math.floor(diffTime / (1000 * 60 * 60 * 24 * interval));
        // Jump one less to be safe and let the loop handle the boundary
        if (daysToJump > 0) {
          currentInstanceDate.setDate(currentInstanceDate.getDate() + (daysToJump * interval));
        }
      } else if (rule.type === 'weekly') {
        const diffTime = rangeStart.getTime() - currentInstanceDate.getTime();
        const weeksToJump = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7 * interval));
        if (weeksToJump > 0) {
          currentInstanceDate.setDate(currentInstanceDate.getDate() + (weeksToJump * 7 * interval));
        }
      } else if (rule.type === 'monthly') {
        const yearDiff = rangeStart.getFullYear() - currentInstanceDate.getFullYear();
        const monthDiff = rangeStart.getMonth() - currentInstanceDate.getMonth();
        const totalMonths = (yearDiff * 12) + monthDiff;
        const jumps = Math.floor(totalMonths / interval);
        if (jumps > 0) {
          currentInstanceDate.setMonth(currentInstanceDate.getMonth() + (jumps * interval));
        }
      } else if (rule.type === 'yearly') {
        const yearDiff = rangeStart.getFullYear() - currentInstanceDate.getFullYear();
        const jumps = Math.floor(yearDiff / interval);
        if (jumps > 0) {
          currentInstanceDate.setFullYear(currentInstanceDate.getFullYear() + (jumps * interval));
        }
      }
    }

    // Now iterate strictly within or slightly before rangeStart until rangeEnd
    const MAX_INSTANCES = 1000; // Safety break
    let count = 0;

    while (
      count < MAX_INSTANCES &&
      (!rule.endDate || currentInstanceDate <= rule.endDate) &&
      (!rule.occurrences || count < rule.occurrences)
    ) {

      // If the current instance is past the range we are looking at, we can stop
      if (currentInstanceDate > rangeEnd) {
        break;
      }

      // If the instance is within the range, add it
      if (currentInstanceDate >= rangeStart) {
        const instanceKey = `${event.id}_${currentInstanceDate.getTime()}`;
        expandedEvents.push({
          ...event,
          instanceKey,
          date: new Date(currentInstanceDate),
        });
      }

      // Calculate next date
      const nextDate = new Date(currentInstanceDate);

      switch (rule.type) {
        case 'daily': nextDate.setDate(nextDate.getDate() + interval); break;
        case 'weekly': nextDate.setDate(nextDate.getDate() + (interval * 7)); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + interval); break;
        case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + interval); break;
        case 'custom': nextDate.setDate(nextDate.getDate() + interval); break;
        default: return;
      }

      currentInstanceDate = nextDate;
      count++;
    }

    // Fallback: If we didn't add any instances but we should have (e.g. slight mismatch in jump logic),
    // the loop handles it by starting slightly before rangeStart.
  });

  return expandedEvents;
};
