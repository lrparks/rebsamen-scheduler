import { useState, useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useContractors } from '../../hooks/useContractors.js';
import { formatDateDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import {
  getDailyUtilization,
  getDailyRevenue,
  getDailyActivity,
  getContractorHoursForDate,
  getAvailableSlots,
  formatCurrency,
  formatTimeForReport,
  TIME_PERIODS,
  getBookingDurationHours,
} from '../../utils/reportUtils.js';
import { fetchMaintenanceLog, fetchMaintenanceTasks } from '../../utils/api.js';
import { useEffect } from 'react';

/**
 * Daily Dashboard Report - Real-time operational metrics
 */
export default function DailyDashboard({ selectedDate }) {
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

  // Calculate all metrics
  const utilization = useMemo(() =>
    getDailyUtilization(bookings, selectedDate),
    [bookings, selectedDate]
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

  const availableSlots = useMemo(() =>
    getAvailableSlots(bookings, closures, selectedDate),
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

      {/* Utilization Section */}
      <UtilizationCard utilization={utilization} availableSlots={availableSlots} />

      {/* Revenue & Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueCard revenue={revenue} />
        <ActivityCard activity={activity} />
      </div>

      {/* Contractors Today */}
      <ContractorsCard
        contractorData={contractorData}
        bookings={bookings}
        selectedDate={selectedDate}
      />

      {/* Maintenance Summary */}
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
 * Utilization Card with expandable available slots
 */
function UtilizationCard({ utilization, availableSlots }) {
  const [showAvailable, setShowAvailable] = useState(false);

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
              <th className="pb-2 text-right">Available</th>
              <th className="pb-2 text-right">Utilization</th>
              <th className="pb-2 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {['MORNING', 'AFTERNOON', 'PRIME'].map(period => (
              <tr key={period}>
                <td className="py-2 text-sm text-gray-900">{utilization[period].label}</td>
                <td className="py-2 text-sm text-gray-600 text-right">
                  {utilization[period].booked}/{utilization[period].total}
                </td>
                <td className="py-2 text-sm text-gray-600 text-right">
                  {utilization[period].available} slots
                </td>
                <td className="py-2 text-sm font-medium text-right">
                  <span className={utilization[period].utilization >= 80 ? 'text-green-600' : ''}>
                    {utilization[period].utilization}%
                  </span>
                </td>
                <td className="py-2">
                  <UtilizationBar percentage={utilization[period].utilization} />
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-medium">
              <td className="py-2 text-sm text-gray-900">TOTAL</td>
              <td className="py-2 text-sm text-gray-900 text-right">
                {utilization.TOTAL.booked}/{utilization.TOTAL.total}
              </td>
              <td className="py-2 text-sm text-gray-900 text-right">
                {utilization.TOTAL.available} slots
              </td>
              <td className="py-2 text-sm font-medium text-right">
                {utilization.TOTAL.utilization}%
              </td>
              <td className="py-2">
                <UtilizationBar percentage={utilization.TOTAL.utilization} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Available Slots Toggle */}
        <button
          onClick={() => setShowAvailable(!showAvailable)}
          className="mt-4 flex items-center gap-2 text-sm text-green-700 hover:text-green-800"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAvailable ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showAvailable ? 'Hide' : 'View'} Available Slots ({utilization.TOTAL.available})
        </button>

        {/* Available Slots Panel */}
        {showAvailable && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <AvailableSlotsPanel availableSlots={availableSlots} />
          </div>
        )}
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
 * Available Slots Panel showing open courts by time
 */
function AvailableSlotsPanel({ availableSlots }) {
  const periods = [
    { key: 'MORNING', label: TIME_PERIODS.MORNING.label },
    { key: 'AFTERNOON', label: TIME_PERIODS.AFTERNOON.label },
    { key: 'PRIME', label: TIME_PERIODS.PRIME.label },
  ];

  return (
    <div className="space-y-4">
      {periods.map(({ key, label }) => {
        const slots = availableSlots[key];
        const times = Object.keys(slots).sort();
        const totalSlots = times.reduce((sum, time) => sum + slots[time].length, 0);

        if (times.length === 0) {
          return (
            <div key={key}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {label} - <span className="text-red-600">Fully Booked</span>
              </h4>
            </div>
          );
        }

        return (
          <div key={key}>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {label} - {totalSlots} slots open
              {totalSlots < 10 && <span className="ml-2 text-amber-600">⚠️ Limited</span>}
            </h4>
            <div className="space-y-1 pl-4">
              {times.map(time => (
                <div key={time} className="text-sm">
                  <span className="text-gray-600 w-16 inline-block">{formatTimeForReport(time)}:</span>
                  <span className="text-gray-900">
                    {slots[time].length > 5
                      ? `Courts ${slots[time].slice(0, 5).join(', ')} +${slots[time].length - 5} more`
                      : `Court${slots[time].length > 1 ? 's' : ''} ${slots[time].join(', ')}`
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
 * Contractors Today Card
 */
function ContractorsCard({ contractorData, bookings, selectedDate }) {
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
          // Get court and time info
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
 * Maintenance Summary Card with weekly grid and follow-ups
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

  // Get daily tasks only for the grid
  const dailyTasks = maintenanceTasks.filter(t => t.frequency === 'daily');

  // Check if a task was completed on a date
  const getTaskStatus = (taskId, date) => {
    const entry = maintenanceLog.find(e =>
      e.task_id === taskId &&
      (e.date === date || e.completed_date === date) &&
      e.status === 'completed'
    );

    if (!entry) {
      // If date is in the future, it's pending
      if (date > today) return 'pending';
      // If date is today or past and not done, it's not done
      return 'not_done';
    }

    // Check if there's a follow-up needed
    if (entry.follow_up_needed === 'TRUE') return 'issue';
    return 'complete';
  };

  // Get all follow-up items
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
                  const dayName = DAYS[(i + 1) % 7]; // Mon = 0 in our array
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

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-amber-700 mb-2">
              ⚠️ Open Follow-ups ({followUps.length})
            </h4>
            <div className="space-y-2">
              {followUps.slice(0, 5).map((entry, idx) => (
                <div key={idx} className="text-sm bg-amber-50 rounded p-2">
                  <div className="font-medium text-amber-900">
                    {entry.court && entry.court !== 'all' ? `Court ${entry.court}: ` : ''}
                    {entry.follow_up_note || entry.task_name}
                  </div>
                  <div className="text-xs text-amber-700">
                    Found: {entry.date || entry.completed_date} by {entry.completed_by}
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
