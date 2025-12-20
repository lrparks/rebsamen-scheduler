import { useState, useEffect, useMemo } from 'react';
import Input from '../common/Input.jsx';
import { Textarea } from '../common/Input.jsx';
import Select, { MultiSelect } from '../common/Select.jsx';
import DatePicker from '../common/DatePicker.jsx';
import { getTimeSlots, getEndTimeOptions, formatTimeDisplay } from '../../utils/dateHelpers.js';
import { calculateTotalRate, getRateBreakdown, isFreeBooking } from '../../utils/rates.js';
import { BOOKING_TYPES, PAYMENT_STATUS, PAYMENT_METHODS, CONFIG } from '../../config.js';
import { useCourts } from '../../hooks/useCourts.js';
import { useContractors } from '../../hooks/useContractors.js';
import { useTeams } from '../../hooks/useTeams.js';
import { useTournaments } from '../../hooks/useTournaments.js';

/**
 * Booking form fields for create/edit
 */
export default function BookingForm({
  formData,
  onChange,
  isEditing = false,
}) {
  const { courtOptions } = useCourts();
  const { contractorOptions } = useContractors();
  const { teamOptions } = useTeams();
  const { tournamentOptions } = useTournaments();

  const timeSlots = getTimeSlots();
  const endTimeOptions = getEndTimeOptions(formData.timeStart);

  // Auto-calculate rate when relevant fields change
  useEffect(() => {
    if (!isEditing && formData.date && formData.timeStart && formData.timeEnd && formData.bookingType) {
      const numCourts = formData.courts?.length || 1;
      const total = calculateTotalRate(
        formData.date,
        formData.timeStart,
        formData.timeEnd,
        formData.bookingType,
        numCourts
      );
      onChange({ paymentAmount: total.toFixed(2) });
    }
  }, [formData.date, formData.timeStart, formData.timeEnd, formData.bookingType, formData.courts?.length, isEditing]);

  // Get rate breakdown for display
  const rateBreakdown = useMemo(() => {
    if (!formData.date || !formData.timeStart || !formData.timeEnd || !formData.bookingType) {
      return null;
    }
    const numCourts = formData.courts?.length || 1;
    return getRateBreakdown(
      formData.date,
      formData.timeStart,
      formData.timeEnd,
      formData.bookingType,
      numCourts
    );
  }, [formData.date, formData.timeStart, formData.timeEnd, formData.bookingType, formData.courts?.length]);

  // Generate court options
  const courts = courtOptions.length > 0 ? courtOptions : Array.from(
    { length: CONFIG.TOTAL_COURTS },
    (_, i) => ({
      value: i + 1,
      label: i + 1 === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `Court ${i + 1}`,
    })
  );

  // Generate time options
  const startTimeOptions = timeSlots.map(t => ({
    value: t,
    label: formatTimeDisplay(t),
  }));

  const endOptions = endTimeOptions.map(t => ({
    value: t,
    label: formatTimeDisplay(t),
  }));

  // Booking type options
  const bookingTypeOptions = [
    { value: BOOKING_TYPES.OPEN, label: 'Open Play (Walk-in)' },
    { value: BOOKING_TYPES.CONTRACTOR, label: 'Contractor (Lesson)' },
    { value: BOOKING_TYPES.TEAM_USTA, label: 'USTA League' },
    { value: BOOKING_TYPES.TEAM_HS, label: 'High School Team' },
    { value: BOOKING_TYPES.TEAM_COLLEGE, label: 'College Team' },
    { value: BOOKING_TYPES.TEAM_OTHER, label: 'Other Team' },
    { value: BOOKING_TYPES.TOURNAMENT, label: 'Tournament' },
    { value: BOOKING_TYPES.MAINTENANCE, label: 'Maintenance' },
    { value: BOOKING_TYPES.HOLD, label: 'Administrative Hold' },
  ];

  // Payment status options
  const paymentStatusOptions = Object.values(PAYMENT_STATUS).map(s => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  }));

  // Payment method options
  const paymentMethodOptions = Object.values(PAYMENT_METHODS).map(m => ({
    value: m,
    label: m.toUpperCase(),
  }));

  const handleFieldChange = (field) => (value) => {
    onChange({ [field]: value });
  };

  const isContractor = formData.bookingType === BOOKING_TYPES.CONTRACTOR;
  const isTeam = formData.bookingType?.startsWith('team_');
  const isTournament = formData.bookingType === BOOKING_TYPES.TOURNAMENT;
  const showPayment = !isFreeBooking(formData.bookingType);

  // Check if multi-day selection
  const isMultiDay = formData.dates && formData.dates.length > 1;

  return (
    <div className="space-y-4">
      {/* Multi-day indicator */}
      {isMultiDay && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Multi-day booking:</strong> {formData.dates.length} days selected
          <div className="text-xs mt-1 text-blue-600">
            {formData.dates.join(', ')}
          </div>
        </div>
      )}

      {/* Date & Time */}
      <div className="grid grid-cols-3 gap-3">
        <DatePicker
          label={isMultiDay ? "Start Date" : "Date"}
          value={formData.date}
          onChange={handleFieldChange('date')}
          min={new Date().toISOString().split('T')[0]}
          required
          disabled={isMultiDay}
        />
        <Select
          label="Start Time"
          value={formData.timeStart}
          onChange={handleFieldChange('timeStart')}
          options={startTimeOptions}
          required
        />
        <Select
          label="End Time"
          value={formData.timeEnd}
          onChange={handleFieldChange('timeEnd')}
          options={endOptions}
          required
        />
      </div>

      {/* Court Selection */}
      {isEditing ? (
        <Select
          label="Court"
          value={formData.court}
          onChange={handleFieldChange('court')}
          options={courts}
          required
        />
      ) : (
        <MultiSelect
          label="Courts (select multiple for group booking)"
          value={formData.courts || []}
          onChange={handleFieldChange('courts')}
          options={courts}
          required
        />
      )}

      {/* Booking Type */}
      <Select
        label="Booking Type"
        value={formData.bookingType}
        onChange={handleFieldChange('bookingType')}
        options={bookingTypeOptions}
        required
      />

      {/* Contractor Selection */}
      {isContractor && (
        contractorOptions.length > 0 ? (
          <Select
            label="Contractor"
            value={formData.entityId}
            onChange={(value) => {
              const contractor = contractorOptions.find(c => c.value === value);
              onChange({
                entityId: value,
                customerName: contractor?.name || contractor?.label || '',
                customerPhone: contractor?.phone || '',
              });
            }}
            options={contractorOptions}
            placeholder="Select contractor..."
            required
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>No contractors configured.</strong> Add contractors to the Contractors sheet in Google Sheets, or enter contractor info in Customer Name/Notes fields.
          </div>
        )
      )}

      {/* Team Selection */}
      {isTeam && (
        (() => {
          // For team_other, show free-fill instead of dropdown
          if (formData.bookingType === BOOKING_TYPES.TEAM_OTHER) {
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Enter team name in the Customer Name field below.
              </div>
            );
          }

          // Filter team options based on booking type using team_category
          const categoryMap = {
            [BOOKING_TYPES.TEAM_USTA]: ['usta_adult', 'usta_junior', 'usta', 'usta_league'],
            [BOOKING_TYPES.TEAM_HS]: ['team_hs', 'high_school'],
            [BOOKING_TYPES.TEAM_COLLEGE]: ['College', 'college'],
          };

          const allowedCategories = categoryMap[formData.bookingType] || [];
          const filteredOptions = teamOptions.filter(t =>
            allowedCategories.some(allowed =>
              (t.category || '').toLowerCase() === allowed.toLowerCase()
            )
          );

          if (filteredOptions.length > 0) {
            return (
              <Select
                label="Team"
                value={formData.entityId}
                onChange={(value) => {
                  const team = filteredOptions.find(t => t.value === value);
                  onChange({
                    entityId: value,
                    customerName: team?.label || '',
                    customerPhone: team?.phone || '',
                  });
                }}
                options={filteredOptions}
                placeholder="Select team..."
                required
              />
            );
          }

          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <strong>No teams found for this type.</strong> Add teams to the Teams sheet in Google Sheets, or enter team info in Customer Name field below.
            </div>
          );
        })()
      )}

      {/* Tournament Selection */}
      {isTournament && (
        tournamentOptions.length > 0 ? (
          <Select
            label="Tournament"
            value={formData.entityId}
            onChange={(value) => {
              const tournament = tournamentOptions.find(t => t.value === value);
              onChange({
                entityId: value,
                customerName: tournament?.label || '', // Auto-fill tournament name
              });
            }}
            options={tournamentOptions}
            placeholder="Select tournament..."
            required
          />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>No tournaments configured.</strong> Add tournaments to the Tournaments sheet in Google Sheets, or enter tournament name in Customer Name field.
          </div>
        )
      )}

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Customer Name"
          value={formData.customerName}
          onChange={handleFieldChange('customerName')}
          placeholder="Enter customer name"
          required={formData.bookingType === BOOKING_TYPES.OPEN}
        />
        <Input
          label="Phone Number"
          type="tel"
          value={formData.customerPhone}
          onChange={handleFieldChange('customerPhone')}
          placeholder="(501) 555-1234"
        />
      </div>

      {/* Participation Info */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Players per court"
            value={formData.participantCount || 2}
            onChange={handleFieldChange('participantCount')}
            options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: n, label: String(n) }))}
          />
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isYouth"
              checked={formData.isYouth || false}
              onChange={(e) => onChange({ isYouth: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="isYouth" className="text-sm text-gray-700">
              Youth booking (all under 18)
            </label>
          </div>
        </div>
        {/* Participation calculation tooltip */}
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-medium">Recording: </span>
          {(formData.participantCount || 2) * (isEditing ? 1 : (formData.courts?.length || 1))} {formData.isYouth ? 'youth' : 'adult'} participant{((formData.participantCount || 2) * (isEditing ? 1 : (formData.courts?.length || 1))) !== 1 ? 's' : ''}
          {!isEditing && (formData.courts?.length || 1) > 1 && (
            <span className="text-gray-500"> ({formData.participantCount || 2} × {formData.courts?.length} courts)</span>
          )}
        </div>
      </div>

      {/* Payment Info */}
      {showPayment && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Payment Information</h4>

          {/* Rate Info */}
          {rateBreakdown && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
              <div className="font-medium">{rateBreakdown.description}</div>
              {rateBreakdown.totalHours > 0 && (
                <div className="text-xs mt-1 text-blue-600">
                  {rateBreakdown.totalHours} hour{rateBreakdown.totalHours !== 1 ? 's' : ''}
                  {rateBreakdown.primeHours > 0 && rateBreakdown.nonPrimeHours > 0 && (
                    <span> ({rateBreakdown.nonPrimeHours}hr non-prime + {rateBreakdown.primeHours}hr prime)</span>
                  )}
                  {(formData.courts?.length || 1) > 1 && (
                    <span> × {formData.courts?.length} courts</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Payment Status"
              value={formData.paymentStatus}
              onChange={handleFieldChange('paymentStatus')}
              options={paymentStatusOptions}
            />
            <Input
              label="Amount ($)"
              type="number"
              value={formData.paymentAmount}
              onChange={handleFieldChange('paymentAmount')}
              min="0"
              step="0.01"
            />
            <Select
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={handleFieldChange('paymentMethod')}
              options={paymentMethodOptions}
              placeholder="Select..."
            />
          </div>
        </div>
      )}

      {/* Recurring Booking Options - only show in create mode */}
      {!isEditing && !isMultiDay && (
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.recurring || false}
              onChange={(e) => onChange({ recurring: e.target.checked, recurringWeeks: e.target.checked ? 4 : 0 })}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
              Repeat Weekly
            </label>
          </div>

          {formData.recurring && (
            <div className="ml-7 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Repeat for</label>
                <select
                  value={formData.recurringWeeks || 4}
                  onChange={(e) => onChange({ recurringWeeks: parseInt(e.target.value, 10) })}
                  className="rounded-md border-gray-300 text-sm focus:ring-green-500 focus:border-green-500"
                >
                  {[2, 3, 4, 6, 8, 10, 12, 16, 20, 24].map(n => (
                    <option key={n} value={n}>{n} weeks</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                This will create {formData.recurringWeeks || 4} bookings, one for each week on {formData.date ? new Date(formData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }) + 's' : 'the same day'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <Textarea
        label="Notes"
        value={formData.notes}
        onChange={handleFieldChange('notes')}
        placeholder="Additional notes..."
        rows={2}
      />
    </div>
  );
}
