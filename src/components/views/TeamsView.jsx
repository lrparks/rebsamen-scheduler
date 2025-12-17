import { useState, useMemo } from 'react';
import { useTeams } from '../../hooks/useTeams.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import { formatDateDisplay, formatTimeDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import { getBookingTypeLabel } from '../../utils/colors.js';
import Modal from '../common/Modal.jsx';

/**
 * Teams management view
 */
export default function TeamsView({ onBookingClick }) {
  const { teams, activeTeams, loading: teamsLoading } = useTeams();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();

  const [bookingsFilter, setBookingsFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [teamTypeFilter, setTeamTypeFilter] = useState('all'); // 'all', 'team_hs', 'team_college', 'team_usta', 'team_other'
  const [selectedTeamId, setSelectedTeamId] = useState('all'); // 'all' or specific team_id
  const [selectedTeam, setSelectedTeam] = useState(null); // For modal

  const today = formatDateISO(new Date());

  // Filter teams by type
  const filteredTeams = useMemo(() => {
    if (teamTypeFilter === 'all') return activeTeams;
    return activeTeams.filter(t => t.team_type === teamTypeFilter);
  }, [activeTeams, teamTypeFilter]);

  // Get unique team types for dropdown
  const teamTypes = useMemo(() => {
    const types = [...new Set(teams.map(t => t.team_type).filter(Boolean))];
    return types.sort();
  }, [teams]);

  // Filter bookings by time period and team
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // Must be a team booking
      if (!b.booking_type?.startsWith('team_')) return false;
      if (b.status === 'cancelled') return false;

      // Time filter
      if (bookingsFilter === 'upcoming' && b.date < today) return false;
      if (bookingsFilter === 'past' && b.date >= today) return false;

      // Team type filter
      if (teamTypeFilter !== 'all' && b.booking_type !== teamTypeFilter) return false;

      // Specific team filter (by customer_name)
      if (selectedTeamId !== 'all') {
        const team = teams.find(t => t.team_id === selectedTeamId);
        if (team && b.customer_name !== team.team_name && b.customer_name !== team.name) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by date (descending for past, ascending for upcoming)
      const dateCompare = bookingsFilter === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, bookingsFilter, teamTypeFilter, selectedTeamId, teams, today]);

  // Get teams for the selected type (for team dropdown)
  const teamsForDropdown = useMemo(() => {
    if (teamTypeFilter === 'all') return activeTeams;
    return activeTeams.filter(t => t.team_type === teamTypeFilter);
  }, [activeTeams, teamTypeFilter]);

  const loading = teamsLoading || bookingsLoading;

  const handleTeamTypeChange = (type) => {
    setTeamTypeFilter(type);
    setSelectedTeamId('all'); // Reset team selection when type changes
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-900">Teams</h2>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-lg border border-gray-200 p-4">
        {/* Team Type Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Type:</label>
          <select
            value={teamTypeFilter}
            onChange={(e) => handleTeamTypeChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Types</option>
            {teamTypes.map(type => (
              <option key={type} value={type}>
                {type === 'team_hs' ? 'High School' :
                 type === 'team_college' ? 'College' :
                 type === 'team_usta' ? 'USTA League' : 'Other'}
              </option>
            ))}
          </select>
        </div>

        {/* Team Name Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Team:</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Teams</option>
            {teamsForDropdown.map(team => (
              <option key={team.team_id} value={team.team_id}>
                {team.team_name || team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bookings Time Filter */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm font-medium text-gray-700">Show:</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {[
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'past', label: 'Past' },
              { id: 'all', label: 'All' },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setBookingsFilter(option.id)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  bookingsFilter === option.id
                    ? 'bg-green-700 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Teams Cards */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          {teamTypeFilter === 'all' ? 'All Teams' : getTeamTypeLabel(teamTypeFilter)}
          {' '}({filteredTeams.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTeams.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No teams found
            </div>
          ) : (
            filteredTeams.map((team) => (
              <TeamCard
                key={team.team_id}
                team={team}
                onClick={() => setSelectedTeam(team)}
              />
            ))
          )}
        </div>
      </div>

      {/* Team Bookings Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">
            {bookingsFilter === 'upcoming' ? 'Upcoming' : bookingsFilter === 'past' ? 'Past' : 'All'} Team Bookings
            {' '}({filteredBookings.length})
          </h3>
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
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No {bookingsFilter === 'all' ? '' : bookingsFilter} team bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.slice(0, 50).map((booking) => (
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
          {filteredBookings.length > 50 && (
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">
              Showing first 50 of {filteredBookings.length} bookings
            </div>
          )}
        </div>
      </div>

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </div>
  );
}

function getTeamTypeLabel(type) {
  switch (type) {
    case 'team_hs': return 'High School Teams';
    case 'team_college': return 'College Teams';
    case 'team_usta': return 'USTA League Teams';
    case 'team_other': return 'Other Teams';
    default: return 'Teams';
  }
}

function TeamCard({ team, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-500 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{team.team_name || team.name}</h4>
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
        {(team.school_name || team.organization) && (
          <div className="text-gray-600 truncate">
            {team.school_name || team.organization}
          </div>
        )}
        {team.contact_name && (
          <div className="text-gray-500 text-xs">
            Contact: {team.contact_name}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamDetailModal({ team, onClose }) {
  if (!team) return null;

  return (
    <Modal isOpen={!!team} onClose={onClose} title="Team Details">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{team.team_name || team.name}</h3>
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

        <div className="border-t pt-4 space-y-3">
          {(team.school_name || team.organization) && (
            <div>
              <span className="text-sm font-medium text-gray-500">School/Organization:</span>
              <p className="text-gray-900">{team.school_name || team.organization}</p>
            </div>
          )}
          {team.contact_name && (
            <div>
              <span className="text-sm font-medium text-gray-500">Contact:</span>
              <p className="text-gray-900">{team.contact_name}</p>
            </div>
          )}
          {(team.contact_phone || team.phone) && (
            <div>
              <span className="text-sm font-medium text-gray-500">Phone:</span>
              <p className="text-gray-900">{team.contact_phone || team.phone}</p>
            </div>
          )}
          {team.contact_email && (
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p className="text-gray-900">{team.contact_email}</p>
            </div>
          )}
          {team.default_courts && (
            <div>
              <span className="text-sm font-medium text-gray-500">Default Courts:</span>
              <p className="text-gray-900">{team.default_courts}</p>
            </div>
          )}
          {team.season_start && team.season_end && (
            <div>
              <span className="text-sm font-medium text-gray-500">Season:</span>
              <p className="text-gray-900">
                {formatDateDisplay(team.season_start)} - {formatDateDisplay(team.season_end)}
              </p>
            </div>
          )}
          {team.notes && (
            <div>
              <span className="text-sm font-medium text-gray-500">Notes:</span>
              <p className="text-gray-900">{team.notes}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4 text-xs text-gray-400">
          Team ID: {team.team_id}
        </div>
      </div>
    </Modal>
  );
}
