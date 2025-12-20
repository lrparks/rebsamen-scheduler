import { useState, useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useTeams } from '../../hooks/useTeams.js';
import { formatDateISO, formatDateDisplay } from '../../utils/dateHelpers.js';
import { getBookingDurationHours } from '../../utils/reportUtils.js';
import Select from '../common/Select.jsx';

/**
 * Format currency with 2 decimal places for invoices
 */
function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Category labels for display
const CATEGORY_LABELS = {
  'usta_adult': 'USTA Adult',
  'team_hs': 'High School',
  'College': 'College',
  'Rebsamen': 'Rebsamen League',
  'Other': 'Other',
  // Legacy mappings
  'high_school': 'High School',
  'college': 'College',
  'team_college': 'College',
  'team_usta': 'USTA League',
  'team_other': 'Other',
};

/**
 * Get team invoice data - detailed breakdown of bookings with hours and rates
 * Uses team's court_rate for calculations
 * @param {Array} bookings - All bookings
 * @param {Array} teams - Teams list
 * @param {string} teamId - Team ID to filter
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {object}
 */
function getTeamInvoiceData(bookings, teams, teamId, startDate, endDate) {
  const team = teams?.find(t => t.team_id === teamId);
  const courtRate = team?.court_rate ? parseFloat(team.court_rate) : 0;

  const teamBookings = bookings.filter(b =>
    b.entity_id === teamId &&
    b.booking_type?.startsWith('team_') &&
    b.status !== 'cancelled' &&
    b.date >= startDate &&
    b.date <= endDate
  ).sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start));

  const lineItems = teamBookings.map(booking => {
    const hours = getBookingDurationHours(booking);
    // Calculate using team's court_rate: hours * rate per court
    const total = hours * courtRate;

    return {
      booking_id: booking.booking_id,
      date: booking.date,
      time_start: booking.time_start,
      time_end: booking.time_end,
      court: booking.court,
      hours,
      rate: courtRate,
      total,
    };
  });

  // Calculate totals
  const totalHours = lineItems.reduce((sum, item) => sum + item.hours, 0);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

  return {
    team,
    teamName: team?.team_name || team?.name || 'Unknown Team',
    teamType: team?.team_type || '', // Display type (Spring, Mixed Doubles, etc.)
    teamCategory: team?.team_category || '', // Category (usta_adult, team_hs, etc.)
    teamYear: team?.team_year || '',
    courtRate,
    lineItems,
    summary: {
      totalHours,
      totalAmount,
      bookingCount: lineItems.length,
    },
  };
}

/**
 * Format time for display
 */
function formatTime(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return minutes === 0 ? `${displayHour}${period}` : `${displayHour}:${String(minutes).padStart(2, '0')}${period}`;
}

/**
 * Invoice Report - Generate invoices for team court usage
 */
