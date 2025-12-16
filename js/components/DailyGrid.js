// DailyGrid Component - Main daily view showing all courts

const DailyGrid = ({
    selectedDate,
    courts,
    bookings,
    onSlotClick,
    onBookingClick,
    getEntityName
}) => {
    const timeSlots = DateHelpers.generateTimeSlots('08:30', '21:00');
    const [currentTimePosition, setCurrentTimePosition] = React.useState(null);

    // Update current time marker every minute
    React.useEffect(() => {
        const updateTimeMarker = () => {
            if (DateHelpers.isToday(selectedDate)) {
                const position = DateHelpers.getCurrentTimeSlotIndex(timeSlots);
                setCurrentTimePosition(position);
            } else {
                setCurrentTimePosition(null);
            }
        };

        updateTimeMarker();
        const interval = setInterval(updateTimeMarker, 60000);
        return () => clearInterval(interval);
    }, [selectedDate, timeSlots]);

    // Get booking color class based on type
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

    // Get booking for a specific slot
    const getBookingForSlot = (courtNumber, time) => {
        return bookings.find(b => {
            if (parseInt(b.court) !== parseInt(courtNumber)) return false;
            if (b.status === 'cancelled') return false;

            // Check if this slot falls within the booking time
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

    // Calculate booking height (number of slots)
    const getBookingSlots = (booking) => {
        const startIdx = timeSlots.indexOf(booking.time_start);
        const endIdx = timeSlots.findIndex(t => t === booking.time_end);
        return endIdx > startIdx ? endIdx - startIdx : 1;
    };

    // Get display name for booking
    const getBookingDisplayName = (booking) => {
        if (booking.booking_type === 'contractor' || booking.booking_type.startsWith('team_')) {
            return getEntityName(booking.booking_type, booking.entity_id) || booking.customer_name || 'Reserved';
        }
        return booking.customer_name || 'Reserved';
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Grid container with horizontal scroll */}
            <div className="overflow-x-auto">
                <div className="min-w-max">
                    {/* Header row with court names */}
                    <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                        <div className="w-20 flex-shrink-0 p-2 text-center text-sm font-medium text-gray-500 border-r border-gray-200">
                            Time
                        </div>
                        {courts.map(court => (
                            <div
                                key={court.court_number}
                                className="w-28 flex-shrink-0 p-2 text-center text-sm font-medium text-gray-700 border-r border-gray-200"
                            >
                                <div>{court.court_name}</div>
                                {court.status !== 'available' && court.status !== 'open' && (
                                    <span className="text-xs text-red-500">({court.status})</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Time slots grid */}
                    <div className="relative">
                        {/* Current time marker */}
                        {currentTimePosition !== null && currentTimePosition >= 0 && currentTimePosition <= timeSlots.length && (
                            <div
                                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                                style={{ top: `${currentTimePosition * 40}px` }}
                            >
                                <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                            </div>
                        )}

                        {timeSlots.map((time, timeIdx) => (
                            <div key={time} className="flex border-b border-gray-100">
                                {/* Time label */}
                                <div className="w-20 flex-shrink-0 p-2 text-center text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                                    {DateHelpers.formatTime(time)}
                                </div>

                                {/* Court slots */}
                                {courts.map(court => {
                                    const booking = getBookingForSlot(court.court_number, time);
                                    const isStart = isBookingStart(booking, time);
                                    const isPast = DateHelpers.isTimePast(selectedDate, time);

                                    // If this is a continuation of a booking, render empty cell
                                    if (booking && !isStart) {
                                        return (
                                            <div
                                                key={`${court.court_number}-${time}`}
                                                className="w-28 flex-shrink-0 h-10 border-r border-gray-200"
                                            />
                                        );
                                    }

                                    // If this is the start of a booking, render the booking block
                                    if (booking && isStart) {
                                        const slots = getBookingSlots(booking);
                                        const isCheckedIn = booking.checked_in === 'TRUE' || booking.checked_in === true;

                                        return (
                                            <div
                                                key={`${court.court_number}-${time}`}
                                                className="w-28 flex-shrink-0 border-r border-gray-200 relative"
                                                style={{ height: '40px' }}
                                            >
                                                <button
                                                    onClick={() => onBookingClick(booking)}
                                                    className={`absolute left-0.5 right-0.5 top-0.5 rounded-md p-1 text-white text-xs font-medium overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${getBookingColor(booking.booking_type)} ${isPast ? 'opacity-75' : ''}`}
                                                    style={{ height: `${slots * 40 - 4}px`, zIndex: 5 }}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <span className="truncate">{getBookingDisplayName(booking)}</span>
                                                        {isCheckedIn && (
                                                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="text-xs opacity-75 truncate">
                                                        {DateHelpers.formatTime(booking.time_start)} - {DateHelpers.formatTime(booking.time_end)}
                                                    </div>
                                                    {booking.booking_id && (
                                                        <div className="text-xs opacity-75 truncate mt-0.5">
                                                            ID: {booking.booking_id}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    }

                                    // Empty slot - clickable to create booking
                                    return (
                                        <div
                                            key={`${court.court_number}-${time}`}
                                            className="w-28 flex-shrink-0 h-10 border-r border-gray-200"
                                        >
                                            <button
                                                onClick={() => onSlotClick(court.court_number, time)}
                                                disabled={isPast}
                                                className={`w-full h-full transition-colors ${
                                                    isPast
                                                        ? 'bg-gray-100 cursor-not-allowed'
                                                        : 'hover:bg-green-50 cursor-pointer'
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

            {/* Legend */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-booking-open"></div>
                        <span>Open Play</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-booking-contractor"></div>
                        <span>Contractor</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-booking-team-usta"></div>
                        <span>USTA</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-booking-team-hs"></div>
                        <span>High School</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-booking-tournament"></div>
                        <span>Tournament</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-booking-maintenance"></div>
                        <span>Maintenance</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-booking-hold"></div>
                        <span>Hold</span>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Checked In</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Make available globally
window.DailyGrid = DailyGrid;
