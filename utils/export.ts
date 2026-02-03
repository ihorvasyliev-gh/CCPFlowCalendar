import * as XLSX from 'xlsx';
import { Event } from '../types';

// Export to iCal format
export const exportToICal = (events: Event[]): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let ical = 'BEGIN:VCALENDAR\r\n';
  ical += 'VERSION:2.0\r\n';
  ical += 'PRODID:-//CCP Events//EN\r\n';
  ical += 'CALSCALE:GREGORIAN\r\n';
  ical += 'METHOD:PUBLISH\r\n';

  events.forEach(event => {
    ical += 'BEGIN:VEVENT\r\n';
    ical += `UID:${event.id}@ccp-events\r\n`;
    ical += `DTSTART:${formatDate(event.date)}\r\n`;
    const endDate = new Date(event.date);
    endDate.setHours(endDate.getHours() + 1); // Default 1 hour duration
    ical += `DTEND:${formatDate(endDate)}\r\n`;
    ical += `SUMMARY:${event.title.replace(/,/g, '\\,').replace(/;/g, '\\;')}\r\n`;
    ical += `DESCRIPTION:${event.description.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}\r\n`;
    ical += `LOCATION:${event.location.replace(/,/g, '\\,').replace(/;/g, '\\;')}\r\n`;
    ical += `DTSTAMP:${formatDate(new Date())}\r\n`;
    ical += 'END:VEVENT\r\n';
  });

  ical += 'END:VCALENDAR\r\n';
  return ical;
};

// Export to CSV format
export const exportToCSV = (events: Event[]): string => {
  const headers = ['Title', 'Date', 'Time', 'Location', 'Description', 'Category', 'Status'];
  const rows = events.map(event => [
    event.title,
    event.date.toLocaleDateString(),
    event.date.toLocaleTimeString(),
    event.location,
    event.description.replace(/"/g, '""'),
    event.category || '',
    event.status || 'published'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};

// Download file helper (string content)
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
};

// Download Blob (e.g. Excel file)
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const RECURRENCE_LABELS: Record<string, string> = {
  none: '',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom'
};

/** Export events to Excel (.xlsx) with description, comments, poster URL, attachments. */
export const exportToExcel = (events: Event[]): Blob => {
  const headers = [
    'Title',
    'Date',
    'Time',
    'Location',
    'Description',
    'Category',
    'Status',
    'Recurrence',
    'Poster URL',
    'Comments',
    'Attachments'
  ];

  const rows = events.map(event => {
    const date = event.date instanceof Date ? event.date : new Date(event.date);
    const recurrenceLabel = event.recurrence?.type
      ? RECURRENCE_LABELS[event.recurrence.type] || event.recurrence.type
      : '';
    const commentsText = (event.comments ?? [])
      .map(c => {
        const createdAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
        return `${c.userName} (${createdAt.toLocaleString()}): ${c.content}`;
      })
      .join('\n');
    const attachmentsText = (event.attachments ?? [])
      .map(a => `${a.name}: ${a.url}`)
      .join('\n');

    return [
      event.title,
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      event.location,
      event.description || '',
      event.category || '',
      event.status || 'published',
      recurrenceLabel,
      event.posterUrl || '',
      commentsText,
      attachmentsText
    ];
  });

  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Events');
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
