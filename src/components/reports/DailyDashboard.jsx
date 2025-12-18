import React, { useState, useMemo, useEffect } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useContractors } from '../../hooks/useContractors.js';
import { formatDateDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import {
  getDailyUtilizationWithClosures,
  getDailyRevenue,
  getDailyActivity,
  getContractorHoursForDate,
  getAvailabilityGrid,
  formatCurrency,
  formatTimeForReport,
  TIME_PERIODS,
  TOTAL_COURTS,
} from '../../utils/reportUtils.js';
import { fetchMaintenanceLog, fetchMaintenanceTasks } from '../../utils/api.js';
import { CONFIG } from '../../config.js';

/**
 * Daily Dashboard Report - Real-time operational metrics
 * Layout:
 * ┌────────────────────────────┬─────────────────────────┐
 * │ Utilization by Time Period │ Today's Activity        │
 * ├────────────────────────────┴─────────────────────────┤
 * │ View Available Slots (collapsible)                   │
 * ├────────────────────────────┬─────────────────────────┤
 * │ Revenue                    │ Contractors Today       │
 * ├────────────────────────────┴─────────────────────────┤
 * │ Daily Maintenance                                    │
 * └──────────────────────────────────────────────────────┘
 */
export default function DailyDashboard({ selectedDate, onEmptyCellClick }) {
  const { bookings, closures, loading } = useBookingsContext();
  const { contractors } = useContractors();

  // Maintenance data
  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  // Load maintenance data
  useEffect(() => {
    const loadMaintenance = async () => {
      try {
        const [log, tasks] = await Promise.all([
          fetchMaintenanceLog(),
          fetchMaintenanceTasks(),
        ]);
        setMaintenanceLog(log);
        setMaintenanceTasks(tasks.filter(t => t.is_active === 'TRUE'));
      } catch (error) {
        console.error('Error loading maintenance data:', error);
      } finally {
        setMaintenanceLoading(false);
      }
    };
    loadMaintenance();
  }, []);

  // Calculate all metrics using closures-aware function
  const utilization = useMemo(() =>
    getDailyUtilizationWithClosures(bookings, closures, selectedDate),
    [bookings, closures, selectedDate]
  );

  const revenue = useMemo(() =>
    getDailyRevenue(bookings, selectedDate),
    [bookings, selectedDate]
  );

  const activity = useMemo(() =>
    getDailyActivity(bookings, selectedDate),
    [bookings, selectedDate]
  );

  const contractorData = useMemo(() =>
    getContractorHoursForDate(bookings, contractors, selectedDate),
    [bookings, contractors, selectedDate]
  );

  const availabilityGrid = useMemo(() =>
    getAvailabilityGrid(bookings, closures, selectedDate),
    [bookings, closures, selectedDate]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading report data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Print Header */}
      <div className="print-header hidden">
        <h1>Rebsamen Tennis Center - Daily Report</h1>
        <p>{formatDateDisplay(selectedDate)}</p>
      </div>

      {/* Row 1: Utilization & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UtilizationCard utilization={utilization} />
        <ActivityCard activity={activity} />
      </div>

      {/* Available Slots Collapsible Bar */}
      <AvailableSlotsBar
        availabilityGrid={availabilityGrid}
        utilization={utilization}
        selectedDate={selectedDate}
        onEmptyCellClick={onEmptyCellClick}
      />

      {/* Row 2: Revenue & Contractors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueCard revenue={revenue} />
        <ContractorsCard contractorData={contractorData} />
      </div>

      {/* Maintenance Summary - Full Width */}
      <MaintenanceCard
        selectedDate={selectedDate}
        maintenanceLog={maintenanceLog}
        maintenanceTasks={maintenanceTasks}
        loading={maintenanceLoading}
      />
    </div>
  );
}

/**
 * Utilization Card
 */
function UtilizationCard({ utilization }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Utilization by Time Period</h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="pb-2">Period</th>
              <th className="pb-2 text-right">Booked</th>
              <th className="pb-2 text-right">Util</th>
              <th className="pb-2 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {['MORNING', 'AFTERNOON', 'PRIME'].map(period => (
              <tr key={period}>
                <td className="py-2 text-sm text-gray-900">{utilization[period].label}</td>
                <td className="py-2 text-sm text-gray-600 text-right">
                  {utilization[period].booked}/{utilization[period].total}
                  {utilization[period].closed > 0 && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({utilization[period].closed} closed)
                    </span>
                  )}
                </td>
                <td className="py-2 text-sm font-medium text-right">
                  <span className={utilization[period].utilization >= 80 ? 'text-green-600' : ''}>
                    {utilization[period].utilization}%
                  </span>
                </td>
                <td className="py-2 pl-2">
                  <UtilizationBar percentage={utilization[period].utilization} />
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-medium">
              <td className="py-2 text-sm text-gray-900">TOTAL</td>
              <td className="py-2 text-sm text-gray-900 text-right">
                {utilization.TOTAL.booked}/{utilization.TOTAL.total}
                {utilization.TOTAL.closed > 0 && (
                  <span className="text-xs text-gray-400 ml-1">
                    ({utilization.TOTAL.closed} closed)
                  </span>
                )}
              </td>
              <td className="py-2 text-sm font-medium text-right">
                {utilization.TOTAL.utilization}%
              </td>
              <td className="py-2 pl-2">
                <UtilizationBar percentage={utilization.TOTAL.utilization} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Simple utilization bar
 */
