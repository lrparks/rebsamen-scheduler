import { useState } from 'react';
import { formatDateISO, formatDateDisplay, addDays, isToday, parseDate } from '../../utils/dateHelpers.js';
import Button, { IconButton } from '../common/Button.jsx';

/**
 * Tab navigation and date controls
 */
export default function Navigation({
  currentView,
  onViewChange,
  selectedDate,
  onDateChange,
}) {
  const tabs = [
    { id: 'daily', label: 'Daily View' },
    { id: 'weekly', label: 'Weekly View' },
    { id: 'contractors', label: 'Contractors' },
    { id: 'teams', label: 'Teams' },
    { id: 'search', label: 'Search' },
    { id: 'maintenance', label: 'Maintenance' },
  ];

  const goToToday = () => {
    onDateChange(formatDateISO(new Date()));
  };

  const goToPrevDay = () => {
    onDateChange(formatDateISO(addDays(parseDate(selectedDate), -1)));
  };

  const goToNextDay = () => {
    onDateChange(formatDateISO(addDays(parseDate(selectedDate), 1)));
  };

  const handleDateInput = (e) => {
    onDateChange(e.target.value);
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <nav className="flex space-x-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={currentView === tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${currentView === tab.id
                  ? 'bg-green-700 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Date Controls - only show for daily/weekly views */}
        {(currentView === 'daily' || currentView === 'weekly') && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <IconButton onClick={goToPrevDay} aria-label="Previous day">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </IconButton>

              <Button
                variant={isToday(selectedDate) ? 'primary' : 'outline'}
                size="sm"
                onClick={goToToday}
              >
                Today
              </Button>

              <IconButton onClick={goToNextDay} aria-label="Next day">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </IconButton>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={handleDateInput}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />

            <span className="text-sm font-medium text-gray-700">
              {formatDateDisplay(selectedDate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Color legend for booking types
 */
export function ColorLegend() {
  const legendItems = [
    { type: 'open', label: 'Open Play', color: 'bg-blue-500' },
    { type: 'contractor', label: 'Contractor', color: 'bg-purple-500' },
    { type: 'team_usta', label: 'USTA League', color: 'bg-green-500' },
    { type: 'team_hs', label: 'High School', color: 'bg-orange-500' },
    { type: 'team_college', label: 'College', color: 'bg-orange-500' },
    { type: 'team_other', label: 'Team', color: 'bg-amber-500' },
    { type: 'tournament', label: 'Tournament', color: 'bg-red-500' },
    { type: 'maintenance', label: 'Maintenance', color: 'bg-gray-500' },
    { type: 'hold', label: 'Hold', color: 'bg-yellow-500' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs">
      <span className="font-medium text-gray-600">Legend:</span>
      {legendItems.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${item.color}`} />
          <span className="text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