export default function InvoiceReport({ startDate, endDate }) {
  const { bookings, loading } = useBookingsContext();
  const { teams, loading: teamsLoading } = useTeams();
  const [selectedTeamType, setSelectedTeamType] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Get unique team categories for dropdown
  const teamTypeOptions = useMemo(() => {
    if (!teams?.length) return [];
    const categories = [...new Set(teams
      .filter(t => t.is_active !== 'FALSE' && t.is_active !== false)
      .map(t => t.team_category)
      .filter(Boolean)
    )];
    return categories.map(category => ({
      value: category,
      label: CATEGORY_LABELS[category] || category,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [teams]);

  // Filter teams by selected category
  const filteredTeams = useMemo(() => {
    if (!teams?.length) return [];
    return teams
      .filter(t => t.is_active !== 'FALSE' && t.is_active !== false)
      .filter(t => !selectedTeamType || t.team_category === selectedTeamType);
  }, [teams, selectedTeamType]);

  // Build team options for dropdown (filtered by type)
  const teamOptions = useMemo(() => {
    return filteredTeams
      .map(t => ({
        value: t.team_id,
        label: t.team_name || t.name,
        courtRate: t.court_rate,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredTeams]);

  // Reset team selection when type changes
  const handleTeamTypeChange = (type) => {
    setSelectedTeamType(type);
    setSelectedTeamId('');
  };

  // Get invoice data for selected team
  const invoiceData = useMemo(() => {
    if (!selectedTeamId || !bookings?.length) return null;
    return getTeamInvoiceData(bookings, teams, selectedTeamId, startDate, endDate);
  }, [bookings, teams, selectedTeamId, startDate, endDate]);

  if (loading || teamsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Type & Team Selectors */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 no-print">
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <Select
              label="Category"
              value={selectedTeamType}
              onChange={handleTeamTypeChange}
              options={teamTypeOptions}
              placeholder="All Categories"
            />
          </div>
          <div className="w-64">
            <Select
              label="Select Team"
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              options={teamOptions}
              placeholder="Choose a team..."
            />
          </div>
          {selectedTeamId && invoiceData && (
            <div className="flex items-end pb-2">
              <span className="text-sm text-gray-500">
                Court Rate: <span className="font-semibold text-green-600">
                  {invoiceData.courtRate > 0 ? `$${invoiceData.courtRate.toFixed(2)}/hr` : 'Not set'}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Content */}
      {selectedTeamId && invoiceData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 print:border-0 print:shadow-none">
          {/* Invoice Header */}
          <div className="border-b border-gray-200 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Court Usage Invoice</h2>
                <p className="text-gray-600 mt-1">Rebsamen Tennis Center</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-medium">{formatDateDisplay(formatDateISO(new Date()))}</p>
              </div>
            </div>
          </div>

          {/* Team Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{invoiceData.teamName}</h3>
            {(invoiceData.teamType || invoiceData.teamCategory) && (
              <p className="text-sm text-gray-500">
                {invoiceData.teamType && `${invoiceData.teamType}`}
                {invoiceData.teamType && invoiceData.teamCategory && ' • '}
                {invoiceData.teamCategory && (CATEGORY_LABELS[invoiceData.teamCategory] || invoiceData.teamCategory)}
                {invoiceData.teamYear && ` (${invoiceData.teamYear})`}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Period: {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
            </p>
            <p className="text-sm text-gray-500">
              Rate: ${invoiceData.courtRate.toFixed(2)} per court hour
            </p>
          </div>

          {/* Line Items Table */}
          {invoiceData.lineItems.length > 0 ? (
            <>
              <table className="w-full mb-6">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Time</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Court</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">Hours</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">Rate</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lineItems.map((item, idx) => (
                    <tr key={item.booking_id || idx} className="border-b border-gray-100">
                      <td className="py-2 text-sm text-gray-900">
                        {formatDateDisplay(item.date)}
                      </td>
                      <td className="py-2 text-sm text-gray-600">
                        {formatTime(item.time_start)} - {formatTime(item.time_end)}
                      </td>
                      <td className="py-2 text-sm text-gray-600 text-center">
                        {item.court === 17 || item.court === '17' ? 'Stadium' : item.court}
                      </td>
                      <td className="py-2 text-sm text-gray-900 text-right">
                        {item.hours.toFixed(1)}
                      </td>
                      <td className="py-2 text-sm text-gray-600 text-right">
                        ${item.rate.toFixed(2)}
                      </td>
                      <td className="py-2 text-sm font-medium text-gray-900 text-right">
                        {formatMoney(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-end">
                  <div className="w-72">
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-gray-600">Total Court Hours:</span>
                      <span className="text-sm font-medium">{invoiceData.summary.totalHours.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-sm text-gray-600">Rate per Court Hour:</span>
                      <span className="text-sm font-medium">${invoiceData.courtRate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                      <span className="text-base font-semibold text-gray-900">Total Due:</span>
                      <span className="text-base font-bold text-green-600">
                        {formatMoney(invoiceData.summary.totalAmount)}
                      </span>
                    </div>
                    {invoiceData.courtRate === 0 && (
                      <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
                        Note: Court rate is not set for this team. Please update the team's court rate to calculate invoice totals.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
                <p>Thank you for using Rebsamen Tennis Center</p>
                <p className="mt-1">Payment due within 30 days of invoice date</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No court usage found for this team during the selected period.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedTeamId && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Generate Team Invoice</h3>
          <p className="text-gray-500">Select a team type and team from the dropdowns above to generate an invoice for their court usage.</p>
        </div>
      )}
    </div>
  );
}
