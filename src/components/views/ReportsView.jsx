import { useState } from 'react';
import { formatDateISO, formatDateDisplay, addDays, parseDate } from '../../utils/dateHelpers.js';
import { getWeekStart, getWeekEnd } from '../../utils/reportUtils.js';
import Button, { IconButton } from '../common/Button.jsx';
import DailyDashboard from '../reports/DailyDashboard.jsx';
import WeeklySummary from '../reports/WeeklySummary.jsx';

/**
 * Main Reports View with sub-navigation for different report types
 */
export default function ReportsView({ onEmptyCellClick }) {
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));

  // Week navigation for weekly report
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const today = formatDateISO(new Date());
  const isToday = selectedDate === today;

  // Date navigation for daily report
  const goToPrevDay = () => {
    setSelectedDate(formatDateISO(addDays(parseDate(selectedDate), -1)));
  };

  const goToNextDay = () => {
    setSelectedDate(formatDateISO(addDays(parseDate(selectedDate), 1)));
  };

  const goToToday = () => {
    setSelectedDate(today);
  };

  // Week navigation for weekly report
  const goToPrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToThisWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  const isCurrentWeek = formatDateISO(weekStart) === formatDateISO(getWeekStart(new Date()));

  // Format week range for display
  const formatWeekRange = (start) => {
    const startDate = new Date(start);
    const endDate = getWeekEnd(start);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${startDate.getFullYear()}`;
    }
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startDate.getFullYear()}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Report Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Report Type Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Report:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="rounded-md border-gray-300 text-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="daily">Daily Dashboard</option>
              <option value="weekly">Weekly Summary</option>
            </select>
          </div>

          {/* Date/Week Navigation */}
          {reportType === 'daily' ? (
            <div className="flex items-center gap-2">
              <IconButton onClick={goToPrevDay} aria-label="Previous day">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </IconButton>

              <Button
                variant={isToday ? 'primary' : 'outline'}
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

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />

              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {formatDateDisplay(selectedDate)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IconButton onClick={goToPrevWeek} aria-label="Previous week">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </IconButton>

              <Button
                variant={isCurrentWeek ? 'primary' : 'outline'}
                size="sm"
                onClick={goToThisWeek}
              >
                This Week
              </Button>

              <IconButton onClick={goToNextWeek} aria-label="Next week">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </IconButton>

              <span className="text-sm font-medium text-gray-700">
                Week of {formatWeekRange(weekStart)}
              </span>
            </div>
          )}

          {/* Print Button */}
          <Button variant="outline" size="sm" onClick={handlePrint} className="no-print">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'daily' ? (
        <DailyDashboard selectedDate={selectedDate} onEmptyCellClick={onEmptyCellClick} />
      ) : (
        <WeeklySummary weekStart={weekStart} />
      )}
    </div>
  );
}
