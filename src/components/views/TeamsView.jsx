import { useState, useMemo, useEffect } from 'react';
import { useTeams } from '../../hooks/useTeams.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import { formatDateDisplay, formatTimeDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import { getBookingTypeLabel } from '../../utils/colors.js';
import { createTeam, updateTeam, deleteTeam } from '../../utils/api.js';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import { Textarea } from '../common/Input.jsx';
import { useToast } from '../common/Toast.jsx';

// Map team types (from teams CSV) to booking types (from bookings CSV)
const TEAM_TYPE_TO_BOOKING_TYPE = {
  'high_school': 'team_hs',
  'college': 'team_college',
  'usta_league': 'team_usta',
  'usta': 'team_usta',
  'usta_adult': 'team_usta',
  'usta_junior': 'team_usta',
  'other': 'team_other',
};

// Team type mapping - maps raw values to display labels
const TEAM_TYPE_LABELS = {
  // Booking type codes
  'team_hs': 'High School',
  'team_college': 'College',
  'team_usta': 'USTA League',
  'team_other': 'Other Team',
  // CSV variations with underscores
  'high_school': 'High School',
  'college': 'College',
  'usta_league': 'USTA League',
  'usta': 'USTA League',
  'usta_adult': 'USTA Adult',
  'usta_junior': 'USTA Junior',
  'other': 'Other Team',
  // Plain labels (proper case)
  'High School': 'High School',
  'College': 'College',
  'USTA League': 'USTA League',
  'USTA': 'USTA League',
  'USTA Adult': 'USTA Adult',
  'USTA Junior': 'USTA Junior',
  'Other': 'Other Team',
};

function getTeamTypeLabel(type) {
  if (!type) return 'Team';
  // Try exact match first, then lowercase match
  return TEAM_TYPE_LABELS[type] || TEAM_TYPE_LABELS[type.toLowerCase()] || type;
}

/**
 * Teams management view - 50/50 layout with cards on top, bookings on bottom
 */
