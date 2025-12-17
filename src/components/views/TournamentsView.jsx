import { useState, useMemo } from 'react';
import { useTournaments } from '../../hooks/useTournaments.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import { formatDateDisplay, formatTimeDisplay, formatDateISO, addDays } from '../../utils/dateHelpers.js';

/**
 * Tournaments management view
 */
export default function TournamentsView({ onBookingClick }) {
  const { tournaments, upcomingTournaments, loading: tournamentsLoading, error } = useTournaments();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'all', 'bookings'

  // Get tournament bookings
  const today = formatDateISO(new Date());
  const next90Days = formatDateISO(addDays(new Date(), 90));

  const tournamentBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.booking_type !== 'tournament') return false;
      if (b.status === 'cancelled') return false;
      if (b.date < today) return false;
      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, today]);

  // Past tournaments
  const pastTournaments = tournaments.filter(t => {
    if (!t.end_date) return false;
    const endDate = new Date(t.end_date + 'T23:59:59');
    return endDate < new Date();
  }).sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''));

  const loading = tournamentsLoading || bookingsLoading;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-900">Tournaments</h2>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800">Tournaments Setup Required</h4>
          <p className="text-sm text-yellow-700 mt-1">
            To use this feature, create a "Tournaments" tab in your Google Sheet with these columns:
          </p>
          <code className="text-xs bg-yellow-100 px-2 py-1 rounded mt-2 block overflow-x-auto">
            tournament_id, name, organizer, contact_name, contact_phone, contact_email, start_date, end_date, default_courts, status, notes, created_at
          </code>
          <p className="text-xs text-yellow-600 mt-2">
            Then publish the sheet and update the tournaments URL in config.js with the correct GID.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Upcoming ({upcomingTournaments.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bookings'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Court Bookings ({tournamentBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Tournaments ({tournaments.length})
        </button>
      </div>

      {/* Upcoming Tournaments Tab */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tournaments...</div>
          ) : upcomingTournaments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No upcoming tournaments found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.tournament_id} tournament={tournament} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Court Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Tournament Court Bookings</h3>
            <p className="text-sm text-gray-500">Court reservations for tournament events</p>
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
                    Court
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
                      No tournament bookings found
                    </td>
                  </tr>
                ) : (
                  tournamentBookings.slice(0, 30).map((booking) => (
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

      {/* All Tournaments Tab */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          {/* Active/Upcoming */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Active & Upcoming</h3>
            {upcomingTournaments.length === 0 ? (
              <p className="text-gray-500 text-sm">No active tournaments</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTournaments.map((tournament) => (
                  <TournamentCard key={tournament.tournament_id} tournament={tournament} />
                ))}
              </div>
            )}
          </div>

          {/* Past Tournaments */}
          {pastTournaments.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Past Tournaments</h3>
              <div className="bg-white rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tournament
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Dates
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Organizer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pastTournaments.slice(0, 10).map((tournament) => (
                      <tr key={tournament.tournament_id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {tournament.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDateDisplay(tournament.start_date)} - {formatDateDisplay(tournament.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {tournament.organizer || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            {tournament.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tournament card component
 */
function TournamentCard({ tournament }) {
  const isCurrentlyRunning = () => {
    if (!tournament.start_date || !tournament.end_date) return false;
    const today = new Date();
    const start = new Date(tournament.start_date + 'T00:00:00');
    const end = new Date(tournament.end_date + 'T23:59:59');
    return today >= start && today <= end;
  };

  const running = isCurrentlyRunning();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{tournament.name}</h4>
          {tournament.organizer && (
            <p className="text-sm text-gray-500">{tournament.organizer}</p>
          )}
        </div>
        <span className={`
          px-2 py-1 text-xs font-medium rounded-full
          ${running
            ? 'bg-green-100 text-green-800'
            : tournament.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }
        `}>
          {running ? 'In Progress' : tournament.status || 'Scheduled'}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        {tournament.start_date && (
          <div>
            <span className="text-gray-500">Dates:</span>{' '}
            {formatDateDisplay(tournament.start_date)}
            {tournament.end_date && tournament.end_date !== tournament.start_date && (
              <> - {formatDateDisplay(tournament.end_date)}</>
            )}
          </div>
        )}
        {tournament.contact_name && (
          <div>
            <span className="text-gray-500">Contact:</span> {tournament.contact_name}
          </div>
        )}
        {tournament.contact_phone && (
          <div>
            <span className="text-gray-500">Phone:</span> {tournament.contact_phone}
          </div>
        )}
        {tournament.contact_email && (
          <div>
            <span className="text-gray-500">Email:</span> {tournament.contact_email}
          </div>
        )}
        {tournament.default_courts && (
          <div>
            <span className="text-gray-500">Courts:</span> {tournament.default_courts}
          </div>
        )}
        {tournament.notes && (
          <div className="mt-2 text-xs text-gray-500 italic">
            {tournament.notes}
          </div>
        )}
      </div>
    </div>
  );
}
