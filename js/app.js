// Main Application - Rebsamen Tennis Center Court Scheduler

const App = () => {
    // State management
    const [currentView, setCurrentView] = React.useState('daily');
    const [selectedDate, setSelectedDate] = React.useState(DateHelpers.getToday());
    const [selectedCourt, setSelectedCourt] = React.useState('1');
    const [showStaffSelector, setShowStaffSelector] = React.useState(false);
    const [showBookingModal, setShowBookingModal] = React.useState(false);
    const [showCancelModal, setShowCancelModal] = React.useState(false);
    const [selectedBooking, setSelectedBooking] = React.useState(null);
    const [modalDate, setModalDate] = React.useState(null);
    const [modalCourt, setModalCourt] = React.useState(null);
    const [modalTime, setModalTime] = React.useState(null);
    const [maintenanceLogs, setMaintenanceLogs] = React.useState([]);

    // Custom hooks
    const {
        staff,
        currentStaff,
        loading: staffLoading,
        selectStaff,
        getStaffInitials
    } = useStaff();

    const {
        courts,
        loading: courtsLoading,
        getCourtName
    } = useCourts();

    const {
        contractors,
        teams,
        loading: configLoading,
        getEntityName
    } = useConfig();

    const {
        bookings,
        loading: bookingsLoading,
        lastUpdated,
        getBookingsForDate,
        getBookingsForDateRange,
        getBookingsForContractor,
        isSlotAvailable,
        createBooking,
        updateBooking,
        checkInBooking,
        cancelBooking,
        markNoShow,
        refresh: refreshBookings
    } = useBookings();

    // Loading state
    const isLoading = staffLoading || courtsLoading || configLoading || bookingsLoading;

    // Show staff selector if no staff selected
    React.useEffect(() => {
        if (!staffLoading && !currentStaff) {
            setShowStaffSelector(true);
        }
    }, [staffLoading, currentStaff]);

    // Load maintenance logs
    React.useEffect(() => {
        const loadMaintenanceLogs = async () => {
            try {
                const logs = await SheetsApi.fetchData('maintenanceLog');
                setMaintenanceLogs(logs);
            } catch (err) {
                console.error('Error loading maintenance logs:', err);
            }
        };
        loadMaintenanceLogs();
    }, []);

    // Handle slot click (new booking)
    const handleSlotClick = (court, time, date = null) => {
        setSelectedBooking(null);
        setModalDate(date || selectedDate);
        setModalCourt(String(court));
        setModalTime(time);
        setShowBookingModal(true);
    };

    // Handle booking click (view/edit)
    const handleBookingClick = (booking) => {
        setSelectedBooking(booking);
        setModalDate(booking.date);
        setModalCourt(booking.court);
        setModalTime(booking.time_start);
        setShowBookingModal(true);
    };

    // Handle booking save
    const handleSaveBooking = async (bookingData) => {
        if (selectedBooking) {
            return await updateBooking(selectedBooking.booking_id, bookingData);
        } else {
            return await createBooking(bookingData, currentStaff);
        }
    };

    // Handle check-in
    const handleCheckIn = async (bookingId) => {
        return await checkInBooking(bookingId, currentStaff);
    };

    // Handle cancel button in booking modal
    const handleCancelClick = (booking) => {
        setShowBookingModal(false);
        setShowCancelModal(true);
    };

    // Handle cancel confirmation
    const handleCancelConfirm = async ({ reason, refundInfo }) => {
        const result = await cancelBooking(selectedBooking.booking_id, currentStaff, reason, refundInfo);
        if (result.success) {
            setShowCancelModal(false);
            setSelectedBooking(null);
        }
        return result;
    };

    // Handle no-show
    const handleNoShow = async (bookingId) => {
        return await markNoShow(bookingId, currentStaff);
    };

    // Handle maintenance log
    const handleLogMaintenance = async (logData) => {
        await SheetsApi.logMaintenance(logData);
        // Refresh logs
        const logs = await SheetsApi.fetchData('maintenanceLog');
        setMaintenanceLogs(logs);
    };

    // Handle refresh
    const handleRefresh = () => {
        refreshBookings();
    };

    // Get bookings for current date
    const dateBookings = React.useMemo(() => {
        return getBookingsForDate(selectedDate);
    }, [getBookingsForDate, selectedDate]);

    // Render current view
    const renderView = () => {
        switch (currentView) {
            case 'daily':
                return (
                    <DailyGrid
                        selectedDate={selectedDate}
                        courts={courts}
                        bookings={dateBookings}
                        onSlotClick={handleSlotClick}
                        onBookingClick={handleBookingClick}
                        getEntityName={getEntityName}
                    />
                );

            case 'weekly':
                return (
                    <WeekView
                        selectedDate={selectedDate}
                        selectedCourt={selectedCourt}
                        onCourtChange={setSelectedCourt}
                        courts={courts}
                        getBookingsForDateRange={getBookingsForDateRange}
                        onSlotClick={handleSlotClick}
                        onBookingClick={handleBookingClick}
                        getEntityName={getEntityName}
                    />
                );

            case 'contractors':
                return (
                    <ContractorView
                        contractors={contractors}
                        getBookingsForContractor={getBookingsForContractor}
                        onBookingClick={handleBookingClick}
                        courts={courts}
                    />
                );

            case 'teams':
                return (
                    <TeamsView
                        teams={teams}
                        bookings={bookings}
                        onBookingClick={handleBookingClick}
                        courts={courts}
                    />
                );

            case 'search':
                return (
                    <SearchView
                        bookings={bookings}
                        courts={courts}
                        onBookingClick={handleBookingClick}
                        getEntityName={getEntityName}
                    />
                );

            case 'maintenance':
                return (
                    <MaintenanceView
                        courts={courts}
                        maintenanceLogs={maintenanceLogs}
                        currentStaff={currentStaff}
                        onLogMaintenance={handleLogMaintenance}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navigation */}
            <Navigation
                currentView={currentView}
                onViewChange={setCurrentView}
                currentStaff={currentStaff}
                onStaffClick={() => setShowStaffSelector(true)}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onRefresh={handleRefresh}
                lastUpdated={lastUpdated}
                loading={bookingsLoading}
            />

            {/* Main content */}
            <main className="max-w-full mx-auto px-4 py-6">
                {isLoading && !dateBookings.length ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <svg className="animate-spin h-8 w-8 text-green-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-gray-500">Loading scheduler...</p>
                        </div>
                    </div>
                ) : (
                    renderView()
                )}
            </main>

            {/* Staff Selector Modal */}
            {showStaffSelector && (
                <StaffSelector
                    staff={staff}
                    currentStaff={currentStaff}
                    onSelect={(staffMember) => {
                        selectStaff(staffMember);
                        setShowStaffSelector(false);
                    }}
                    onClose={() => currentStaff && setShowStaffSelector(false)}
                />
            )}

            {/* Booking Modal */}
            {showBookingModal && (
                <BookingModal
                    isOpen={showBookingModal}
                    onClose={() => {
                        setShowBookingModal(false);
                        setSelectedBooking(null);
                    }}
                    booking={selectedBooking}
                    selectedDate={modalDate}
                    selectedCourt={modalCourt}
                    selectedTime={modalTime}
                    courts={courts}
                    contractors={contractors}
                    teams={teams}
                    currentStaff={currentStaff}
                    onSave={handleSaveBooking}
                    onCheckIn={handleCheckIn}
                    onCancel={handleCancelClick}
                    onNoShow={handleNoShow}
                    isSlotAvailable={isSlotAvailable}
                />
            )}

            {/* Cancel Modal */}
            {showCancelModal && (
                <CancelModal
                    isOpen={showCancelModal}
                    onClose={() => {
                        setShowCancelModal(false);
                        setSelectedBooking(null);
                    }}
                    booking={selectedBooking}
                    onConfirm={handleCancelConfirm}
                />
            )}

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-8">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                        <p>Rebsamen Tennis Center - Little Rock Parks & Recreation</p>
                        <p>
                            {lastUpdated && `Data updated: ${lastUpdated.toLocaleTimeString()}`}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
