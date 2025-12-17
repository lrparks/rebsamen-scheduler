import { useMemo } from 'react';
import { CONFIG } from '../../config.js';
import { getTimeSlots } from '../../utils/dateHelpers.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import TimeColumn, { TIME_SLOT_HEIGHT } from './TimeColumn.jsx';
import CourtHeader from './CourtHeader.jsx';
import CurrentTimeLine from './CurrentTimeLine.jsx';
import BookingCell, { EmptyCell } from './BookingCell.jsx';

/**
 * Main daily grid view showing all 17 courts
 */
export default function DailyGrid({
  selectedDate,
  onBookingClick,
  onEmptyCellClick,
}) {
  const { getBookingsForDate, loading, error } = useBookingsContext();
  const { courts } = useCourts();

  const timeSlots = getTimeSlots();

  // Get bookings for selected date
  const bookings = useMemo(() => {
    return getBookingsForDate(selectedDate);
  }, [getBookingsForDate, selectedDate]);

  // Generate court list
  const courtList = useMemo(() => {
    if (courts.length > 0) return courts;
    return Array.from({ length: CONFIG.TOTAL_COURTS }, (_, i) => ({
      court_number: i + 1,
      court_name: i + 1 === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `Court ${i + 1}`,
      status: 'open',
    }));
  }, [courts]);

  // Build booking map for quick lookup
  // Key: court-timeStart
  const bookingMap = useMemo(() => {
    const map = new Map();

    bookings.forEach((booking) => {
      if (booking.status === 'cancelled') return; // Skip cancelled for grid display

      const court = parseInt(booking.court, 10);
      const startTime = booking.time_start;
      const endTime = booking.time_end;

      // Calculate slots spanned
      const startIndex = timeSlots.indexOf(startTime);
      const endIndex = timeSlots.indexOf(endTime);
      const slotsSpanned = endIndex > startIndex ? endIndex - startIndex : 1;

      // Store booking at start time with metadata
      const key = `${court}-${startTime}`;
      map.set(key, {
        booking,
        isFirstSlot: true,
        slotsSpanned,
      });

      // Mark subsequent slots as occupied
      for (let i = 1; i < slotsSpanned; i++) {
        const slotTime = timeSlots[startIndex + i];
        if (slotTime) {
          const occupiedKey = `${court}-${slotTime}`;
          map.set(occupiedKey, {
            booking,
            isFirstSlot: false,
            slotsSpanned: 0,
          });
        }
      }
    });

    return map;
  }, [bookings, timeSlots]);

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading bookings: {error}</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-auto bg-white border border-gray-200 rounded-lg">
      {/* Grid Container */}
      <div className="relative min-w-max">
        {/* Header Row */}
        <CourtHeader courts={courtList} />

        {/* Current Time Line */}
        <CurrentTimeLine selectedDate={selectedDate} headerHeight={48} />

        {/* Grid Body */}
        <div className="flex">
          {/* Time Column */}
          <TimeColumn />

          {/* Court Columns */}
          <div className="flex flex-1">
            {courtList.map((court) => (
              <div
                key={court.court_number}
                className="flex-1 min-w-20 border-l border-gray-200"
              >
                {timeSlots.map((time) => {
                  const courtNum = parseInt(court.court_number, 10);
                  const key = `${courtNum}-${time}`;
                  const cellData = bookingMap.get(key);

                  return (
                    <div
                      key={time}
                      className="relative h-16 border-b border-gray-100"
                    >
                      {cellData ? (
                        <BookingCell
                          booking={cellData.booking}
                          onClick={onBookingClick}
                          isFirstSlot={cellData.isFirstSlot}
                          slotsSpanned={cellData.slotsSpanned}
                        />
                      ) : (
                        <EmptyCell
                          date={selectedDate}
                          court={courtNum}
                          time={time}
                          onClick={onEmptyCellClick}
                        />
                      )}
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
}
