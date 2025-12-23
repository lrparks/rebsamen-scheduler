import { useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import { formatDateDisplay, formatTimeDisplay } from '../../utils/dateHelpers.js';

/**
 * Monday Night League Check-In Sheet Report
 * Groups bookings by session and displays them in a printable format
 */
export default function MondayNightLeagueReport({ selectedDate }) {
  const { bookings } = useBookingsContext();
  const { getCourtName } = useCourts();

  // Filter MNL bookings for selected date and group by session (time_start)
  const sessions = useMemo(() => {
    if (!selectedDate) return [];

    // Find all MNL bookings for this date
    const mnlBookings = bookings.filter(b =>
      b.date === selectedDate &&
      b.status === 'active' &&
      (b.booking_type === 'team_other' ||
       (b.customer_name && b.customer_name.includes(' vs ')))
    );

    if (mnlBookings.length === 0) return [];

    // Group by time_start (each unique start time is a session)
    const sessionMap = new Map();

    mnlBookings.forEach(booking => {
      const key = booking.time_start;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          timeStart: booking.time_start,
          timeEnd: booking.time_end,
          matches: [],
        });
      }

      sessionMap.get(key).matches.push({
        court: booking.court,
        courtName: getCourtName(parseInt(booking.court, 10)),
        competitor1: booking.customer_name?.split(' vs ')[0]?.trim() || 'TBD',
        competitor2: booking.customer_name?.split(' vs ')[1]?.trim() || 'TBD',
        bookingId: booking.booking_id,
      });
    });

    // Convert to array and sort by time
    const sessionArray = Array.from(sessionMap.values()).sort((a, b) =>
      a.timeStart.localeCompare(b.timeStart)
    );

    // Sort matches within each session by court number
    sessionArray.forEach(session => {
      session.matches.sort((a, b) => a.court - b.court);
    });

    return sessionArray;
  }, [bookings, selectedDate, getCourtName]);

  if (!selectedDate) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Please select a date to view the Monday Night League check-in sheet.</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          No Monday Night League bookings found for {formatDateDisplay(selectedDate)}.
        </p>
      </div>
    );
  }

  // Calculate if we should use page breaks (more than 10 matches per session might need separate pages)
  const usePageBreaks = sessions.some(s => s.matches.length > 10);

  return (
    <div className="space-y-8">
      {sessions.map((session, sessionIndex) => (
        <div
          key={sessionIndex}
          className={`bg-white rounded-lg border border-gray-200 ${
            usePageBreaks && sessionIndex > 0 ? 'page-break-before' : ''
          }`}
        >
          {/* Header - Only on first page or each session if page breaks */}
          {(sessionIndex === 0 || usePageBreaks) && (
            <div className="border-b border-gray-300 p-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                MONDAY NIGHT LEAGUE: CHECK-IN SHEET
              </h1>
              <h2 className="text-lg text-gray-700">
                Date: {formatDateDisplay(selectedDate)}
              </h2>
            </div>
          )}

          {/* Session Header */}
          <div className="bg-gray-50 border-b border-gray-300 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              SESSION {sessionIndex + 1}: {formatTimeDisplay(session.timeStart)} - {formatTimeDisplay(session.timeEnd)} (1.5hr Block)
            </h3>
          </div>

          {/* Matches Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-32">
                    COURT
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    COMPETITOR 1 vs. COMPETITOR 2
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-48">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {session.matches.map((match, matchIndex) => (
                  <tr key={matchIndex} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {match.courtName}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <span className="font-medium">{match.competitor1}</span>
                      {' vs '}
                      <span className="font-medium">{match.competitor2}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span>Checked In</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with match count */}
          <div className="border-t border-gray-300 px-6 py-3 bg-gray-50">
            <p className="text-sm text-gray-600">
              Total Matches: {session.matches.length}
            </p>
          </div>
        </div>
      ))}

      {/* Print styles */}
      <style jsx="true">{`
        @media print {
          .page-break-before {
            page-break-before: always;
          }

          /* Hide everything except the report */
          body > *:not(.print-container) {
            display: none !important;
          }

          /* Ensure tables don't break across pages */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          /* Remove borders/shadows for cleaner print */
          .rounded-lg {
            border-radius: 0;
          }

          .shadow-sm {
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
