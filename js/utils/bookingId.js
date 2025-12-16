// Booking ID Utilities for Rebsamen Tennis Center Scheduler
// Format: DDCC-HHMM (e.g., 1605-0900 = 16th, Court 5, 9:00 AM)

const BookingId = {
    // Generate booking ID from date, court, and time
    generate(date, courtNumber, time) {
        const day = DateHelpers.getDayOfMonth(date);
        const court = String(courtNumber).padStart(2, '0');
        const [hours, minutes] = time.split(':');

        return `${day}${court}-${hours}${minutes}`;
    },

    // Parse booking ID to extract components
    parse(bookingId) {
        if (!bookingId || bookingId.length !== 9) return null;

        const day = bookingId.substring(0, 2);
        const court = bookingId.substring(2, 4);
        const hours = bookingId.substring(5, 7);
        const minutes = bookingId.substring(7, 9);

        return {
            day: parseInt(day),
            court: parseInt(court),
            time: `${hours}:${minutes}`,
            courtName: parseInt(court) === 17 ? 'Stadium' : `Court ${parseInt(court)}`
        };
    },

    // Validate booking ID format
    isValid(bookingId) {
        if (!bookingId || typeof bookingId !== 'string') return false;

        // Check format: DDCC-HHMM
        const regex = /^(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-7])-(0[89]|1[0-9]|2[0-1])(00|30)$/;
        return regex.test(bookingId);
    },

    // Generate group ID for multi-court bookings
    generateGroupId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `G${timestamp}${random}`.toUpperCase();
    },

    // Generate multiple booking IDs for a multi-court booking
    generateMultiple(date, courts, time) {
        return courts.map(court => this.generate(date, court, time));
    },

    // Format booking ID for display (add visual separator)
    formatForDisplay(bookingId) {
        if (!bookingId) return '';
        return bookingId; // Already has dash
    },

    // Get court number from ID
    getCourtFromId(bookingId) {
        const parsed = this.parse(bookingId);
        return parsed ? parsed.court : null;
    },

    // Get time from ID
    getTimeFromId(bookingId) {
        const parsed = this.parse(bookingId);
        return parsed ? parsed.time : null;
    },

    // Check if two booking IDs are for the same time slot
    sameTimeSlot(id1, id2) {
        const p1 = this.parse(id1);
        const p2 = this.parse(id2);
        if (!p1 || !p2) return false;
        return p1.day === p2.day && p1.time === p2.time;
    },

    // Generate recurring ID
    generateRecurringId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 5);
        return `R${timestamp}${random}`.toUpperCase();
    }
};

// Make available globally
window.BookingId = BookingId;