function UtilizationBar({ percentage }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${
          percentage >= 80 ? 'bg-green-500' :
          percentage >= 50 ? 'bg-yellow-500' :
          'bg-gray-400'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/**
 * Today's Activity Card
 */
function ActivityCard({ activity }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Today's Activity</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Bookings</span>
          <span className="text-sm font-medium text-gray-900">{activity.active}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Check-ins</span>
          <span className="text-sm font-medium text-green-600">{activity.checkedIn}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">No-shows</span>
          <span className={`text-sm font-medium ${activity.noShows > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {activity.noShows}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Cancellations</span>
          <span className="text-sm font-medium text-gray-900">
            {activity.cancellations}
            {activity.cancellations > 0 && (
              <span className="text-xs text-gray-500 ml-1">
                ({activity.cancelByReason.weather > 0 ? `${activity.cancelByReason.weather} weather` : ''}
                {activity.cancelByReason.customer > 0 ? `${activity.cancelByReason.weather > 0 ? ', ' : ''}${activity.cancelByReason.customer} customer` : ''})
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible Available Slots Bar with color-coded grid
 */
function AvailableSlotsBar({ availabilityGrid, utilization, selectedDate, onEmptyCellClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalAvailable = utilization.TOTAL.available;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Clickable Header Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          {/* Toggle Switch Indicator */}
          <div className={`relative w-10 h-5 rounded-full transition-colors ${isExpanded ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                isExpanded ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </div>
          <h3 className="font-medium text-gray-900">
            {isExpanded ? 'Hide' : 'Show'} Available Slots
          </h3>
          <span className="text-xs text-gray-500">(click to {isExpanded ? 'collapse' : 'expand'})</span>
        </div>
        <span className={`text-sm font-medium ${totalAvailable < 20 ? 'text-amber-600' : 'text-green-600'}`}>
          {totalAvailable} slots open
          {utilization.TOTAL.closed > 0 && (
            <span className="text-gray-400 ml-2">({utilization.TOTAL.closed} closed)</span>
          )}
        </span>
      </button>

      {/* Expanded Grid */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          <AvailabilityGridDisplay
            grid={availabilityGrid}
            selectedDate={selectedDate}
            onEmptyCellClick={onEmptyCellClick}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Color-coded availability grid display with click/drag booking
 */
function AvailabilityGridDisplay({ grid, selectedDate, onEmptyCellClick }) {
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // { court, timeIndex }
  const [dragEnd, setDragEnd] = useState(null);

  const periods = [
    { key: 'MORNING', label: TIME_PERIODS.MORNING.label },
    { key: 'AFTERNOON', label: TIME_PERIODS.AFTERNOON.label },
    { key: 'PRIME', label: TIME_PERIODS.PRIME.label },
  ];

  // Flatten all slots with timeIndex for drag tracking
  const allSlots = useMemo(() => {
    const slots = [];
    let timeIndex = 0;
    ['MORNING', 'AFTERNOON', 'PRIME'].forEach(period => {
      const periodSlots = grid.slots.filter(s => s.period === period);
      periodSlots.forEach(slot => {
        slots.push({ ...slot, timeIndex });
        timeIndex++;
      });
    });
    return slots;
  }, [grid.slots]);

  // Calculate selection range
  const selectionRange = useMemo(() => {
    if (!dragStart || !dragEnd) return null;
    const minCourt = Math.min(dragStart.court, dragEnd.court);
    const maxCourt = Math.max(dragStart.court, dragEnd.court);
    const minTimeIndex = Math.min(dragStart.timeIndex, dragEnd.timeIndex);
    const maxTimeIndex = Math.max(dragStart.timeIndex, dragEnd.timeIndex);
    return { minCourt, maxCourt, minTimeIndex, maxTimeIndex };
  }, [dragStart, dragEnd]);

  // Check if cell is selected
  const isCellSelected = (court, timeIndex) => {
    if (!selectionRange) return false;
    return (
      court >= selectionRange.minCourt &&
      court <= selectionRange.maxCourt &&
      timeIndex >= selectionRange.minTimeIndex &&
      timeIndex <= selectionRange.maxTimeIndex
    );
  };

  // Handle drag start (only on available cells)
  const handleMouseDown = (court, timeIndex, available, closed) => {
    if (!available || closed || !onEmptyCellClick) return;
    setIsDragging(true);
    setDragStart({ court, timeIndex });
    setDragEnd({ court, timeIndex });
  };

  // Handle drag move
  const handleMouseEnter = (court, timeIndex) => {
    if (isDragging) {
      setDragEnd({ court, timeIndex });
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd && selectionRange && onEmptyCellClick) {
      const { minCourt, maxCourt, minTimeIndex, maxTimeIndex } = selectionRange;

      // Get time values from slots
      const startSlot = allSlots[minTimeIndex];
      const endSlot = allSlots[maxTimeIndex];

      if (startSlot && endSlot) {
        // Calculate end time (1 hour after end slot start)
        const endHour = parseInt(endSlot.time.split(':')[0], 10) + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:00`;

        // Get selected courts
        const selectedCourts = [];
        for (let c = minCourt; c <= maxCourt; c++) {
          selectedCourts.push(c);
        }

        onEmptyCellClick({
          date: selectedDate,
          court: minCourt,
          courts: selectedCourts,
          time: startSlot.time,
          timeStart: startSlot.time,
          timeEnd: endTime,
          isMultiCourt: selectedCourts.length > 1,
        });
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Global mouseup listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragStart, dragEnd, selectionRange]);

  // Prevent text selection during drag
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => { document.body.style.userSelect = ''; };
  }, [isDragging]);

  // Court headers
  const courtHeaders = [];
  for (let i = 1; i <= TOTAL_COURTS; i++) {
    courtHeaders.push(i === CONFIG.STADIUM_COURT_NUMBER ? 'Stad' : String(i));
  }

  // Group slots by period for display
  const slotsByPeriod = {
    MORNING: allSlots.filter(s => s.period === 'MORNING'),
    AFTERNOON: allSlots.filter(s => s.period === 'AFTERNOON'),
    PRIME: allSlots.filter(s => s.period === 'PRIME'),
  };

  return (
    <div className="overflow-x-auto">
      {onEmptyCellClick && (
        <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
            Click or drag on green cells to book
          </span>
        </div>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-2 pr-2 font-medium text-gray-700 w-32"></th>
            {courtHeaders.map((court, idx) => (
              <th key={idx} className="text-center py-2 px-1 font-medium text-gray-600 min-w-[28px]">
                {court}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(({ key, label }) => {
            const periodSlots = slotsByPeriod[key];
            const openCount = periodSlots.reduce((sum, slot) =>
              sum + slot.courts.filter(c => c.available && !c.closed).length, 0
            );

            return (
              <React.Fragment key={key}>
                {/* Period header row */}
                <tr className="bg-gray-50">
                  <td colSpan={TOTAL_COURTS + 1} className="py-2 px-2 font-medium text-gray-700">
                    {label} - <span className="text-green-600">{openCount} slots open</span>
                  </td>
                </tr>
                {/* Time slots for this period */}
                {periodSlots.map(slot => (
                  <tr key={slot.time} className="border-b border-gray-100">
                    <td className="py-1 pr-2 text-gray-600">{slot.label}</td>
                    {slot.courts.map((court, idx) => {
                      const isSelected = isCellSelected(court.court, slot.timeIndex);
                      const isAvailable = court.available && !court.closed;

                      return (
                        <td key={idx} className="text-center py-1 px-1">
                          <div
                            onMouseDown={() => handleMouseDown(court.court, slot.timeIndex, court.available, court.closed)}
                            onMouseEnter={() => handleMouseEnter(court.court, slot.timeIndex)}
                            className={`w-5 h-5 mx-auto rounded transition-all ${
                              isSelected
                                ? 'bg-blue-500 ring-2 ring-blue-300 scale-110'
                                : court.closed
                                  ? 'bg-gray-300'
                                  : court.available
                                    ? 'bg-green-400 hover:bg-green-500 cursor-pointer'
                                    : 'bg-red-400'
                            } ${isAvailable && onEmptyCellClick ? 'cursor-pointer' : ''}`}
                            title={
                              court.closed
                                ? `Court ${court.court} - Closed`
                                : court.available
                                  ? `Court ${court.court} at ${slot.label} - Click to book`
                                  : `Court ${court.court} - Booked`
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-3 flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-400" /> Open (click to book)
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-400" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-300" /> Closed
        </span>
        {isDragging && (
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-blue-500" /> Selected
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Revenue Summary Card
 */
function RevenueCard({ revenue }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Revenue</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Expected</span>
          <span className="text-sm font-medium text-gray-900">{formatCurrency(revenue.expected)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Collected</span>
          <span className="text-sm font-medium text-green-600">{formatCurrency(revenue.collected)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Pending</span>
          <span className="text-sm font-medium text-amber-600">{formatCurrency(revenue.pending)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Contractors Today Card
 */
function ContractorsCard({ contractorData }) {
  if (contractorData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">Contractors Today</h3>
        </div>
        <div className="p-4 text-sm text-gray-500">
          No contractor bookings today
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Contractors Today</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {contractorData.map(contractor => {
          const courts = [...new Set(contractor.bookings.map(b => b.court))].sort((a, b) => a - b);
          const times = contractor.bookings.map(b => ({
            start: b.time_start,
            end: b.time_end,
          }));
          const minStart = times.reduce((min, t) => t.start < min ? t.start : min, '23:59');
          const maxEnd = times.reduce((max, t) => t.end > max ? t.end : max, '00:00');

          return (
            <div key={contractor.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900">{contractor.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                  Court{courts.length > 1 ? 's' : ''} {courts.join(', ')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">
                  {formatTimeForReport(minStart)} - {formatTimeForReport(maxEnd)}
                </span>
                <span className="text-sm font-medium text-gray-900 ml-4">
                  {contractor.totalHours} hr{contractor.totalHours !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Maintenance Summary Card with weekly grid and follow-ups as cards
 */
function MaintenanceCard({ selectedDate, maintenanceLog, maintenanceTasks, loading }) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get week containing selected date
  const getWeekDates = () => {
    const date = new Date(selectedDate + 'T12:00:00');
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(formatDateISO(d));
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const today = formatDateISO(new Date());

  const dailyTasks = maintenanceTasks.filter(t => t.frequency === 'daily');

  const getTaskStatus = (taskId, date) => {
    const entry = maintenanceLog.find(e =>
      e.task_id === taskId &&
      (e.date === date || e.completed_date === date) &&
      e.status === 'completed'
    );

    if (!entry) {
      if (date > today) return 'pending';
      return 'not_done';
    }

    if (entry.follow_up_needed === 'TRUE') return 'issue';
    return 'complete';
  };

  const followUps = maintenanceLog.filter(e =>
    e.follow_up_needed === 'TRUE'
  ).sort((a, b) => {
    const dateA = a.date || a.completed_date;
    const dateB = b.date || b.completed_date;
    return dateB.localeCompare(dateA);
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">Daily Maintenance</h3>
        </div>
        <div className="p-4 text-sm text-gray-500">Loading maintenance data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Daily Maintenance - Week Overview</h3>
      </div>
      <div className="p-4">
        {/* Weekly Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Task</th>
                {weekDates.map((date, i) => {
                  const dayName = DAYS[(i + 1) % 7];
                  const isToday = date === today;
                  return (
                    <th
                      key={date}
                      className={`text-center py-2 px-2 font-medium ${isToday ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      {dayName}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {dailyTasks.slice(0, 6).map(task => (
                <tr key={task.task_id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-900 truncate max-w-[200px]" title={task.task_name}>
                    {task.task_name}
                  </td>
                  {weekDates.map((date, i) => {
                    const status = getTaskStatus(task.task_id, date);
                    const isToday = date === today;
                    return (
                      <td
                        key={date}
                        className={`text-center py-2 px-2 ${isToday ? 'bg-green-50' : ''}`}
                      >
                        <StatusIcon status={status} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span><StatusIcon status="complete" /> Complete</span>
          <span><StatusIcon status="issue" /> Issue Found</span>
          <span><StatusIcon status="not_done" /> Not Done</span>
          <span><StatusIcon status="pending" /> Pending</span>
        </div>

        {/* Follow-ups as Cards */}
        {followUps.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-amber-700 mb-3">
              ⚠️ Open Follow-ups ({followUps.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {followUps.slice(0, 6).map((entry, idx) => (
                <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-amber-900 line-clamp-2">
                    {entry.court && entry.court !== 'all' ? `Ct ${entry.court}: ` : ''}
                    {entry.follow_up_note || entry.task_name}
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    {entry.date || entry.completed_date} • {entry.completed_by}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Status icon for maintenance grid
 */
function StatusIcon({ status }) {
  switch (status) {
    case 'complete':
      return <span className="text-green-600">✓</span>;
    case 'issue':
      return <span className="text-amber-600">⚠</span>;
    case 'not_done':
      return <span className="text-red-600">✗</span>;
    case 'pending':
      return <span className="text-gray-400">○</span>;
    default:
      return <span className="text-gray-300">—</span>;
  }
}
