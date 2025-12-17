// Google Sheets API Utilities for Rebsamen Tennis Center Scheduler

const SheetsApi = {
    // CSV Endpoint URLs
    ENDPOINTS: {
        bookings: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=2047840747&single=true&output=csv',
        courts: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1236681655&single=true&output=csv',
        staff: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=269134827&single=true&output=csv',
        config: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1002653546&single=true&output=csv',
        maintenanceLog: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1598592918&single=true&output=csv',
        contractors: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=52721266&single=true&output=csv',
        teams: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9iggYOib3RykXB9pLf-GrS7IcZiuaOLy6e7Ve25z_PQEEc8Z4fBiPDu03_e7__jMK3GBfCHEpXyNA/pub?gid=1667747238&single=true&output=csv'
    },

    // Apps Script URL for write operations (placeholder)
    APPS_SCRIPT_URL: 'PLACEHOLDER_WILL_BE_SUPPLIED',

    // Parse CSV string to array of objects
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length < 2) return [];

        // Parse header row
        const headers = this.parseCSVLine(lines[0]);

        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseCSVLine(line);
            const row = {};

            headers.forEach((header, index) => {
                row[header.trim()] = values[index] ? values[index].trim() : '';
            });

            data.push(row);
        }

        return data;
    },

    // Parse a single CSV line (handling quoted values)
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);

        return values;
    },

    // Fetch data from a CSV endpoint
    async fetchData(endpoint) {
        try {
            const url = this.ENDPOINTS[endpoint];
            if (!url) {
                throw new Error(`Unknown endpoint: ${endpoint}`);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            throw error;
        }
    },

    // Fetch all data sources
    async fetchAll() {
        const results = await Promise.all([
            this.fetchData('bookings'),
            this.fetchData('courts'),
            this.fetchData('staff'),
            this.fetchData('config'),
            this.fetchData('contractors'),
            this.fetchData('teams'),
            this.fetchData('maintenanceLog')
        ]);

        return {
            bookings: results[0],
            courts: results[1],
            staff: results[2],
            config: results[3],
            contractors: results[4],
            teams: results[5],
            maintenanceLog: results[6]
        };
    },

    // Write operation - send to Apps Script
    async writeData(action, data) {
        if (this.APPS_SCRIPT_URL === 'PLACEHOLDER_WILL_BE_SUPPLIED') {
            console.warn('Apps Script URL not configured. Write operation simulated.');
            return { success: true, simulated: true, data };
        }

        try {
            const response = await fetch(this.APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, ...data })
            });

            return { success: true };
        } catch (error) {
            console.error('Error writing data:', error);
            throw error;
        }
    },

    // API Actions
    async createBooking(bookingData) {
        return this.writeData('createBooking', bookingData);
    },

    async updateBooking(bookingId, updates) {
        return this.writeData('updateBooking', { bookingId, updates });
    },

    async checkIn(bookingId, staffId) {
        return this.writeData('checkIn', {
            bookingId,
            staffId,
            checkedInAt: new Date().toISOString()
        });
    },

    async cancelBooking(bookingId, staffId, reason, refundInfo) {
        return this.writeData('cancelBooking', {
            bookingId,
            staffId,
            reason,
            refundInfo,
            cancelledAt: new Date().toISOString()
        });
    },

    async markNoShow(bookingId, staffId) {
        return this.writeData('markNoShow', {
            bookingId,
            staffId,
            markedAt: new Date().toISOString()
        });
    },

    async logMaintenance(taskData) {
        return this.writeData('logMaintenance', {
            ...taskData,
            completedAt: new Date().toISOString()
        });
    },

    // Helper: Get bookings for a specific date
    filterBookingsByDate(bookings, date) {
        return bookings.filter(b => b.date === date && b.status !== 'cancelled');
    },

    // Helper: Get bookings for a court
    filterBookingsByCourt(bookings, courtNumber) {
        return bookings.filter(b => parseInt(b.court) === courtNumber);
    },

    // Helper: Get bookings by type
    filterBookingsByType(bookings, type) {
        return bookings.filter(b => b.booking_type === type);
    },

    // Helper: Search bookings
    searchBookings(bookings, query) {
        const q = query.toLowerCase();
        return bookings.filter(b =>
            b.booking_id?.toLowerCase().includes(q) ||
            b.customer_name?.toLowerCase().includes(q) ||
            b.customer_phone?.includes(q) ||
            b.notes?.toLowerCase().includes(q)
        );
    }
};

// Make available globally
window.SheetsApi = SheetsApi;