export default function TeamsView({ onBookingClick }) {
  const { teams, activeTeams, loading: teamsLoading, refresh: refreshTeams, isInSeason } = useTeams();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();
  const { showToast } = useToast();

  const [bookingsFilter, setBookingsFilter] = useState('upcoming');
  const [teamTypeFilter, setTeamTypeFilter] = useState('all');
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  const today = formatDateISO(new Date());

  // Filter teams by type
  const filteredTeams = useMemo(() => {
    if (teamTypeFilter === 'all') return activeTeams;
    return activeTeams.filter(t => t.team_type === teamTypeFilter);
  }, [activeTeams, teamTypeFilter]);

  // Get unique team types for dropdown with proper labels
  const teamTypeOptions = useMemo(() => {
    const types = [...new Set(teams.map(t => t.team_type).filter(Boolean))];
    return types.sort().map(type => ({
      value: type,
      label: getTeamTypeLabel(type),
    }));
  }, [teams]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b.booking_type?.startsWith('team_')) return false;
      if (b.status === 'cancelled') return false;
      if (bookingsFilter === 'upcoming' && b.date < today) return false;
      if (bookingsFilter === 'past' && b.date >= today) return false;

      // Map team type filter to booking type for comparison
      if (teamTypeFilter !== 'all') {
        const expectedBookingType = TEAM_TYPE_TO_BOOKING_TYPE[teamTypeFilter] || teamTypeFilter;
        if (b.booking_type !== expectedBookingType) return false;
      }

      // Filter by specific team - match by customer_name
      if (selectedTeamId !== 'all') {
        const team = teams.find(t => t.team_id === selectedTeamId);
        if (team && b.customer_name !== team.team_name && b.customer_name !== team.name) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateCompare = bookingsFilter === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, bookingsFilter, teamTypeFilter, selectedTeamId, teams, today]);

  const teamsForDropdown = useMemo(() => {
    if (teamTypeFilter === 'all') return activeTeams;
    return activeTeams.filter(t => t.team_type === teamTypeFilter);
  }, [activeTeams, teamTypeFilter]);

  const handleTeamTypeChange = (type) => {
    setTeamTypeFilter(type);
    setSelectedTeamId('all');
  };

  const handleAddTeam = () => {
    setEditingTeam(null);
    setShowFormModal(true);
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setSelectedTeam(null);
    setShowFormModal(true);
  };

  const handleDuplicateTeam = (team) => {
    setEditingTeam({
      ...team,
      team_id: null,
      name: `${team.team_name || team.name} (Copy)`,
      team_name: `${team.team_name || team.name} (Copy)`,
    });
    setSelectedTeam(null);
    setShowFormModal(true);
  };

  const handleDeleteTeam = async (team) => {
    if (!confirm(`Are you sure you want to delete "${team.team_name || team.name}"?`)) {
      return;
    }
    try {
      const result = await deleteTeam(team.team_id);
      if (result.success) {
        showToast('Team deleted successfully', 'success');
        setSelectedTeam(null);
        refreshTeams();
      } else {
        showToast(result.error || 'Failed to delete team', 'error');
      }
    } catch (error) {
      showToast('Failed to delete team', 'error');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      let result;
      if (editingTeam?.team_id) {
        result = await updateTeam(editingTeam.team_id, formData);
      } else {
        result = await createTeam(formData);
      }

      if (result.success) {
        showToast(editingTeam?.team_id ? 'Team updated successfully' : 'Team created successfully', 'success');
        setShowFormModal(false);
        setEditingTeam(null);
        refreshTeams();
        return { success: true };
      } else {
        showToast(result.error || 'Failed to save team', 'error');
        return { success: false };
      }
    } catch (error) {
      showToast('Failed to save team', 'error');
      return { success: false };
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-900">Teams</h2>
        <button
          onClick={handleAddTeam}
          className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
        >
          + Add Team
        </button>
      </div>

      {/* TOP HALF - Team Cards */}
      <div className="h-1/2 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200">
        {/* Teams Filter Row */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-medium text-gray-900">Teams</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={teamTypeFilter}
              onChange={(e) => handleTeamTypeChange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Types</option>
              {teamTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-500">
            {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Team Cards - 5 columns x 2 rows grid */}
        <div className="overflow-auto flex-1 p-4">
          {filteredTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No teams found
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3 auto-rows-min" style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}>
              {filteredTeams.slice(0, 10).map((team) => (
                <TeamCard
                  key={team.team_id}
                  team={team}
                  onClick={() => {
                    // Set team filter for bookings below
                    setSelectedTeamId(team.team_id);
                  }}
                  onViewDetails={() => setSelectedTeam(team)}
                  inSeason={isInSeason(team)}
                  isSelected={selectedTeamId === team.team_id}
                />
              ))}
            </div>
          )}
          {filteredTeams.length > 10 && (
            <div className="text-sm text-gray-500 mt-2 text-center">
              Showing 10 of {filteredTeams.length} teams. Use filters or dropdown below to find more.
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM HALF - Bookings Table */}
      <div className="h-1/2 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200">
        {/* Bookings Header & Filters */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-medium text-gray-900">Team Bookings</h3>

          <div className="flex items-center gap-2">
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

          <span className="text-sm text-gray-500 ml-auto">({filteredBookings.length})</span>
        </div>

        {/* Bookings Table */}
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team/Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
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
                filteredBookings.slice(0, 100).map((booking) => (
                  <tr
                    key={booking.booking_id}
                    onClick={() => onBookingClick?.(booking)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDateDisplay(booking.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatTimeDisplay(booking.time_start)} - {formatTimeDisplay(booking.time_end)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{booking.customer_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{getBookingTypeLabel(booking.booking_type)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getCourtName(parseInt(booking.court, 10))}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{booking.booking_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredBookings.length > 100 && (
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">
              Showing first 100 of {filteredBookings.length} bookings
            </div>
          )}
        </div>
      </div>

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
        onEdit={handleEditTeam}
        onDuplicate={handleDuplicateTeam}
        onDelete={handleDeleteTeam}
      />

      {/* Team Form Modal */}
      <TeamFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingTeam(null); }}
        team={editingTeam}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

function TeamCard({ team, onClick, onViewDetails, inSeason, isSelected }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected
          ? 'bg-green-50 border-green-500 ring-2 ring-green-500'
          : inSeason
            ? 'bg-white border-gray-200 hover:border-green-300 hover:shadow-sm'
            : 'bg-gray-50 border-gray-300 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate text-sm">{team.team_name || team.name}</h4>
          <p className="text-xs text-gray-500">{getTeamTypeLabel(team.team_type)}</p>
        </div>
        {!inSeason && (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700 ml-1">
            Off
          </span>
        )}
      </div>
      {(team.school_name || team.organization) && (
        <div className="text-xs text-gray-600 truncate mt-1">{team.school_name || team.organization}</div>
      )}
      {team.court_rate && (
        <div className="text-xs text-green-600 font-medium mt-1">${parseFloat(team.court_rate).toFixed(2)}/hr</div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails?.();
        }}
        className="mt-2 w-full px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
      >
        View Details
      </button>
    </div>
  );
}

function TeamDetailModal({ team, onClose, onEdit, onDuplicate, onDelete }) {
  if (!team) return null;

  return (
    <Modal isOpen={!!team} onClose={onClose} title="Team Details">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{team.team_name || team.name}</h3>
            <p className="text-sm text-gray-500">{getTeamTypeLabel(team.team_type)}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            team.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
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
          {team.court_rate && (
            <div>
              <span className="text-sm font-medium text-gray-500">Court Rate:</span>
              <p className="text-gray-900">${parseFloat(team.court_rate).toFixed(2)}/hr</p>
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

        {/* Action Buttons */}
        <div className="border-t pt-4 flex gap-2">
          <button
            onClick={() => onEdit(team)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800"
          >
            Edit
          </button>
          <button
            onClick={() => onDuplicate(team)}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Duplicate
          </button>
          <button
            onClick={() => onDelete(team)}
            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
          >
            Delete
          </button>
        </div>

        <div className="text-xs text-gray-400">Team ID: {team.team_id}</div>
      </div>
    </Modal>
  );
}

function TeamFormModal({ isOpen, onClose, team, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    team_type: 'team_hs',
    organization: '',
    contact_name: '',
    phone: '',
    contact_email: '',
    default_courts: '',
    season_start: '',
    season_end: '',
    court_rate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Reset form when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.team_name || team.name || '',
        team_type: team.team_type || 'team_hs',
        organization: team.school_name || team.organization || '',
        contact_name: team.contact_name || '',
        phone: team.contact_phone || team.phone || '',
        contact_email: team.contact_email || '',
        default_courts: team.default_courts || '',
        season_start: team.season_start || '',
        season_end: team.season_end || '',
        court_rate: team.court_rate || '',
        notes: team.notes || '',
      });
    } else {
      setFormData({
        name: '',
        team_type: 'team_hs',
        organization: '',
        contact_name: '',
        phone: '',
        contact_email: '',
        default_courts: '',
        season_start: '',
        season_end: '',
        court_rate: '',
        notes: '',
      });
    }
  }, [team, isOpen]);

  const handleChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await onSubmit(formData);
      // Only reset saving if the modal is still open (i.e., there was an error)
      if (!result?.success) {
        setSaving(false);
      }
    } catch {
      setSaving(false);
    }
  };

  const teamTypeOptions = [
    { value: 'team_hs', label: 'High School' },
    { value: 'team_college', label: 'College' },
    { value: 'team_usta', label: 'USTA League' },
    { value: 'team_other', label: 'Other' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={team?.team_id ? 'Edit Team' : 'Add New Team'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Team Name"
          value={formData.name}
          onChange={handleChange('name')}
          placeholder="Enter team name"
          required
        />

        <Select
          label="Team Type"
          value={formData.team_type}
          onChange={handleChange('team_type')}
          options={teamTypeOptions}
          required
        />

        <Input
          label="School/Organization"
          value={formData.organization}
          onChange={handleChange('organization')}
          placeholder="Enter school or organization name"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Contact Name"
            value={formData.contact_name}
            onChange={handleChange('contact_name')}
            placeholder="Coach name"
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="(501) 555-1234"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={formData.contact_email}
          onChange={handleChange('contact_email')}
          placeholder="coach@school.edu"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Default Courts"
            value={formData.default_courts}
            onChange={handleChange('default_courts')}
            placeholder="1,2,3,4"
          />
          <Input
            label="Court Rate ($/hr)"
            type="number"
            value={formData.court_rate}
            onChange={handleChange('court_rate')}
            placeholder="e.g. 10.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Season Start"
            type="date"
            value={formData.season_start}
            onChange={handleChange('season_start')}
          />
          <Input
            label="Season End"
            type="date"
            value={formData.season_end}
            onChange={handleChange('season_end')}
          />
        </div>

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="Additional notes..."
          rows={2}
        />

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (team?.team_id ? 'Update Team' : 'Create Team')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
