# Rebsamen Tennis Center - Court Scheduler

A staff-only court scheduling application for Rebsamen Tennis Center in Little Rock, AR. This web application allows staff to manage court bookings, track contractors and teams, and monitor maintenance tasks.

## Features

- **Daily Grid View**: See all 17 courts at once with 30-minute time slots from 8:30 AM to 9:00 PM
- **Weekly View**: Single court view across a full week
- **Contractor Management**: Track contractor bookings and estimate invoices
- **Teams & Tournaments**: Manage team schedules (USTA, High School, College) and tournaments
- **Search**: Find bookings by ID, customer name, phone, or date range
- **Maintenance Dashboard**: Track daily, weekly, and monthly maintenance tasks
- **Check-in System**: Mark customers as arrived with timestamp tracking
- **Cancellation Handling**: Auto-suggest refunds based on cancellation policy

## Technology Stack

- **Frontend**: React 18 (via CDN, no build step required)
- **Styling**: Tailwind CSS
- **Data Source**: Google Sheets (read via published CSV endpoints)
- **Write Operations**: Google Apps Script web app (placeholder)
- **Hosting**: GitHub Pages (static site)

## Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/lrparks/rebsamen-scheduler.git
   cd rebsamen-scheduler
   ```

2. Serve the files locally (any static server works):
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve

   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser

### Deployment

The app is designed for GitHub Pages:

1. Push to the main branch
2. Enable GitHub Pages in repository settings
3. Select the root folder as the source

## Project Structure

```
rebsamen-scheduler/
├── index.html              # Main app shell
├── css/
│   └── styles.css          # Custom styles
├── js/
│   ├── app.js              # Main React app
│   ├── components/
│   │   ├── DailyGrid.js    # All-courts daily view
│   │   ├── WeekView.js     # Single-court weekly view
│   │   ├── ContractorView.js
│   │   ├── TeamsView.js
│   │   ├── SearchView.js
│   │   ├── MaintenanceView.js
│   │   ├── BookingModal.js
│   │   ├── CancelModal.js
│   │   ├── Navigation.js
│   │   └── StaffSelector.js
│   ├── hooks/
│   │   ├── useBookings.js
│   │   ├── useCourts.js
│   │   ├── useConfig.js
│   │   └── useStaff.js
│   └── utils/
│       ├── bookingId.js    # ID generation (DDCC-HHMM format)
│       ├── rates.js        # Rate calculation
│       ├── sheetsApi.js    # Google Sheets CSV fetching
│       └── dateHelpers.js
└── README.md
```

## Booking ID System

Format: `DDCC-HHMM` (9 characters)

| Component | Meaning | Example |
|-----------|---------|---------|
| DD | Day of month (01-31) | 16 |
| CC | Court number (01-17, where 17=Stadium) | 05 |
| HH | Hour in 24-hr format | 14 |
| MM | Minutes (00 or 30) | 00 |

Examples:
- `1605-0900` = 16th, Court 5, 9:00 AM
- `1617-1400` = 16th, Stadium, 2:00 PM

## Rate Structure

### Standard Fees (first 1.5 hours)
- **Prime Time** (M-F 5pm-9pm, Sat-Sun all day): $12.00
- **Non-Prime** (M-F 8:30am-5pm): $10.00

### Group Reservations
- 50+ court hours: $4.00/hr
- 10+ court hours: $4.50/hr
- Team Tennis (5 courts × 2 hrs): $50.00
- Team Tennis (3 courts × 2 hrs): $30.00

### Special
- Youth 16 & under: FREE (paying customers have priority)
- Ball machine: $10/hr

## Cancellation Policy

| Scenario | Refund |
|----------|--------|
| Customer cancels 24+ hrs before | Full refund |
| Customer cancels <24 hrs before | No refund |
| Weather cancellation | Full refund |
| No-show | No refund |

## Color Coding

| Type | Color |
|------|-------|
| Open Play | Blue |
| Contractor | Purple |
| USTA Team | Green |
| High School | Orange |
| Tournament | Red |
| Maintenance | Gray |
| Hold | Yellow |

## Google Sheets Integration

The app reads from published CSV endpoints from a Google Sheet. The Sheet ID is:
`1gcGdi1H7rI51msICntX2WrEYP14JXwxYmhMDshAtwLw`

### Tabs:
- Bookings - Main reservation data
- Courts - Court information
- Staff - Staff members
- Config - Configuration settings
- Contractors - Contractor list
- Teams - Team information
- MaintenanceLog - Maintenance history

### Write Operations

Write operations require a Google Apps Script web app. Set the URL in `js/utils/sheetsApi.js`:

```javascript
APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_URL_HERE'
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

Mobile responsive design is included for tablet/phone access.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the terms included in the LICENSE file.

## Support

For issues or questions, contact Little Rock Parks & Recreation.
