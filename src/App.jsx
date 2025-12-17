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
import TournamentsView from './components/views/TournamentsView.jsx';
import SearchView from './components/views/SearchView.jsx';
import MaintenanceView from './components/views/MaintenanceView.jsx';
import BookingModal from './components/booking/BookingModal.jsx';
import Modal from './components/common/Modal.jsx';
import { formatDateISO } from './utils/dateHelpers.js';
import { useBookings } from './hooks/useBookings.js';

const APP_MODE_KEY = 'rebsamen_app_mode';

/**
 * Mode Selection Modal
 */
function ModeSelector({ isOpen, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Welcome to Rebsamen Tennis Center</h2>
          <p className="text-sm text-gray-500 mt-2">Select your access level</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('full')}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
          >
            <div className="font-medium text-gray-900">Full Access</div>
            <div className="text-sm text-gray-500 mt-1">
              Access all features: scheduling, bookings, teams, tournaments, and maintenance
            </div>
          </button>

          <button
            onClick={() => onSelect('maintenance')}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
          >
            <div className="font-medium text-gray-900">Maintenance Only</div>
            <div className="text-sm text-gray-500 mt-1">
              Access maintenance checklist and task logging only
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          You can change this later from the header menu
        </p>
      </div>
    </div>
  );
}

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

  // App mode: 'full' or 'maintenance'
  const [appMode, setAppMode] = useState(() => {
    return localStorage.getItem(APP_MODE_KEY) || null;
  });
  const [showModeSelector, setShowModeSelector] = useState(false);

  const { currentStaff, isLoaded } = useStaffContext();
  const { refreshBookings } = useBookings();

  // Show mode selector on first load if no mode selected
  useEffect(() => {
    if (!appMode) {
      setShowModeSelector(true);
    }
  }, [appMode]);

  // Set view to maintenance when in maintenance mode
  useEffect(() => {
    if (appMode === 'maintenance') {
      setCurrentView('maintenance');
    }
  }, [appMode]);

  // Show staff selector after mode is selected
  useEffect(() => {
    if (isLoaded && !currentStaff && appMode) {
      setShowStaffSelector(true);
    }
  }, [isLoaded, currentStaff, appMode]);

  const handleModeSelect = (mode) => {
    localStorage.setItem(APP_MODE_KEY, mode);
    setAppMode(mode);
    setShowModeSelector(false);
    if (mode === 'maintenance') {
      setCurrentView('maintenance');
    }
  };

  const handleSwitchMode = () => {
    setShowModeSelector(true);
  };

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

      case 'tournaments':
        return <TournamentsView onBookingClick={handleBookingClick} />;

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
      {/* Mode Selector Modal */}
      <ModeSelector isOpen={showModeSelector} onSelect={handleModeSelect} />

      {/* Header */}
      <Header
        onStaffClick={() => setShowStaffSelector(true)}
        onRefresh={refreshBookings}
        appMode={appMode}
        onSwitchMode={handleSwitchMode}
      />

      {/* Navigation - hidden in maintenance mode */}
      {appMode === 'full' && (
        <Navigation
          currentView={currentView}
          onViewChange={setCurrentView}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}

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
