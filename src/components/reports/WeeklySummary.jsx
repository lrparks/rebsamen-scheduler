import { useMemo, useState, useEffect } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useContractors } from '../../hooks/useContractors.js';
import { useTeams } from '../../hooks/useTeams.js';
import { formatDateISO } from '../../utils/dateHelpers.js';
import {
  getWeekEnd,
  getWeeklyComparison,
  getBookingTypeBreakdown,
  getRevenueForRange,
  getBookingEfficiency,
  getContractorHoursForRange,
  getTeamHoursForRange,
  getParticipationMetrics,
  formatCurrency,
} from '../../utils/reportUtils.js';
import { fetchMaintenanceLog, fetchMaintenanceTasks } from '../../utils/api.js';

/**
 * Weekly Summary Report - Week over week comparison
 */
export default function WeeklySummary({ weekStart }) {
  const { bookings, loading } = useBookingsContext();
  const { contractors } = useContractors();
  const { teams } = useTeams();

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

  // Calculate date range
  const startDate = formatDateISO(weekStart);
  const endDate = formatDateISO(getWeekEnd(weekStart));

  // Calculate all metrics
  const comparison = useMemo(() =>
    getWeeklyComparison(bookings, weekStart),
    [bookings, weekStart]
  );

  const typeBreakdown = useMemo(() =>
    getBookingTypeBreakdown(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const revenue = useMemo(() =>
    getRevenueForRange(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const efficiency = useMemo(() =>
    getBookingEfficiency(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const topContractors = useMemo(() =>
    getContractorHoursForRange(bookings, contractors, startDate, endDate),
    [bookings, contractors, startDate, endDate]
  );

  const topTeams = useMemo(() =>
    getTeamHoursForRange(bookings, teams, startDate, endDate),
    [bookings, teams, startDate, endDate]
  );

  const participation = useMemo(() =>
    getParticipationMetrics(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  // Get last week's contractor hours for comparison
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = formatDateISO(lastWeekStart);
  const lastWeekEndStr = formatDateISO(getWeekEnd(lastWeekStart));

  const lastWeekContractors = useMemo(() =>
    getContractorHoursForRange(bookings, contractors, lastWeekStartStr, lastWeekEndStr),
    [bookings, contractors, lastWeekStartStr, lastWeekEndStr]
  );

  const lastWeekTeams = useMemo(() =>
    getTeamHoursForRange(bookings, teams, lastWeekStartStr, lastWeekEndStr),
    [bookings, teams, lastWeekStartStr, lastWeekEndStr]
  );

  const lastWeekParticipation = useMemo(() =>
    getParticipationMetrics(bookings, lastWeekStartStr, lastWeekEndStr),
    [bookings, lastWeekStartStr, lastWeekEndStr]
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
        <h1>Rebsamen Tennis Center - Weekly Summary</h1>
        <p>Week of {startDate} to {endDate}</p>
      </div>

      {/* Row 1: Utilization Summary & Booking Types (50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UtilizationComparisonCard comparison={comparison} />
        <BookingTypesCard breakdown={typeBreakdown} />
      </div>

      {/* Row 2: Revenue & Participation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueCard revenue={revenue} />
        <ParticipationCard
          participation={participation}
          lastWeekParticipation={lastWeekParticipation}
        />
      </div>

      {/* Row 3: Efficiency */}
      <div className="grid grid-cols-1 gap-4">
        <EfficiencyCard efficiency={efficiency} />
      </div>

      {/* Row 4: Top Contractors & Top Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopContractorsCard
          contractors={topContractors}
          lastWeekContractors={lastWeekContractors}
        />
        <TopTeamsCard
          teams={topTeams}
          lastWeekTeams={lastWeekTeams}
        />
      </div>

      {/* Maintenance Summary - Full Width */}
      <MaintenanceCard
        weekStart={weekStart}
        maintenanceLog={maintenanceLog}
        maintenanceTasks={maintenanceTasks}
        loading={maintenanceLoading}
      />
    </div>
  );
}

/**
 * Utilization Comparison Card
 */
function UtilizationComparisonCard({ comparison }) {
  const metrics = [
    { key: 'overall', label: 'Overall' },
    { key: 'prime', label: 'Prime Time' },
    { key: 'nonPrime', label: 'Non-Prime' },
    { key: 'weekend', label: 'Weekend' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Utilization Summary</h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="pb-2"></th>
              <th className="pb-2 text-right">This Week</th>
              <th className="pb-2 text-right">Last Week</th>
              <th className="pb-2 text-right">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metrics.map(({ key, label }) => (
              <tr key={key}>
                <td className="py-2 text-sm text-gray-900">{label}</td>
                <td className="py-2 text-sm text-gray-900 text-right font-medium">
                  {comparison.thisWeek[key]}%
                </td>
                <td className="py-2 text-sm text-gray-600 text-right">
                  {comparison.lastWeek[key]}%
                </td>
                <td className="py-2 text-sm text-right">
                  <ChangeIndicator value={comparison.change[key]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Change indicator with color coding
 */
function ChangeIndicator({ value }) {
  if (value === 0) {
    return <span className="text-gray-500">—</span>;
  }

  const isPositive = value > 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const prefix = isPositive ? '+' : '';

  return (
    <span className={`font-medium ${color}`}>
      {prefix}{value}%
    </span>
  );
}

/**
 * Booking Types Breakdown Card
 */
function BookingTypesCard({ breakdown }) {
  const { breakdown: types, totalHours } = breakdown;

  // Sort by hours descending
  const sortedTypes = Object.entries(types)
    .filter(([_, data]) => data.hours > 0)
    .sort(([, a], [, b]) => b.hours - a.hours);

  const colors = {
    open: 'bg-blue-500',
    contractor: 'bg-purple-500',
    team: 'bg-orange-500',
    tournament: 'bg-red-500',
    maintenance: 'bg-gray-500',
    hold: 'bg-yellow-500',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">By Booking Type (hours)</h3>
      </div>
      <div className="p-4">
        {totalHours === 0 ? (
          <div className="text-sm text-gray-500">No bookings this week</div>
        ) : (
          <div className="space-y-3">
            {sortedTypes.map(([key, data]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{data.label}</span>
                  <span className="text-gray-900 font-medium">
                    {Math.round(data.hours)} hrs ({data.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colors[key] || 'bg-gray-400'}`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-medium">
              <span>Total</span>
              <span>{Math.round(totalHours)} hours</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Revenue Card
 */
function RevenueCard({ revenue }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Revenue</h3>
      </div>
      <div className="p-4">
        {/* Total Revenue */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(revenue.total)}
          </div>
          <div className="text-sm text-gray-500">Total Revenue</div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Court Rentals</span>
            <span className="font-medium">{formatCurrency(revenue.byType.courtRentals)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Contractors</span>
            <span className="font-medium">{formatCurrency(revenue.byType.contractors)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">League/Team Fees</span>
            <span className="font-medium">{formatCurrency(revenue.byType.leagues)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tournament</span>
            <span className="font-medium">{formatCurrency(revenue.byType.tournaments)}</span>
          </div>
        </div>

        {/* Collection Status */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Collected</span>
            <span className="font-medium text-green-600">{formatCurrency(revenue.collected)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pending</span>
            <span className="font-medium text-amber-600">{formatCurrency(revenue.pending)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Booking Efficiency Card
 */
function EfficiencyCard({ efficiency }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Booking Efficiency</h3>
      </div>
      <div className="p-4">
        {efficiency.total === 0 ? (
          <div className="text-sm text-gray-500">No bookings this week</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">{efficiency.total}</div>
              <div className="text-sm text-gray-500">Total Bookings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{efficiency.completedRate}%</div>
              <div className="text-sm text-gray-500">Completion Rate</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${efficiency.cancelledRate > 10 ? 'text-red-600' : 'text-gray-900'}`}>
                {efficiency.cancelled}
              </div>
              <div className="text-sm text-gray-500">Cancelled ({efficiency.cancelledRate}%)</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${efficiency.noShowRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                {efficiency.noShows}
              </div>
              <div className="text-sm text-gray-500">No-shows ({efficiency.noShowRate}%)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Participation Card
 */
function ParticipationCard({ participation, lastWeekParticipation }) {
  const change = participation.total - lastWeekParticipation.total;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Participation</h3>
      </div>
      <div className="p-4">
        {participation.total === 0 ? (
          <div className="text-sm text-gray-500">No participation data this week</div>
        ) : (
          <div className="space-y-4">
            {/* Total Participants */}
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{participation.total}</div>
                <div className="text-sm text-gray-500">Total Participants</div>
              </div>
              {change !== 0 && (
                <div className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change > 0 ? '+' : ''}{change} vs last week
                </div>
              )}
            </div>

            {/* Adult vs Youth breakdown */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Adults</span>
                <span className="font-medium">{participation.adults}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Youth (under 18)</span>
                <span className="font-medium text-blue-600">{participation.youth}</span>
              </div>
              {participation.total > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${participation.youthPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {participation.youthPercentage}% youth participation
                  </div>
                </div>
              )}
            </div>

            {/* Average per booking */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg per booking</span>
                <span className="font-medium">{participation.avgPerBooking} players</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Top Contractors Card
 */
function TopContractorsCard({ contractors, lastWeekContractors }) {
  // Create lookup for last week's hours
  const lastWeekMap = new Map(
    lastWeekContractors.map(c => [c.id, c.totalHours])
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Top Contractors (hours)</h3>
      </div>
      <div className="p-4">
        {contractors.length === 0 ? (
          <div className="text-sm text-gray-500">No contractor bookings this week</div>
        ) : (
          <div className="space-y-3">
            {contractors.slice(0, 5).map((contractor, index) => {
              const lastWeekHours = lastWeekMap.get(contractor.id) || 0;
              const change = contractor.totalHours - lastWeekHours;

              return (
                <div key={contractor.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm text-gray-900">{contractor.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(contractor.totalHours)} hrs
                    </span>
                    {change !== 0 && (
                      <span className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? '+' : ''}{Math.round(change)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="pt-3 border-t border-gray-200 flex justify-between text-sm font-medium">
              <span>Total Contractor Hours</span>
              <span>{Math.round(contractors.reduce((sum, c) => sum + c.totalHours, 0))} hrs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Top Teams Card
 */
function TopTeamsCard({ teams, lastWeekTeams }) {
  // Create lookup for last week's hours
  const lastWeekMap = new Map(
    lastWeekTeams.map(t => [t.id, t.totalHours])
  );

  // Format team type for display
  const formatTeamType = (type) => {
    const typeMap = {
      'team_usta': 'USTA',
      'team_hs': 'HS',
      'team_college': 'College',
      'team_other': 'Other',
    };
    return typeMap[type] || '';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Top Teams (hours)</h3>
      </div>
      <div className="p-4">
        {teams.length === 0 ? (
          <div className="text-sm text-gray-500">No team bookings this week</div>
        ) : (
          <div className="space-y-3">
            {teams.slice(0, 5).map((team, index) => {
              const lastWeekHours = lastWeekMap.get(team.id) || 0;
              const change = team.totalHours - lastWeekHours;

              return (
                <div key={team.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm text-gray-900">{team.name}</span>
                    {team.type && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {formatTeamType(team.type)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(team.totalHours)} hrs
                    </span>
                    {change !== 0 && (
                      <span className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? '+' : ''}{Math.round(change)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="pt-3 border-t border-gray-200 flex justify-between text-sm font-medium">
              <span>Total Team Hours</span>
              <span>{Math.round(teams.reduce((sum, t) => sum + t.totalHours, 0))} hrs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Maintenance Summary Card - Week Overview
 */
function MaintenanceCard({ weekStart, maintenanceLog, maintenanceTasks, loading }) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get week dates from weekStart
  const getWeekDates = () => {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
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

  // Get follow-ups for this week
  const weekFollowUps = maintenanceLog.filter(e => {
    if (e.follow_up_needed !== 'TRUE') return false;
    const entryDate = e.date || e.completed_date;
    return entryDate >= weekDates[0] && entryDate <= weekDates[6];
  }).sort((a, b) => {
    const dateA = a.date || a.completed_date;
    const dateB = b.date || b.completed_date;
    return dateB.localeCompare(dateA);
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">Weekly Maintenance</h3>
        </div>
        <div className="p-4 text-sm text-gray-500">Loading maintenance data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Weekly Maintenance</h3>
      </div>
      <div className="p-4">
        {/* Weekly Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-700">Task</th>
                {weekDates.map((date, i) => {
                  const isToday = date === today;
                  return (
                    <th
                      key={date}
                      className={`text-center py-2 px-2 font-medium ${isToday ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      {DAYS[i]}
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
                  {weekDates.map((date) => {
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

        {/* Follow-ups for this week */}
        {weekFollowUps.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-amber-700 mb-3">
              ⚠️ Follow-ups This Week ({weekFollowUps.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {weekFollowUps.slice(0, 6).map((entry, idx) => (
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
