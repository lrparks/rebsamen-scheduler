import { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import Button from '../common/Button.jsx';
import { useTeams } from '../../hooks/useTeams.js';
import { useCourts } from '../../hooks/useCourts.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { useToast } from '../common/Toast.jsx';
import { createBooking } from '../../utils/api.js';
import { generateBookingId, generateGroupId } from '../../utils/bookingId.js';
import { formatDateISO } from '../../utils/dateHelpers.js';

/**
 * Calculate end time based on start time (always 1.5hr blocks)
 */
function calculateEndTime(startTime) {
  if (!startTime) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + 90; // 1.5 hours = 90 minutes
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Monday Night League Booking Modal
 */
export default function MondayNightLeagueModal({ isOpen, onClose, onSuccess }) {
  const { teams } = useTeams();
  const { courtOptions } = useCourts();
  const { getConflicts, addBookingLocal, refreshBookings } = useBookingsContext();
  const { initials } = useStaffContext();
  const { showToast } = useToast();

  // Find Monday Night League team
  const mnlTeam = useMemo(() => {
    return teams.find(t =>
      (t.team_name || t.name || '').toLowerCase().includes('monday night league')
    );
  }, [teams]);

  // Form state
  const [selectedDate, setSelectedDate] = useState('');
  const [sessions, setSessions] = useState([
    { id: 1, timeStart: '18:00' }, // 6:00 PM
    { id: 2, timeStart: '19:30' }, // 7:30 PM
  ]);
  const [courtAssignments, setCourtAssignments] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [showPrintOption, setShowPrintOption] = useState(false);

  // Initialize court assignments when modal opens (all 17 courts)
  useEffect(() => {
    if (isOpen) {
      // Reset form
      setSelectedDate('');
      setSessions([
        { id: 1, timeStart: '18:00' },
        { id: 2, timeStart: '19:30' },
      ]);

      // Create 17 court assignments
      const initialAssignments = courtOptions.map((court, index) => ({
        id: index + 1,
        sessionId: 1, // Default to first session
        court: court.value,
        competitor1: '',
        competitor2: '',
      }));
      setCourtAssignments(initialAssignments);
      setShowPrintOption(false);
    }
  }, [isOpen, courtOptions]);

  // Handle selecting all courts (populate all 17 courts)
  const handleSelectAllCourts = () => {
    const allAssignments = courtOptions.map((court, index) => ({
      id: index + 1,
      sessionId: 1, // Default to first session
      court: court.value,
      competitor1: '',
      competitor2: '',
    }));
    setCourtAssignments(allAssignments);
    showToast('All courts added', 'info');
  };

  // Handle adding a court assignment
  const handleAddCourt = () => {
    const newId = Math.max(...courtAssignments.map(a => a.id), 0) + 1;
    setCourtAssignments([...courtAssignments, {
      id: newId,
      sessionId: sessions[0]?.id || 1,
      court: courtOptions[0]?.value || 1,
      competitor1: '',
      competitor2: '',
    }]);
  };

  // Handle removing a court assignment
  const handleRemoveCourt = (id) => {
    setCourtAssignments(courtAssignments.filter(a => a.id !== id));
  };

  // Handle updating a court assignment
  const handleUpdateAssignment = (id, field, value) => {
    setCourtAssignments(courtAssignments.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  // Handle adding a session
  const handleAddSession = () => {
    const newId = Math.max(...sessions.map(s => s.id), 0) + 1;
    const lastSession = sessions[sessions.length - 1];
    const defaultTime = lastSession ? calculateEndTime(lastSession.timeStart) : '18:00';
    setSessions([...sessions, {
      id: newId,
      timeStart: defaultTime,
    }]);
  };

  // Handle removing a session
  const handleRemoveSession = (id) => {
    if (sessions.length === 1) {
      showToast('At least one session is required', 'error');
      return;
    }
    setSessions(sessions.filter(s => s.id !== id));
    // Remove assignments for this session
    setCourtAssignments(courtAssignments.filter(a => a.sessionId !== id));
  };

  // Handle updating a session
  const handleUpdateSession = (id, field, value) => {
    setSessions(sessions.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  // Calculate summary
  const summary = useMemo(() => {
    const assignedCourts = courtAssignments.filter(a => a.competitor1 || a.competitor2).length;
    const courtRate = mnlTeam ? parseFloat(mnlTeam.court_rate) || 12.00 : 12.00;
    const totalValue = assignedCourts * courtRate; // $12 per 1.5hr block/court

    return {
      assignedCourts,
      courtRate,
      totalValue,
    };
  }, [courtAssignments, mnlTeam]);

  // Validate form
  const validateForm = () => {
    if (!selectedDate) {
      showToast('Please select a date', 'error');
      return false;
    }

    if (!initials) {
      showToast('Please select a staff member first', 'error');
      return false;
    }

    if (courtAssignments.length === 0) {
      showToast('Please add at least one court assignment', 'error');
      return false;
    }

    // Check that at least one assignment has competitor names
    const hasCompetitors = courtAssignments.some(a => a.competitor1 || a.competitor2);
    if (!hasCompetitors) {
      showToast('Please enter competitor names for at least one court', 'error');
      return false;
    }

    return true;
  };

  // Handle create booking
  const handleCreateBooking = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const proposedBookings = [];
      const groupId = generateGroupId(new Date());
      const bookingType = 'team_other'; // Monday Night League
      const teamId = mnlTeam?.team_id || 'MNL';

      // Create bookings for each court assignment with competitors
      for (const assignment of courtAssignments) {
        // Skip if no competitors entered
        if (!assignment.competitor1 && !assignment.competitor2) continue;

        const session = sessions.find(s => s.sessionId === assignment.sessionId) || sessions[0];
        const timeEnd = calculateEndTime(session.timeStart);
        const customerName = `${assignment.competitor1 || 'TBD'} vs ${assignment.competitor2 || 'TBD'}`;

        proposedBookings.push({
          booking_id: generateBookingId(selectedDate, assignment.court, session.timeStart),
          group_id: groupId,
          date: selectedDate,
          court: assignment.court,
          time_start: session.timeStart,
          time_end: timeEnd,
          booking_type: bookingType,
          entity_id: teamId,
          customer_name: customerName,
          customer_phone: mnlTeam?.contact_phone || mnlTeam?.phone || '',
          payment_status: 'invoiced',
          payment_amount: (summary.courtRate).toFixed(2),
          payment_method: 'invoice',
          notes: `Monday Night League - ${customerName}`,
          participant_count: 4,
          is_youth: false,
          status: 'active',
          created_by: initials,
          created_at: new Date().toISOString(),
        });
      }

      if (proposedBookings.length === 0) {
        showToast('No bookings to create (no competitors entered)', 'error');
        setLoading(false);
        return;
      }

      // Check for conflicts
      const allConflicts = [];
      for (const booking of proposedBookings) {
        const bookingConflicts = getConflicts(
          booking.date,
          booking.court,
          booking.time_start,
          booking.time_end
        );
        allConflicts.push(...bookingConflicts);
      }

      if (allConflicts.length > 0) {
        showToast(`${allConflicts.length} booking conflict(s) detected. Please adjust your selections.`, 'error');
        setLoading(false);
        return;
      }

      // Create bookings
      const payload = proposedBookings.length === 1 ? proposedBookings[0] : proposedBookings;
      const result = await createBooking(payload);

      if (result.success) {
        // Optimistic update
        proposedBookings.forEach(b => addBookingLocal(b));

        // Show success
        showToast(`${proposedBookings.length} Monday Night League booking(s) created successfully`, 'success');

        // Refresh data
        setTimeout(() => refreshBookings(), 1000);

        // Show print option
        setShowPrintOption(true);
      } else {
        showToast(result.error || 'Failed to create bookings', 'error');
      }
    } catch (error) {
      console.error('[MondayNightLeagueModal] Create error:', error);
      showToast('Failed to create bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle print and close
  const handlePrintAndClose = () => {
    if (onSuccess) {
      onSuccess(selectedDate); // Pass date to parent to show print dialog
    }
    onClose();
  };

  // Success screen with print option
  if (showPrintOption) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Bookings Created" size="sm">
        <div className="text-center space-y-4">
          <div className="text-green-500">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium">Monday Night League Bookings Created!</p>
          <p className="text-sm text-gray-600">Would you like to print the check-in sheet?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} fullWidth>
              Close
            </Button>
            <Button onClick={handlePrintAndClose} fullWidth>
              Print Check-In Sheet
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Main form
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="TEAM BOOKING: MONDAY NIGHT LEAGUE" size="xl">
      <div className="space-y-6">
        {/* Team Display */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">TEAM</div>
          <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium">
            {mnlTeam ? (mnlTeam.team_name || mnlTeam.name) : 'Monday Night League'}
          </div>
        </div>

        {/* Date and Sessions */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="DATE"
            type="date"
            value={selectedDate}
            onChange={setSelectedDate}
            required
          />
        </div>

        {/* Sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">SESSIONS</h3>
            <button
              onClick={handleAddSession}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              + Add Session
            </button>
          </div>
          {sessions.map((session, index) => (
            <div key={session.id} className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <Input
                  label={`Session ${index + 1} Start Time`}
                  type="time"
                  value={session.timeStart}
                  onChange={(val) => handleUpdateSession(session.id, 'timeStart', val)}
                  required
                />
              </div>
              <div className="pt-6 text-sm text-gray-500">
                (1.5hr block: {session.timeStart} - {calculateEndTime(session.timeStart)})
              </div>
              {sessions.length > 1 && (
                <button
                  onClick={() => handleRemoveSession(session.id)}
                  className="mt-6 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-gray-300" />

        {/* Match Assignments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">MATCH ASSIGNMENTS</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAllCourts}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All Courts
              </button>
              <button
                onClick={handleAddCourt}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                + Add Court
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {courtAssignments.map((assignment) => (
              <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Session selector (if multiple sessions) */}
                  {sessions.length > 1 && (
                    <div className="col-span-2">
                      <Select
                        label="Session"
                        value={assignment.sessionId}
                        onChange={(val) => handleUpdateAssignment(assignment.id, 'sessionId', Number(val))}
                        options={sessions.map((s, idx) => ({
                          value: s.id,
                          label: `Session ${idx + 1}`,
                        }))}
                      />
                    </div>
                  )}

                  {/* Court */}
                  <div className={sessions.length > 1 ? 'col-span-2' : 'col-span-3'}>
                    <Select
                      label="Court"
                      value={assignment.court}
                      onChange={(val) => handleUpdateAssignment(assignment.id, 'court', Number(val))}
                      options={courtOptions}
                    />
                  </div>

                  {/* Competitor 1 */}
                  <div className={sessions.length > 1 ? 'col-span-3' : 'col-span-4'}>
                    <Input
                      label="Competitor 1"
                      value={assignment.competitor1}
                      onChange={(val) => handleUpdateAssignment(assignment.id, 'competitor1', val)}
                      placeholder="Name or Team"
                    />
                  </div>

                  {/* VS */}
                  <div className="col-span-1 flex items-center justify-center pt-6">
                    <span className="text-sm font-medium text-gray-500">vs</span>
                  </div>

                  {/* Competitor 2 */}
                  <div className={sessions.length > 1 ? 'col-span-3' : 'col-span-4'}>
                    <Input
                      label="Competitor 2"
                      value={assignment.competitor2}
                      onChange={(val) => handleUpdateAssignment(assignment.id, 'competitor2', val)}
                      placeholder="Name or Team"
                    />
                  </div>

                  {/* Remove button */}
                  <div className="col-span-1 flex items-center justify-end pt-6">
                    <button
                      onClick={() => handleRemoveCourt(assignment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remove court"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {courtAssignments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No court assignments. Click "Select All Courts" or "+ Add Court" to begin.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-300" />

        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">BOOKING SUMMARY</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rate:</span>
              <span className="font-medium">${summary.courtRate.toFixed(2)} per 1.5hr block/court</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Courts Assigned:</span>
              <span className="font-medium">{summary.assignedCourts}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Total Value:</span>
              <span className="font-medium text-green-700">${summary.totalValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-300 pt-4 flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            CANCEL
          </Button>
          <Button
            onClick={handleCreateBooking}
            loading={loading}
            disabled={!selectedDate || loading}
            fullWidth
          >
            CREATE BOOKING
          </Button>
        </div>
      </div>
    </Modal>
  );
}
