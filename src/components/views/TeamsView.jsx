import { useState, useMemo } from 'react';
import { useTeams } from '../../hooks/useTeams.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import { formatDateDisplay, formatTimeDisplay, formatDateISO, addDays } from '../../utils/dateHelpers.js';
import { getBookingTypeLabel } from '../../utils/colors.js';

/**
 * Teams & Tournaments view
 */
export default function TeamsView({ onBookingClick }) {
  const { teams, activeTeams, loading: teamsLoading } = useTeams();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();

  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'tournaments'

  // Get upcoming team bookings
  const today = formatDateISO(new Date());
  const next90Days = formatDateISO(addDays(new Date(), 90));

  const teamBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b.booking_type?.startsWith('team_')) return false;
      if (b.status === 'cancelled') return false;
      if (b.date < today) return false;
      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, today]);

  const tournamentBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.booking_type !== 'tournament') return false;
      if (b.status === 'cancelled') return false;
      if (b.date < today || b.date > next90Days) return false;
      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, today, next90Days]);

  const loading = teamsLoading || bookingsLoading;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-900">Teams & Tournaments</h2>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'teams'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Teams ({activeTeams.length})
        </button>
        <button
          onClick={() => setActiveTab('tournaments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tournaments'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Upcoming Tournaments ({tournamentBookings.length})
        </button>
      </div>

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {/* Teams List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTeams.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No active teams found
              </div>
            ) : (
              activeTeams.map((team) => (
                <TeamCard key={team.team_id} team={team} />
              ))
            )}
          </div>

          {/* Upcoming Team Bookings */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Upcoming Team Bookings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Team/Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Court
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Booking ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No upcoming team bookings
                      </td>
                    </tr>
                  ) : (
                    teamBookings.slice(0, 20).map((booking) => (
                      <tr
                        key={booking.booking_id}
                        onClick={() => onBookingClick?.(booking)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateDisplay(booking.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatTimeDisplay(booking.time_start)} - {formatTimeDisplay(booking.time_end)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">
                            {booking.customer_name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getBookingTypeLabel(booking.booking_type)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getCourtName(parseInt(booking.court, 10))}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">
                          {booking.booking_id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tournaments Tab */}
      {activeTab === 'tournaments' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Upcoming Tournaments (Next 90 Days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tournament
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Courts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Booking ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tournamentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No upcoming tournaments in the next 90 days
                    </td>
                  </tr>
                ) : (
                  tournamentBookings.map((booking) => (
                    <tr
                      key={booking.booking_id}
                      onClick={() => onBookingClick?.(booking)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateDisplay(booking.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatTimeDisplay(booking.time_start)} - {formatTimeDisplay(booking.time_end)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {booking.customer_name || 'Tournament'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getCourtName(parseInt(booking.court, 10))}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {booking.booking_id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{team.team_name}</h4>
          <p className="text-sm text-gray-500">
            {team.team_type === 'team_hs' ? 'High School' :
             team.team_type === 'team_college' ? 'College' :
             team.team_type === 'team_usta' ? 'USTA League' : 'Team'}
          </p>
        </div>
        <span className={`
          px-2 py-1 text-xs font-medium rounded-full
          ${team.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
        `}>
          {team.status || 'Active'}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        {team.school_name && (
          <div>
            <span className="text-gray-500">School:</span> {team.school_name}
          </div>
        )}
        {team.contact_name && (
          <div>
            <span className="text-gray-500">Contact:</span> {team.contact_name}
          </div>
        )}
        {team.contact_phone && (
          <div>
            <span className="text-gray-500">Phone:</span> {team.contact_phone}
          </div>
        )}
        {team.default_courts && (
          <div>
            <span className="text-gray-500">Default Courts:</span> {team.default_courts}
          </div>
        )}
        {team.season_start && team.season_end && (
          <div>
            <span className="text-gray-500">Season:</span>{' '}
            {formatDateDisplay(team.season_start)} - {formatDateDisplay(team.season_end)}
          </div>
        )}
      </div>
    </div>
  );
}
