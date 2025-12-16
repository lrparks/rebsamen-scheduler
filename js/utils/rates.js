// Rate Calculation Utilities for Rebsamen Tennis Center Scheduler

const Rates = {
    // Standard rates
    PRIME_TIME: 12.00,      // M-F 5pm-9pm, Sat-Sun all day
    NON_PRIME: 10.00,       // M-F 8:30am-5pm

    // Group rates
    GROUP_50_PLUS: 4.00,    // 50+ court hours
    GROUP_10_PLUS: 4.50,    // 10+ court hours
    TEAM_5_COURTS: 50.00,   // Team tennis (5 courts x 2 hrs)
    TEAM_3_COURTS: 30.00,   // Team tennis (3 courts x 2 hrs)

    // Special
    BALL_MACHINE: 10.00,    // Per hour
    YOUTH_FREE: true,       // 16 & under play free

    // Calculate rate for a single booking
    calculateRate(date, startTime, endTime, bookingType = 'open', options = {}) {
        const duration = DateHelpers.calculateDuration(startTime, endTime);

        // Free bookings
        if (bookingType === 'maintenance' || bookingType === 'hold') {
            return { rate: 0, total: 0, description: 'No charge' };
        }

        // Youth free play
        if (options.isYouth) {
            return { rate: 0, total: 0, description: 'Youth (16 & under) - Free' };
        }

        // Team bookings - flat rate
        if (bookingType.startsWith('team_')) {
            const courtCount = options.courtCount || 1;
            if (courtCount >= 5) {
                return {
                    rate: this.TEAM_5_COURTS,
                    total: this.TEAM_5_COURTS,
                    description: 'Team Tennis (5 courts)'
                };
            } else if (courtCount >= 3) {
                return {
                    rate: this.TEAM_3_COURTS,
                    total: this.TEAM_3_COURTS,
                    description: 'Team Tennis (3 courts)'
                };
            }
        }

        // Contractor - typically invoiced, but calculate for reference
        if (bookingType === 'contractor') {
            const hours = options.totalHours || duration;
            let rate;
            if (hours >= 50) {
                rate = this.GROUP_50_PLUS;
            } else if (hours >= 10) {
                rate = this.GROUP_10_PLUS;
            } else {
                rate = this.isPrimeTime(date, startTime) ? this.PRIME_TIME : this.NON_PRIME;
            }
            return {
                rate: rate,
                total: rate * duration,
                description: `Contractor rate: $${rate.toFixed(2)}/hr`
            };
        }

        // Tournament - special pricing TBD
        if (bookingType === 'tournament') {
            return {
                rate: 0,
                total: 0,
                description: 'Tournament - See contract'
            };
        }

        // Standard open play
        const isPrime = this.isPrimeTime(date, startTime);
        const rate = isPrime ? this.PRIME_TIME : this.NON_PRIME;

        // First 1.5 hours is the standard block
        const standardDuration = Math.min(duration, 1.5);
        const extraDuration = Math.max(0, duration - 1.5);

        const total = (standardDuration > 0 ? rate : 0) + (extraDuration * rate / 1.5);

        return {
            rate: rate,
            total: rate, // Standard block rate
            description: isPrime ? 'Prime Time Rate' : 'Non-Prime Rate',
            duration: duration,
            isPrime: isPrime
        };
    },

    // Check if time is prime time
    isPrimeTime(date, time) {
        return DateHelpers.isPrimeTime(date, time);
    },

    // Calculate refund based on cancellation policy
    calculateRefund(booking, cancelReason) {
        // Weather cancellation - always full refund
        if (cancelReason === 'weather') {
            return {
                amount: booking.payment_amount || 0,
                status: 'full',
                description: 'Weather cancellation - Full refund'
            };
        }

        // No-show - no refund
        if (cancelReason === 'no_show') {
            return {
                amount: 0,
                status: 'none',
                description: 'No-show - No refund'
            };
        }

        // Customer cancellation - check timing
        if (cancelReason === 'customer') {
            const hoursUntil = DateHelpers.hoursUntilBooking(booking.date, booking.time_start);

            if (hoursUntil >= 24) {
                return {
                    amount: booking.payment_amount || 0,
                    status: 'full',
                    description: 'Cancelled 24+ hours in advance - Full refund'
                };
            } else {
                return {
                    amount: 0,
                    status: 'none',
                    description: 'Cancelled less than 24 hours - No refund'
                };
            }
        }

        // Facility cancellation - full refund
        if (cancelReason === 'facility') {
            return {
                amount: booking.payment_amount || 0,
                status: 'full',
                description: 'Facility cancellation - Full refund'
            };
        }

        // Default - no refund
        return {
            amount: 0,
            status: 'none',
            description: 'No refund'
        };
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    // Get rate description
    getRateDescription(bookingType, options = {}) {
        switch (bookingType) {
            case 'open':
                return 'Standard court fee';
            case 'contractor':
                return 'Contractor rate (invoiced)';
            case 'team_usta':
            case 'team_hs':
            case 'team_college':
            case 'team_other':
                return 'Team tennis rate';
            case 'tournament':
                return 'Tournament (see contract)';
            case 'maintenance':
                return 'Maintenance - No charge';
            case 'hold':
                return 'Hold - No charge';
            default:
                return 'Standard rate';
        }
    },

    // Estimate contractor invoice
    estimateContractorInvoice(bookings) {
        const totalHours = bookings.reduce((sum, b) => {
            return sum + DateHelpers.calculateDuration(b.time_start, b.time_end);
        }, 0);

        let rate;
        if (totalHours >= 50) {
            rate = this.GROUP_50_PLUS;
        } else if (totalHours >= 10) {
            rate = this.GROUP_10_PLUS;
        } else {
            rate = this.NON_PRIME; // Default to non-prime for small contractors
        }

        return {
            totalHours: totalHours,
            rate: rate,
            total: totalHours * rate,
            courtCount: bookings.length,
            tier: totalHours >= 50 ? '50+ hours' : (totalHours >= 10 ? '10+ hours' : 'Standard')
        };
    }
};

// Make available globally
window.Rates = Rates;
