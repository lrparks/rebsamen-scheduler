// Date Helper Utilities for Rebsamen Tennis Center Scheduler

const DateHelpers = {
    // Format date as YYYY-MM-DD
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Format date for display (e.g., "Mon, Dec 16, 2024")
    formatDisplayDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    // Format time for display (e.g., "9:00 AM")
    formatTime(time24) {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    },

    // Convert 12-hour time to 24-hour format
    to24Hour(time12) {
        const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return time12;
        let [, hours, minutes, period] = match;
        hours = parseInt(hours);
        if (period.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }
        return `${String(hours).padStart(2, '0')}:${minutes}`;
    },

    // Get today's date
    getToday() {
        return this.formatDate(new Date());
    },

    // Add days to a date
    addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return this.formatDate(d);
    },

    // Get start of week (Monday)
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return this.formatDate(d);
    },

    // Get end of week (Sunday)
    getWeekEnd(date) {
        const start = this.getWeekStart(date);
        return this.addDays(start, 6);
    },

    // Get days of the week for a given date
    getWeekDays(date) {
        const start = this.getWeekStart(date);
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(this.addDays(start, i));
        }
        return days;
    },

    // Check if a date is today
    isToday(date) {
        return this.formatDate(date) === this.getToday();
    },

    // Check if date is weekend
    isWeekend(date) {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 || day === 6;
    },

    // Check if time is prime time (M-F 5pm-9pm, Sat-Sun all day)
    isPrimeTime(date, time) {
        const d = new Date(date);
        const day = d.getDay();
        const isWeekend = day === 0 || day === 6;

        if (isWeekend) return true;

        // Parse time
        const [hours] = time.split(':').map(Number);
        return hours >= 17 && hours < 21;
    },

    // Generate time slots (30-min increments)
    generateTimeSlots(startTime = '08:30', endTime = '21:00') {
        const slots = [];
        let [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        while (startHour < endHour || (startHour === endHour && startMin < endMin)) {
            const timeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
            slots.push(timeStr);

            startMin += 30;
            if (startMin >= 60) {
                startMin = 0;
                startHour++;
            }
        }

        return slots;
    },

    // Get current time as HH:MM
    getCurrentTime() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    },

    // Calculate duration in hours between two times
    calculateDuration(startTime, endTime) {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        return (endMinutes - startMinutes) / 60;
    },

    // Check if a time slot is in the past for today
    isTimePast(date, time) {
        if (!this.isToday(date)) return false;
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        return slotTime < now;
    },

    // Get time slot index for current time (for red line marker)
    getCurrentTimeSlotIndex(slots) {
        const currentTime = this.getCurrentTime();
        const [currentHour, currentMin] = currentTime.split(':').map(Number);
        const currentMinutes = currentHour * 60 + currentMin;

        for (let i = 0; i < slots.length; i++) {
            const [slotHour, slotMin] = slots[i].split(':').map(Number);
            const slotMinutes = slotHour * 60 + slotMin;

            if (currentMinutes < slotMinutes) {
                return i - 1 + ((currentMinutes - (slotMinutes - 30)) / 30);
            }
        }
        return slots.length;
    },

    // Parse date string to Date object
    parseDate(dateStr) {
        return new Date(dateStr + 'T00:00:00');
    },

    // Get day of month as two-digit string
    getDayOfMonth(date) {
        const d = new Date(date);
        return String(d.getDate()).padStart(2, '0');
    },

    // Check if booking time has passed (for no-show marking)
    isBookingPast(date, endTime, gracePeriodMinutes = 15) {
        const now = new Date();
        const bookingDate = new Date(date);
        const [hours, minutes] = endTime.split(':').map(Number);
        bookingDate.setHours(hours, minutes + gracePeriodMinutes, 0, 0);
        return now > bookingDate;
    },

    // Calculate hours until booking (for cancellation policy)
    hoursUntilBooking(date, startTime) {
        const now = new Date();
        const bookingDate = new Date(date);
        const [hours, minutes] = startTime.split(':').map(Number);
        bookingDate.setHours(hours, minutes, 0, 0);

        const diffMs = bookingDate - now;
        return diffMs / (1000 * 60 * 60);
    }
};

// Make available globally
window.DateHelpers = DateHelpers;
