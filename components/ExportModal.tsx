import React, { useState, useRef } from 'react';
import { X, Download, Calendar, FileSpreadsheet } from 'lucide-react';
import { Event } from '../types';
import { exportToICal, exportToExcel, downloadFile, downloadBlob } from '../utils/export';
import { getEventsWithRelated, getRecurrenceExceptions } from '../services/eventService';
import { expandRecurringEvents } from '../utils/recurrence';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

const EXPORT_RANGE_YEARS = 2;

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, events }) => {
  const [exportFormat, setExportFormat] = useState<'ical' | 'excel'>('ical');
  const [exporting, setExporting] = useState(false);
  const modalPanelRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, modalPanelRef);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const eventsWithRelated = await getEventsWithRelated(events);
      const recurringIds = eventsWithRelated
        .filter(e => e.recurrence && e.recurrence.type !== 'none')
        .map(e => e.id);
      const exceptionsMap = new Map<string, Date[]>();
      await Promise.all(
        recurringIds.map(async (eventId) => {
          const exceptions = await getRecurrenceExceptions(eventId);
          if (exceptions.length > 0) exceptionsMap.set(eventId, exceptions);
        })
      );

      const now = new Date();
      const rangeStart = eventsWithRelated.length > 0
        ? new Date(Math.min(...eventsWithRelated.map(e => e.date.getTime())))
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const twoYearsMs = EXPORT_RANGE_YEARS * 365.25 * 24 * 60 * 60 * 1000;
      const rangeEnd = eventsWithRelated.length > 0
        ? new Date(Math.max(...eventsWithRelated.map(e => {
          const end = e.recurrence?.endDate;
          if (end) return end.getTime();
          return e.date.getTime() + twoYearsMs;
        })))
        : new Date(rangeStart.getTime() + twoYearsMs);

      const expanded = expandRecurringEvents(eventsWithRelated, rangeStart, rangeEnd, exceptionsMap);

      if (exportFormat === 'ical') {
        const icalContent = exportToICal(expanded);
        downloadFile(icalContent, 'ccp-events.ics', 'text/calendar');
      } else {
        const blob = await exportToExcel(expanded);
        downloadBlob(blob, 'ccp-events.xlsx');
      }
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="export-modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div ref={modalPanelRef} className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 dark:text-white" id="export-modal-title">
              Export Events
            </h3>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Export {events.length} event{events.length !== 1 ? 's' : ''} to your preferred format.
            </p>

            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="ical"
                  checked={exportFormat === 'ical'}
                  onChange={() => setExportFormat('ical')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  disabled={exporting}
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">iCal Format (.ics)</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Import into Google Calendar, Outlook, or Apple Calendar</p>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={exportFormat === 'excel'}
                  onChange={() => setExportFormat('excel')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  disabled={exporting}
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Excel (.xlsx)</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All events including recurring, with comments and description</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {exporting ? (
                <>
                  <span className="animate-pulse">Preparing export…</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
