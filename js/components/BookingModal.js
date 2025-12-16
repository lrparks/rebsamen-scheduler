// BookingModal Component - Create/Edit/View booking details

const BookingModal = ({
    isOpen,
    onClose,
    booking,
    selectedDate,
    selectedCourt,
    selectedTime,
    courts,
    contractors,
    teams,
    currentStaff,
    onSave,
    onCheckIn,
    onCancel,
    onNoShow,
    isSlotAvailable
}) => {
    const isEditing = !!booking;
    const timeSlots = DateHelpers.generateTimeSlots('08:30', '21:00');

    // Form state
    const [formData, setFormData] = React.useState({
        date: selectedDate || DateHelpers.getToday(),
        court: selectedCourt || '1',
        time_start: selectedTime || '09:00',
        time_end: '10:30',
        booking_type: 'open',
        entity_id: '',
        customer_name: '',
        customer_phone: '',
        payment_status: 'pending',
        payment_amount: '',
        payment_method: '',
        notes: '',
        is_recurring: false
    });

    const [showConfirmation, setShowConfirmation] = React.useState(false);
    const [createdBookingId, setCreatedBookingId] = React.useState(null);
    const [error, setError] = React.useState(null);

    // Initialize form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (booking) {
                setFormData({
                    date: booking.date || selectedDate,
                    court: booking.court || selectedCourt || '1',
                    time_start: booking.time_start || selectedTime || '09:00',
                    time_end: booking.time_end || '10:30',
                    booking_type: booking.booking_type || 'open',
                    entity_id: booking.entity_id || '',
                    customer_name: booking.customer_name || '',
                    customer_phone: booking.customer_phone || '',
                    payment_status: booking.payment_status || 'pending',
                    payment_amount: booking.payment_amount || '',
                    payment_method: booking.payment_method || '',
                    notes: booking.notes || '',
                    is_recurring: false
                });
            } else {
                // Calculate default end time (1.5 hours after start)
                const startIdx = timeSlots.indexOf(selectedTime || '09:00');
                const endIdx = Math.min(startIdx + 3, timeSlots.length - 1);
                const defaultEndTime = timeSlots[endIdx] || '21:00';

                setFormData({
                    date: selectedDate || DateHelpers.getToday(),
                    court: selectedCourt || '1',
                    time_start: selectedTime || '09:00',
                    time_end: defaultEndTime,
                    booking_type: 'open',
                    entity_id: '',
                    customer_name: '',
                    customer_phone: '',
                    payment_status: 'pending',
                    payment_amount: '',
                    payment_method: '',
                    notes: '',
                    is_recurring: false
                });
            }
            setShowConfirmation(false);
            setCreatedBookingId(null);
            setError(null);
        }
    }, [isOpen, booking, selectedDate, selectedCourt, selectedTime, timeSlots]);

    // Calculate rate when form changes
    React.useEffect(() => {
        const rateInfo = Rates.calculateRate(
            formData.date,
            formData.time_start,
            formData.time_end,
            formData.booking_type
        );
        setFormData(prev => ({
            ...prev,
            payment_amount: rateInfo.total.toFixed(2)
        }));
    }, [formData.date, formData.time_start, formData.time_end, formData.booking_type]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate time range
        if (formData.time_start >= formData.time_end) {
            setError('End time must be after start time');
            return;
        }

        // Check availability (for new bookings or if time/court changed)
        if (!isEditing || formData.court !== booking.court || formData.time_start !== booking.time_start) {
            const available = isSlotAvailable(
                formData.date,
                formData.court,
                formData.time_start,
                formData.time_end,
                booking?.booking_id
            );
            if (!available) {
                setError('This time slot is not available');
                return;
            }
        }

        // Generate booking ID for new bookings
        const bookingId = isEditing
            ? booking.booking_id
            : BookingId.generate(formData.date, formData.court, formData.time_start);

        const result = await onSave({
            ...formData,
            booking_id: bookingId
        });

        if (result.success) {
            setCreatedBookingId(bookingId);
            setShowConfirmation(true);
        } else {
            setError(result.error || 'Failed to save booking');
        }
    };

    const handleCheckIn = async () => {
        const result = await onCheckIn(booking.booking_id);
        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Failed to check in');
        }
    };

    const handleNoShow = async () => {
        if (confirm('Mark this booking as a no-show? This cannot be undone.')) {
            const result = await onNoShow(booking.booking_id);
            if (result.success) {
                onClose();
            } else {
                setError(result.error || 'Failed to mark no-show');
            }
        }
    };

    const isCheckedIn = booking?.checked_in === 'TRUE' || booking?.checked_in === true;
    const canCheckIn = isEditing && !isCheckedIn && booking?.status === 'active';
    const canMarkNoShow = isEditing && booking?.status === 'active' &&
        DateHelpers.isBookingPast(booking.date, booking.time_end);

    if (!isOpen) return null;

    // Confirmation screen after saving
    if (showConfirmation) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {isEditing ? 'Booking Updated' : 'Booking Created'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Give this code to customer for POS:
                        </p>
                        <div className="bg-gray-100 rounded-lg p-4 mb-4">
                            <div className="text-3xl font-mono font-bold text-parks-green">
                                {createdBookingId}
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            {DateHelpers.formatDisplayDate(formData.date)} at {DateHelpers.formatTime(formData.time_start)}
                            <br />
                            {courts.find(c => c.court_number === formData.court)?.court_name || `Court ${formData.court}`}
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-parks-green text-white rounded-lg hover:bg-parks-green-dark"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {isEditing ? 'View/Edit Booking' : 'New Booking'}
                        </h2>
                        {isEditing && booking.booking_id && (
                            <p className="text-sm text-gray-500">ID: {booking.booking_id}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Status badges for existing booking */}
                {isEditing && (
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'active' ? 'bg-green-100 text-green-800' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            booking.status === 'no_show' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {booking.status?.toUpperCase() || 'ACTIVE'}
                        </span>
                        {isCheckedIn && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                CHECKED IN
                            </span>
                        )}
                        {booking.payment_status && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                booking.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {booking.payment_status.toUpperCase()}
                            </span>
                        )}
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="px-6 py-3 bg-red-50 border-b border-red-200">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Date and Time */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <select
                                name="time_start"
                                value={formData.time_start}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                            >
                                {timeSlots.map(time => (
                                    <option key={time} value={time}>{DateHelpers.formatTime(time)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <select
                                name="time_end"
                                value={formData.time_end}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                            >
                                {timeSlots.filter(t => t > formData.time_start).map(time => (
                                    <option key={time} value={time}>{DateHelpers.formatTime(time)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Court */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                        <select
                            name="court"
                            value={formData.court}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            required
                        >
                            {courts.map(court => (
                                <option key={court.court_number} value={court.court_number}>
                                    {court.court_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Booking Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Booking Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { value: 'open', label: 'Open Play' },
                                { value: 'contractor', label: 'Contractor' },
                                { value: 'team_usta', label: 'Team - USTA' },
                                { value: 'team_hs', label: 'Team - HS' },
                                { value: 'team_college', label: 'Team - College' },
                                { value: 'tournament', label: 'Tournament' },
                                { value: 'maintenance', label: 'Maintenance' },
                                { value: 'hold', label: 'Hold' }
                            ].map(type => (
                                <label
                                    key={type.value}
                                    className={`flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                                        formData.booking_type === type.value
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="booking_type"
                                        value={type.value}
                                        checked={formData.booking_type === type.value}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <span className="text-sm">{type.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Contractor dropdown */}
                    {formData.booking_type === 'contractor' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
                            <select
                                name="entity_id"
                                value={formData.entity_id}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                <option value="">-- Select Contractor --</option>
                                {contractors.map(c => (
                                    <option key={c.contractor_id} value={c.contractor_id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Team dropdown */}
                    {formData.booking_type.startsWith('team_') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                            <select
                                name="entity_id"
                                value={formData.entity_id}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                <option value="">-- Select Team --</option>
                                {teams.map(t => (
                                    <option key={t.team_id} value={t.team_id}>
                                        {t.name} ({t.team_type})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                            <input
                                type="text"
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter customer name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                            <input
                                type="tel"
                                name="customer_phone"
                                value={formData.customer_phone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="(555) 555-5555"
                            />
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                            <select
                                name="payment_status"
                                value={formData.payment_status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="waived">Waived</option>
                                <option value="invoiced">Invoiced</option>
                                <option value="na">N/A</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    name="payment_amount"
                                    value={formData.payment_amount}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <select
                                name="payment_method"
                                value={formData.payment_method}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                                <option value="">-- Select --</option>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="invoice">Invoice</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Any additional notes..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                        {/* Check-in button for existing bookings */}
                        {canCheckIn && (
                            <button
                                type="button"
                                onClick={handleCheckIn}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Check In
                            </button>
                        )}

                        {/* Cancel button for existing bookings */}
                        {isEditing && booking.status === 'active' && (
                            <button
                                type="button"
                                onClick={() => onCancel(booking)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Cancel Booking
                            </button>
                        )}

                        {/* No-show button */}
                        {canMarkNoShow && (
                            <button
                                type="button"
                                onClick={handleNoShow}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                            >
                                Mark No-Show
                            </button>
                        )}

                        <div className="flex-1"></div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            {isEditing ? 'Close' : 'Cancel'}
                        </button>

                        {(!isEditing || booking.status === 'active') && (
                            <button
                                type="submit"
                                className="px-4 py-2 bg-parks-green text-white rounded-lg hover:bg-parks-green-dark"
                            >
                                {isEditing ? 'Update Booking' : 'Create Booking'}
                            </button>
                        )}
                    </div>

                    {/* Metadata for existing bookings */}
                    {isEditing && (
                        <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                            <p>Created by: {booking.created_by} on {booking.created_at}</p>
                            {booking.modified_at && <p>Last modified: {booking.modified_at}</p>}
                            {isCheckedIn && <p>Checked in by: {booking.checked_in_by} at {booking.checked_in_at}</p>}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

// Make available globally
window.BookingModal = BookingModal;
