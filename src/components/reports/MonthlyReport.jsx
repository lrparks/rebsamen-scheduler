import { useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useContractors } from '../../hooks/useContractors.js';
import { useTournaments } from '../../hooks/useTournaments.js';
import { useConfig } from '../../hooks/useConfig.js';
import { formatDateISO } from '../../utils/dateHelpers.js';
import {
  getMonthEnd,
  getMonthlyComparison,
  getYearOverYearComparison,
  getParticipationComparison,
  getRevenueForRange,
  getBookingEfficiency,
  getContractorHoursForRange,
  getParticipationMetrics,
  getTotalCourtHours,
  getRevenuePerCourtHour,
  getWaivedValue,
  getTournamentMetrics,
  getYTDRange,
  getCancellationBreakdown,
  formatCurrency,
  TIME_PERIODS,
  getTotalSlotsForPeriod,
} from '../../utils/reportUtils.js';
import { parseTimeToMinutes } from '../../utils/timeUtils.js';

/**
 * Monthly Performance Report - Board-level reporting
 */
export default function MonthlyReport({ monthStart }) {
  const { bookings, loading } = useBookingsContext();
  const { contractors } = useContractors();
  const { tournaments } = useTournaments();
  const { getConfigValue } = useConfig();

  // Date calculations
  const startDate = formatDateISO(monthStart);
  const endDate = formatDateISO(getMonthEnd(monthStart));
  const ytdRange = getYTDRange(monthStart);

  // Config values
  const revenueTarget = parseFloat(getConfigValue('monthly_revenue_target')) || 0;
  const utilizationTarget = parseFloat(getConfigValue('utilization_target_overall')) || 0;
  const primeUtilizationTarget = parseFloat(getConfigValue('utilization_target_prime')) || 0;
  const operatingExpenses = parseFloat(getConfigValue('operating_expenses')) || 0;

  // Month name for display
  const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Core metrics
  const comparison = useMemo(() =>
    getMonthlyComparison(bookings, monthStart),
    [bookings, monthStart]
  );

  const yoyComparison = useMemo(() =>
    getYearOverYearComparison(bookings, monthStart),
    [bookings, monthStart]
  );

  const participationComparison = useMemo(() =>
    getParticipationComparison(bookings, monthStart),
    [bookings, monthStart]
  );

  const revenue = useMemo(() =>
    getRevenueForRange(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const efficiency = useMemo(() =>
    getBookingEfficiency(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const cancellations = useMemo(() =>
    getCancellationBreakdown(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const contractorData = useMemo(() =>
    getContractorHoursForRange(bookings, contractors, startDate, endDate),
    [bookings, contractors, startDate, endDate]
  );

  const participation = useMemo(() =>
    getParticipationMetrics(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const courtHours = useMemo(() =>
    getTotalCourtHours(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const waivedValue = useMemo(() =>
    getWaivedValue(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const tournamentMetrics = useMemo(() =>
    getTournamentMetrics(bookings, tournaments, startDate, endDate),
    [bookings, tournaments, startDate, endDate]
  );

  const ytdTournamentMetrics = useMemo(() =>
    getTournamentMetrics(bookings, tournaments, ytdRange.start, ytdRange.end),
    [bookings, tournaments, ytdRange.start, ytdRange.end]
  );

  // Utilization by time period
  const utilizationByPeriod = useMemo(() => {
    const monthBookings = bookings.filter(b =>
      b.date >= startDate &&
      b.date <= endDate &&
      b.status !== 'cancelled'
    );

    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

    const periodStats = {};
    Object.keys(TIME_PERIODS).forEach(periodKey => {
      const period = TIME_PERIODS[periodKey];
      const totalSlots = getTotalSlotsForPeriod(periodKey) * daysInMonth;

      let bookedHours = 0;
      monthBookings.forEach(b => {
        const bookingStart = parseTimeToMinutes(b.time_start);
        const bookingEnd = parseTimeToMinutes(b.time_end);
        const periodStart = parseTimeToMinutes(period.start);
        const periodEnd = parseTimeToMinutes(period.end);

        const overlapStart = Math.max(bookingStart, periodStart);
        const overlapEnd = Math.min(bookingEnd, periodEnd);
        if (overlapStart < overlapEnd) {
          bookedHours += (overlapEnd - overlapStart) / 60;
        }
      });

      periodStats[periodKey] = {
        label: period.label,
        booked: Math.round(bookedHours),
        total: totalSlots,
        utilization: totalSlots > 0 ? Math.round((bookedHours / totalSlots) * 100) : 0,
      };
    });

    return periodStats;
  }, [bookings, startDate, endDate, monthStart]);

  // Cost recovery calculation
  const costRecovery = operatingExpenses > 0
    ? Math.round((revenue.total / operatingExpenses) * 100)
    : null;

  // Revenue per court hour
  const revenuePerHour = getRevenuePerCourtHour(revenue.total, courtHours);

  // Total contractor hours and percentage
  const totalContractorHours = contractorData.reduce((sum, c) => sum + c.totalHours, 0);
  const contractorPercentage = courtHours > 0
    ? Math.round((totalContractorHours / courtHours) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading report data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 monthly-report">
      {/* Print Header */}
      <div className="print-header hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Rebsamen Tennis Center</h1>
        <h2 className="text-xl">Monthly Performance Report - {monthName}</h2>
        <p className="text-sm text-gray-600">Generated {new Date().toLocaleDateString()}</p>
      </div>

      {/* Row 1: Key Metrics, Utilization, Participation - 33/33/33 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ExecutiveMetricsCard
          courtHours={courtHours}
          revenue={revenue.total}
          revenueTarget={revenueTarget}
          costRecovery={costRecovery}
          comparison={comparison}
          yoyComparison={yoyComparison}
        />
        <UtilizationCard
          utilizationByPeriod={utilizationByPeriod}
          overallUtilization={comparison.thisMonth.utilization}
          primeUtilization={comparison.thisMonth.primeUtilization}
          utilizationTarget={utilizationTarget}
          primeUtilizationTarget={primeUtilizationTarget}
          comparison={comparison}
          yoyComparison={yoyComparison}
        />
        <ParticipationCard
          participation={participation}
          participationComparison={participationComparison}
        />
      </div>

      {/* Row 2: Tournaments - Full Width */}
      <TournamentsCard
        monthMetrics={tournamentMetrics}
        ytdMetrics={ytdTournamentMetrics}
        monthName={monthName}
      />

      {/* Row 3: Financial, Booking Patterns, Contractor - 33/33/33 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FinancialCard
          revenue={revenue}
          revenuePerHour={revenuePerHour}
          waivedValue={waivedValue}
        />
        <BookingPatternsCard
          efficiency={efficiency}
          cancellations={cancellations}
        />
        <ContractorCard
          contractorData={contractorData}
          totalContractorHours={totalContractorHours}
          totalCourtHours={courtHours}
          contractorPercentage={contractorPercentage}
        />
      </div>
    </div>
  );
}

/**
 * Executive Metrics Card - Court Hours, Revenue, Cost Recovery
 */
function ExecutiveMetricsCard({ courtHours, revenue, revenueTarget, costRecovery, comparison, yoyComparison }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Key Metrics</h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Court Hours */}
        <div>
          <div className="text-2xl font-bold text-gray-900">{Math.round(courtHours)} hrs</div>
          <div className="text-sm text-gray-500">Court Hours Booked</div>
          <div className="mt-1 flex gap-3 text-xs">
            <ComparisonBadge label="MoM" value={comparison.change.hours} suffix=" hrs" />
            {yoyComparison.hasLastYearData ? (
              <ComparisonBadge label="YoY" value={yoyComparison.change.hours} suffix=" hrs" />
            ) : (
              <span className="text-gray-400">YoY: no data</span>
            )}
          </div>
        </div>

        {/* Revenue */}
        <div className="pt-3 border-t border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(revenue)}</div>
          <div className="text-sm text-gray-500">Total Revenue</div>
          {revenueTarget > 0 && (
            <div className="mt-1">
              <TargetProgress current={revenue} target={revenueTarget} />
            </div>
          )}
          <div className="mt-1 flex gap-3 text-xs">
            <ComparisonBadge label="MoM" value={comparison.change.revenue} isCurrency />
            {yoyComparison.hasLastYearData ? (
              <ComparisonBadge label="YoY" value={yoyComparison.change.revenue} isCurrency />
            ) : (
              <span className="text-gray-400">YoY: no data</span>
            )}
          </div>
        </div>

        {/* Cost Recovery */}
        <div className="pt-3 border-t border-gray-100">
          {costRecovery !== null ? (
            <>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-gray-900">{costRecovery}%</div>
                <span className={`text-sm ${costRecovery >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                  {costRecovery >= 100 ? 'Target met' : `${100 - costRecovery}% to break even`}
                </span>
              </div>
              <div className="text-sm text-gray-500">Cost Recovery</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-400">--</div>
              <div className="text-sm text-gray-500">Cost Recovery</div>
              <div className="text-xs text-gray-400">Set operating_expenses in config</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Combined Utilization Card - Overall stats + By Time Period
 */
function UtilizationCard({ utilizationByPeriod, overallUtilization, primeUtilization, utilizationTarget, primeUtilizationTarget, comparison, yoyComparison }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Utilization by Time Period</h3>
      </div>
      <div className="p-4">
        {/* Overall Summary */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">{overallUtilization}%</span>
              {utilizationTarget > 0 && (
                <span className={`text-xs ${overallUtilization >= utilizationTarget ? 'text-green-600' : 'text-amber-600'}`}>
                  (target: {utilizationTarget}%)
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">Overall</div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-green-600">{primeUtilization}%</span>
              {primeUtilizationTarget > 0 && (
                <span className={`text-xs ${primeUtilization >= primeUtilizationTarget ? 'text-green-600' : 'text-amber-600'}`}>
                  ({primeUtilizationTarget}%)
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">Prime Time</div>
          </div>
        </div>

        {/* MoM/YoY */}
        <div className="flex gap-4 text-xs mb-3 pb-3 border-b border-gray-100">
          <ComparisonBadge label="MoM" value={comparison.change.utilization} suffix="%" />
          {yoyComparison.hasLastYearData ? (
            <ComparisonBadge label="YoY" value={yoyComparison.change.hoursPercent} suffix="%" />
          ) : (
            <span className="text-gray-400">YoY: no data</span>
          )}
        </div>

        {/* By Time Period */}
        <div className="space-y-2">
          {Object.entries(utilizationByPeriod).map(([key, data]) => {
            const target = key === 'PRIME' ? primeUtilizationTarget : null;
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs text-gray-700">{data.label}</span>
                  <span className={`text-xs font-medium ${
                    target && data.utilization >= target ? 'text-green-600' :
                    target && data.utilization < target ? 'text-amber-600' : 'text-gray-900'
                  }`}>
                    {data.utilization}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      key === 'PRIME' ? 'bg-green-500' :
                      key === 'AFTERNOON' ? 'bg-blue-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${Math.min(data.utilization, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Combined Participation Card - Adult/Youth with MoM/YoY + Details
 */
function ParticipationCard({ participation, participationComparison }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Participation Details</h3>
      </div>
      <div className="p-4">
        {participation.total === 0 ? (
          <div className="text-sm text-gray-500">No participation data this month</div>
        ) : (
          <>
            {/* Adult/Youth Summary */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div>
                <div className="text-xl font-bold text-gray-900">{participation.adults}</div>
                <div className="text-xs text-gray-500">Adults</div>
                <div className="text-xs mt-0.5">
                  <ComparisonBadge label="MoM" value={participationComparison.momChange.adults} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{participation.youth}</div>
                <div className="text-xs text-gray-500">Youth</div>
                <div className="text-xs mt-0.5">
                  <ComparisonBadge label="MoM" value={participationComparison.momChange.youth} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-700">{participation.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>

            {/* YoY Comparison */}
            <div className="flex gap-4 text-xs mb-3 pb-3 border-b border-gray-100">
              {participationComparison.hasLastYearData ? (
                <>
                  <span className="text-gray-500">YoY:</span>
                  <ComparisonBadge label="Adults" value={participationComparison.yoyChange.adults} />
                  <ComparisonBadge label="Youth" value={participationComparison.yoyChange.youth} />
                </>
              ) : (
                <span className="text-gray-400">YoY: no data</span>
              )}
            </div>

            {/* Youth percentage bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Youth vs Adult</span>
                <span className="font-medium">{participation.youthPercentage}%</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2 flex overflow-hidden">
                <div
                  className="h-2 bg-blue-500"
                  style={{ width: `${participation.youthPercentage}%` }}
                />
              </div>
            </div>

            {/* Avg per booking */}
            <div className="text-xs text-gray-600">
              Avg per booking: <span className="font-medium">{participation.avgPerBooking}</span> players
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Financial Metrics Card
 */
function FinancialCard({ revenue, revenuePerHour, waivedValue }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Financial Metrics</h3>
      </div>
      <div className="p-4">
        {/* Revenue per hour */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="text-xl font-bold text-gray-900">{formatCurrency(revenuePerHour)}</div>
          <div className="text-sm text-gray-500">Revenue per Court Hour</div>
        </div>

        {/* Revenue by source */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Revenue by Source</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Court Rentals</span>
            <span className="font-medium">{formatCurrency(revenue.byType.courtRentals)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Contractors</span>
            <span className="font-medium">{formatCurrency(revenue.byType.contractors)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">League/Team</span>
            <span className="font-medium">{formatCurrency(revenue.byType.leagues)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tournament</span>
            <span className="font-medium">{formatCurrency(revenue.byType.tournaments)}</span>
          </div>
        </div>

        {/* Waived Value */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Waived Value</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{waivedValue.count} bookings ({Math.round(waivedValue.hours)} hrs)</span>
            <span className="font-medium text-amber-600">{formatCurrency(waivedValue.value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tournaments & Events Card - Full Width with Players
 */
function TournamentsCard({ monthMetrics, ytdMetrics, monthName }) {
  // Calculate total players from tournaments
  const monthPlayers = monthMetrics.tournaments.reduce((sum, t) => {
    return sum + (parseInt(t.players, 10) || 0);
  }, 0);
  const ytdPlayers = ytdMetrics.tournaments.reduce((sum, t) => {
    return sum + (parseInt(t.players, 10) || 0);
  }, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Tournaments & Events</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* This Month Stats */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-3">This Month</div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">{monthMetrics.eventsHosted}</div>
                <div className="text-sm text-gray-500">Events Hosted</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{Math.round(monthMetrics.courtHours)} hrs</div>
                <div className="text-sm text-gray-500">Court Hours</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{monthMetrics.courtsUsed}</div>
                <div className="text-sm text-gray-500">Courts Used</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">{monthPlayers || '--'}</div>
                <div className="text-sm text-gray-500">Players</div>
              </div>
            </div>
          </div>

          {/* YTD Stats */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-3">Year to Date</div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">{ytdMetrics.eventsHosted}</div>
                <div className="text-sm text-gray-500">Total Events</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{Math.round(ytdMetrics.courtHours)} hrs</div>
                <div className="text-sm text-gray-500">Court Hours</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{ytdMetrics.bookingCount}</div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">{ytdPlayers || '--'}</div>
                <div className="text-sm text-gray-500">Players</div>
              </div>
            </div>
          </div>

          {/* Events List - spans 2 columns */}
          <div className="md:col-span-2">
            <div className="text-xs font-medium text-gray-500 uppercase mb-3">Events This Month</div>
            {monthMetrics.tournaments.length === 0 ? (
              <div className="text-sm text-gray-500">No tournaments this month</div>
            ) : (
              <div className="space-y-2">
                {monthMetrics.tournaments.map(t => (
                  <div key={t.tournament_id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">
                        {t.start_date}{t.end_date && t.end_date !== t.start_date ? ` - ${t.end_date}` : ''}
                        {t.organizer && ` • ${t.organizer}`}
                      </div>
                    </div>
                    {t.players && (
                      <div className="text-right">
                        <div className="font-medium text-blue-600">{t.players}</div>
                        <div className="text-xs text-gray-500">players</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Booking Patterns Card
 */
function BookingPatternsCard({ efficiency, cancellations }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Booking Patterns</h3>
      </div>
      <div className="p-4">
        {efficiency.total === 0 ? (
          <div className="text-sm text-gray-500">No bookings this month</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{efficiency.completedRate}%</div>
                <div className="text-xs text-gray-500">Completion</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${efficiency.cancelledRate > 10 ? 'text-red-600' : 'text-gray-900'}`}>
                  {efficiency.cancelledRate}%
                </div>
                <div className="text-xs text-gray-500">Cancelled</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${efficiency.noShowRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                  {efficiency.noShowRate}%
                </div>
                <div className="text-xs text-gray-500">No-Show</div>
              </div>
            </div>

            {cancellations.total > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Cancellation Reasons ({cancellations.total})
                </div>
                <div className="space-y-1">
                  {cancellations.byReason.weather > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Weather</span>
                      <span className="font-medium">{cancellations.byReason.weather}</span>
                    </div>
                  )}
                  {cancellations.byReason.customer > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Customer</span>
                      <span className="font-medium">{cancellations.byReason.customer}</span>
                    </div>
                  )}
                  {cancellations.byReason.facility > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Facility</span>
                      <span className="font-medium">{cancellations.byReason.facility}</span>
                    </div>
                  )}
                  {cancellations.byReason.other > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Other</span>
                      <span className="font-medium">{cancellations.byReason.other}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Check-in Rate</span>
                <span className="font-medium">{efficiency.checkInRate}%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Contractor Utilization Card
 */
function ContractorCard({ contractorData, totalContractorHours, totalCourtHours, contractorPercentage }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-900">Contractor Utilization</h3>
          <span className="text-sm text-gray-500">
            {Math.round(totalContractorHours)} hrs ({contractorPercentage}% of total)
          </span>
        </div>
      </div>
      <div className="p-4">
        {contractorData.length === 0 ? (
          <div className="text-sm text-gray-500">No contractor bookings this month</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-700">Contractor</th>
                  <th className="text-right py-2 font-medium text-gray-700">Hours</th>
                  <th className="text-right py-2 font-medium text-gray-700">Revenue</th>
                  <th className="text-right py-2 font-medium text-gray-700">$/Hr</th>
                </tr>
              </thead>
              <tbody>
                {contractorData.map(contractor => {
                  const hourlyRate = contractor.totalHours > 0
                    ? contractor.revenue / contractor.totalHours
                    : 0;

                  return (
                    <tr key={contractor.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{contractor.name}</td>
                      <td className="py-2 text-right text-gray-900">{Math.round(contractor.totalHours)}</td>
                      <td className="py-2 text-right text-gray-900">{formatCurrency(contractor.revenue)}</td>
                      <td className="py-2 text-right text-gray-900">{formatCurrency(hourlyRate)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{Math.round(totalContractorHours)}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(contractorData.reduce((sum, c) => sum + c.revenue, 0))}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(
                      totalContractorHours > 0
                        ? contractorData.reduce((sum, c) => sum + c.revenue, 0) / totalContractorHours
                        : 0
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Comparison Badge - Compact MoM/YoY indicator
 */
function ComparisonBadge({ label, value, suffix = '', isCurrency = false }) {
  if (value === 0) {
    return <span className="text-gray-400">{label}: —</span>;
  }

  const isPositive = value > 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const prefix = isPositive ? '+' : '';

  return (
    <span className={color}>
      {label}: {prefix}{isCurrency ? formatCurrency(value) : Math.round(value)}{suffix}
    </span>
  );
}

/**
 * Target progress indicator
 */
function TargetProgress({ current, target }) {
  const percentage = Math.round((current / target) * 100);
  const isOnTarget = current >= target;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={isOnTarget ? 'text-green-600' : 'text-amber-600'}>
          {percentage}% of target
        </span>
        <span className="text-gray-500">{formatCurrency(target)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${isOnTarget ? 'bg-green-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
