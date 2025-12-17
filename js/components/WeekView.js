// WeekView Component - Weekly view for a single court

const WeekView = ({
    selectedDate,
    selectedCourt,
    onCourtChange,
    courts,
    getBookingsForDateRange,
    onSlotClick,
    onBookingClick,
    getEntityName
}) => {
    const weekDays = DateHelpers.getWeekDays(selectedDate);
    const timeSlots = DateHelpers.generateTimeSlots('08:30', '21:00');

    // Get bookings for the week
    const weekBookings = React.useMemo(() => {
        const startDate = weekDays[0];
        const endDate = weekDays[6];
        return getBookingsForDateRange(startDate, endDate)
            .filter(b => parseInt(b.court) === parseInt(selectedCourt));
    }, [weekDays, selectedCourt, getBookingsForDateRange]);

    // Get booking for a specific slot
    const getBookingForSlot = (date, time) => {
        return weekBookings.find(b => {
            if (b.date !== date) return false;
            if (b.status === 'cancelled') return false;

            const slotTime = time.replace(':', '');
            const startTime = b.time_start.replace(':', '');
            const endTime = b.time_end.replace(':', '');

            return slotTime >= startTime && slotTime < endTime;
        });
    };

    // Check if slot is the start of a booking
    const isBookingStart = (booking, time) => {
        return booking && booking.time_start === time;
    };

    // Calculate booking slots
    const getBookingSlots = (booking) => {
        const startIdx = timeSlots.indexOf(booking.time_start);
        const endIdx = timeSlots.findIndex(t => t === booking.time_end);
        return endIdx > startIdx ? endIdx - startIdx : 1;
    };

    // Get booking color
    const getBookingColor = (type) => {
        const colors = {
            open: 'bg-booking-open',
            contractor: 'bg-booking-contractor',
            team_usta: 'bg-booking-team-usta',
            team_hs: 'bg-booking-team-hs',
            team_college: 'bg-booking-team-college',
            team_other: 'bg-booking-team-other',
            tournament: 'bg-booking-tournament',
            maintenance: 'bg-booking-maintenance',
            hold: 'bg-booking-hold'
        };
        return colors[type] || 'bg-gray-400';
    };

    const getBookingDisplayName = (booking) => {
        if (booking.booking_type === 'contractor' || booking.booking_type.startsWith('team_')) {
            return getEntityName(booking.booking_type, booking.entity_id) || booking.customer_name || 'Reserved';
        }
        return booking.customer_name || 'Reserved';
    };

    const selectedCourtData = courts.find(c => c.court_number === selectedCourt);

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Court Selector */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Court:</label>
                    <select
                        value={selectedCourt}
                        onChange={(e) => onCourtChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                        {courts.map(court => (
                            <option key={court.court_number} value={court.court_number}>
                                {court.court_name}
                            </option>
                        ))}
                    </select>
                    <span className="text-gray-500">
                        Week of {DateHelpers.formatDisplayDate(weekDays[0])}
                    </span>
                </div>
            </div>

            {/* Grid container */}
            <div className="overflow-x-auto">
                <div className="min-w-max">
                    {/* Header row with days */}
                    <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                        <div className="w-20 flex-shrink-0 p-2 text-center text-sm font-medium text-gray-500 border-r border-gray-200">
                            Time
                        </div>
                        {weekDays.map(day => {
                            const isToday = DateHelpers.isToday(day);
                            const dayName = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = new Date(day).getDate();

                            return (
                                <div
                                    key={day}
                                    className={`w-32 flex-shrink-0 p-2 text-center border-r border-gray-200 ${isToday ? 'bg-green-50' : ''}`}
                                >
                                    <div className="text-xs text-gray-500">{dayName}</div>
                                    <div className={`text-lg font-medium ${isToday ? 'text-green-600' : 'text-gray-700'}`}>
                                        {dayNum}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time slots grid */}
                    <div className="relative">
                        {timeSlots.map((time, timeIdx) => (
                            <div key={time} className="flex border-b border-gray-100">
                                {/* Time label */}
                                <div className="w-20 flex-shrink-0 p-2 text-center text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                                    {DateHelpers.formatTime(time)}
                                </div>

                                {/* Day slots */}
                                {weekDays.map(day => {
                                    const booking = getBookingForSlot(day, time);
                                    const isStart = isBookingStart(booking, time);
                                    const isPast = DateHelpers.isTimePast(day, time);
                                    const isToday = DateHelpers.isToday(day);

                                    // Continuation cell
                                    if (booking && !isStart) {
                                        return (
                                            <div
                                                key={`${day}-${time}`}
                                                className={`w-32 flex-shrink-0 h-10 border-r border-gray-200 ${isToday ? 'bg-green-50' : ''}`}
                                            />
                                        );
                                    }

                                    // Booking start cell
                                    if (booking && isStart) {
                                        const slots = getBookingSlots(booking);

                                        return (
                                            <div
                                                key={`${day}-${time}`}
                                                className={`w-32 flex-shrink-0 border-r border-gray-200 relative ${isToday ? 'bg-green-50' : ''}`}
                                                style={{ height: '40px' }}
                                            >
                                                <button
                                                    onClick={() => onBookingClick(booking)}
                                                    className={`absolute left-0.5 right-0.5 top-0.5 rounded-md p-1 text-white text-xs font-medium overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${getBookingColor(booking.booking_type)}`}
                                                    style={{ height: `${slots * 40 - 4}px`, zIndex: 5 }}
                                                >
                                                    <div className="truncate">{getBookingDisplayName(booking)}</div>
                                                    <div className="text-xs opacity-75">
                                                        {DateHelpers.formatTime(booking.time_start)}
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    }

                                    // Empty slot
                                    return (
                                        <div
                                            key={`${day}-${time}`}
                                            className={`w-32 flex-shrink-0 h-10 border-r border-gray-200 ${isToday ? 'bg-green-50' : ''}`}
                                        >
                                            <button
                                                onClick={() => onSlotClick(selectedCourt, time, day)}
                                                disabled={isPast}
                                                className={`w-full h-full transition-colors ${
                                                    isPast
                                                        ? 'bg-gray-100 cursor-not-allowed'
                                                        : 'hover:bg-green-100 cursor-pointer'
                                                }`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Make available globally
window.WeekView = WeekView;
