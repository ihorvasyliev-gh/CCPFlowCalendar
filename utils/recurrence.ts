import { Event, RecurrenceRule } from '../types';

export const generateRecurringEvents = (baseEvent: Event, rule: RecurrenceRule, count: number = 10): Event[] => {
  const events: Event[] = [];
  const startDate = new Date(baseEvent.date);

  for (let i = 0; i < count; i++) {
    const eventDate = new Date(startDate);

    switch (rule.type) {
      case 'daily':
        eventDate.setDate(startDate.getDate() + i * (rule.interval || 1));
        break;
      case 'weekly':
        eventDate.setDate(startDate.getDate() + i * 7 * (rule.interval || 1));
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          // Find next occurrence on one of the specified days
          const targetDay = rule.daysOfWeek[0];
          const currentDay = eventDate.getDay();
          const daysToAdd = (targetDay - currentDay + 7) % 7;
          eventDate.setDate(eventDate.getDate() + daysToAdd);
        }
        break;
      case 'monthly':
        eventDate.setMonth(startDate.getMonth() + i * (rule.interval || 1));
        break;
      case 'yearly':
        eventDate.setFullYear(startDate.getFullYear() + i * (rule.interval || 1));
        break;
      default:
        return events; // No recurrence
    }

    // Check if we've exceeded the end date
    if (rule.endDate && eventDate > rule.endDate) {
      break;
    }

    // Check if we've exceeded the occurrence count
    if (rule.occurrences && i >= rule.occurrences) {
      break;
    }

    const recurringEvent: Event = {
      ...baseEvent,
      id: `${baseEvent.id}-recur-${i}`,
      date: new Date(eventDate)
    };

    events.push(recurringEvent);
  }

  return events;
};

export const formatRecurrenceRule = (rule: RecurrenceRule): string => {
  if (rule.type === 'none') {
    return 'No recurrence';
  }

  const parts: string[] = [];

  switch (rule.type) {
    case 'daily':
      parts.push('Daily');
      if (rule.interval && rule.interval > 1) {
        parts.push(`every ${rule.interval} days`);
      }
      break;
    case 'weekly':
      parts.push('Weekly');
      if (rule.interval && rule.interval > 1) {
        parts.push(`every ${rule.interval} weeks`);
      }
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const days = rule.daysOfWeek.map(d => dayNames[d]).join(', ');
        parts.push(`on ${days}`);
      }
      break;
    case 'monthly':
      parts.push('Monthly');
      if (rule.interval && rule.interval > 1) {
        parts.push(`every ${rule.interval} months`);
      }
      break;
    case 'yearly':
      parts.push('Yearly');
      if (rule.interval && rule.interval > 1) {
        parts.push(`every ${rule.interval} years`);
      }
      break;
  }

  if (rule.endDate) {
    parts.push(`until ${rule.endDate.toLocaleDateString()}`);
  } else if (rule.occurrences) {
    parts.push(`for ${rule.occurrences} occurrences`);
  }

  return parts.join(' ');
};
