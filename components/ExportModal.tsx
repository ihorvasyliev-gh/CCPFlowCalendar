import React, { useState } from 'react';
import { X, Download, Calendar, FileText } from 'lucide-react';
import { Event } from '../types';
import { exportToICal, exportToCSV, downloadFile } from '../utils/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, events }) => {
  const [exportFormat, setExportFormat] = useState<'ical' | 'csv'>('ical');

  if (!isOpen) return null;

  const handleExport = () => {
    if (exportFormat === 'ical') {
      const icalContent = exportToICal(events);
      downloadFile(icalContent, 'ccp-events.ics', 'text/calendar');
    } else {
      const csvContent = exportToCSV(events);
      downloadFile(csvContent, 'ccp-events.csv', 'text/csv');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="export-modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
          <div className="bg-slate-50 px-4 py-3 sm:px-6 flex justify-between items-center border-b border-gray-100">
            <h3 className="text-lg leading-6 font-semibold text-gray-900" id="export-modal-title">
              Export Events
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <p className="text-sm text-gray-600 mb-4">
              Export {events.length} event{events.length !== 1 ? 's' : ''} to your preferred format.
            </p>

            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="ical"
                  checked={exportFormat === 'ical'}
                  onChange={() => setExportFormat('ical')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">iCal Format (.ics)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Import into Google Calendar, Outlook, or Apple Calendar</p>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">CSV Format (.csv)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Open in Excel, Google Sheets, or any spreadsheet app</p>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleExport}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
