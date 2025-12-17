import { useState, useEffect } from 'react';
import { StaffProvider, useStaffContext } from './context/StaffContext.jsx';
import { BookingsProvider } from './context/BookingsContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import Header from './components/layout/Header.jsx';
import Navigation, { ColorLegend } from './components/layout/Navigation.jsx';
import StaffSelector from './components/layout/StaffSelector.jsx';
import DailyGrid from './components/grid/DailyGrid.jsx';
import WeekView from './components/grid/WeekView.jsx';
import ContractorView from './components/views/ContractorView.jsx';
import TeamsView from './components/views/TeamsView.jsx';
import SearchView from './components/views/SearchView.jsx';
import MaintenanceView from './components/views/MaintenanceView.jsx';
import BookingModal from './components/booking/BookingModal.jsx';
import { formatDateISO } from './utils/dateHelpers.js';
import { useBookings } from './hooks/useBookings.js';

/**
 * Main App Component
 */
function AppContent() {
  const [currentView, setCurrentView] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(formatDateISO(new Date()));
  const [showStaffSelector, setShowStaffSelector] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [newBookingData, setNewBookingData] = useState(null);

  const { currentStaff, isLoaded } = useStaffContext();
  const { refreshBookings } = useBookings();

  // Show staff selector on first load if no staff selected
  useEffect(() => {
    if (isLoaded && !currentStaff) {
      setShowStaffSelector(true);
    }
  }, [isLoaded, currentStaff]);

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setNewBookingData(null);
    setBookingModalOpen(true);
  };

  const handleEmptyCellClick = (data) => {
    setSelectedBooking(null);
    setNewBookingData(data);
    setBookingModalOpen(true);
  };

  const handleCloseBookingModal = () => {
    setBookingModalOpen(false);
    setSelectedBooking(null);
    setNewBookingData(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'daily':
        return (
          <>
            <ColorLegend />
            <div className="p-4">
              <DailyGrid
                selectedDate={selectedDate}
                onBookingClick={handleBookingClick}
                onEmptyCellClick={handleEmptyCellClick}
              />
            </div>
          </>
        );

      case 'weekly':
        return (
          <>
            <ColorLegend />
            <div className="p-4">
              <WeekView
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onBookingClick={handleBookingClick}
                onEmptyCellClick={handleEmptyCellClick}
              />
            </div>
          </>
        );

      case 'contractors':
        return <ContractorView onBookingClick={handleBookingClick} />;

      case 'teams':
        return <TeamsView onBookingClick={handleBookingClick} />;

      case 'search':
        return <SearchView onBookingClick={handleBookingClick} />;

      case 'maintenance':
        return <MaintenanceView />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <Header
        onStaffClick={() => setShowStaffSelector(true)}
        onRefresh={refreshBookings}
      />

      {/* Navigation */}
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderView()}
      </main>

      {/* Staff Selector Modal */}
      <StaffSelector
        isOpen={showStaffSelector}
        onClose={() => setShowStaffSelector(false)}
        isRequired={!currentStaff}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={handleCloseBookingModal}
        booking={selectedBooking}
        initialData={newBookingData}
      />
    </div>
  );
}

/**
 * App with Providers
 */
export default function App() {
  return (
    <ToastProvider>
      <StaffProvider>
        <BookingsProvider>
          <AppContent />
        </BookingsProvider>
      </StaffProvider>
    </ToastProvider>
  );
}
