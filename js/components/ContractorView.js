// ContractorView Component - Contractor schedule and summary

const ContractorView = ({
    contractors,
    getBookingsForContractor,
    onBookingClick,
    courts
}) => {
    const [selectedContractor, setSelectedContractor] = React.useState('');
    const [dateRange, setDateRange] = React.useState({
        start: DateHelpers.getWeekStart(DateHelpers.getToday()),
        end: DateHelpers.getWeekEnd(DateHelpers.getToday())
    });

    // Get bookings for selected contractor
    const contractorBookings = React.useMemo(() => {
        if (!selectedContractor) return [];
        return getBookingsForContractor(selectedContractor)
            .filter(b => b.date >= dateRange.start && b.date <= dateRange.end)
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.time_start.localeCompare(b.time_start);
            });
    }, [selectedContractor, dateRange, getBookingsForContractor]);

    // Calculate invoice summary
    const invoiceSummary = React.useMemo(() => {
        if (!contractorBookings.length) return null;
        return Rates.estimateContractorInvoice(contractorBookings);
    }, [contractorBookings]);

    // Get selected contractor data
    const contractorData = contractors.find(c => c.contractor_id === selectedContractor);

    // Get court name
    const getCourtName = (courtNumber) => {
        const court = courts.find(c => c.court_number === String(courtNumber));
        return court ? court.court_name : `Court ${courtNumber}`;
    };

    // Group bookings by date
    const bookingsByDate = React.useMemo(() => {
        const grouped = {};
        contractorBookings.forEach(b => {
            if (!grouped[b.date]) grouped[b.date] = [];
            grouped[b.date].push(b);
        });
        return grouped;
    }, [contractorBookings]);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
                        <select
                            value={selectedContractor}
                            onChange={(e) => setSelectedContractor(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="">-- Select Contractor --</option>
                            {contractors.map(c => (
                                <option key={c.contractor_id} value={c.contractor_id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                </div>
            </div>

            {/* Contractor Info & Summary */}
            {selectedContractor && contractorData && (
                <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">{contractorData.name}</h2>
                        <p className="text-sm text-gray-500">
                            {contractorData.contact_name && `${contractorData.contact_name} • `}
                            {contractorData.phone && `${contractorData.phone} • `}
                            {contractorData.email}
                        </p>
                    </div>

                    {invoiceSummary && (
                        <div className="p-4 bg-purple-50 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-purple-600">Total Bookings</p>
                                <p className="text-2xl font-bold text-purple-900">{contractorBookings.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-purple-600">Total Hours</p>
                                <p className="text-2xl font-bold text-purple-900">{invoiceSummary.totalHours.toFixed(1)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-purple-600">Rate Tier</p>
                                <p className="text-2xl font-bold text-purple-900">{invoiceSummary.tier}</p>
                            </div>
                            <div>
                                <p className="text-sm text-purple-600">Est. Invoice</p>
                                <p className="text-2xl font-bold text-purple-900">{Rates.formatCurrency(invoiceSummary.total)}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bookings List */}
            {selectedContractor && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">Bookings</h3>
                    </div>

                    {contractorBookings.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No bookings found for this date range.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {Object.entries(bookingsByDate).map(([date, bookings]) => (
                                <div key={date}>
                                    <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                                        {DateHelpers.formatDisplayDate(date)}
                                    </div>
                                    {bookings.map(booking => (
                                        <button
                                            key={booking.booking_id}
                                            onClick={() => onBookingClick(booking)}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {DateHelpers.formatTime(booking.time_start)} - {DateHelpers.formatTime(booking.time_end)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {getCourtName(booking.court)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {DateHelpers.calculateDuration(booking.time_start, booking.time_end)} hrs
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    ID: {booking.booking_id}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!selectedContractor && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500">Select a contractor to view their schedule</p>
                </div>
            )}
        </div>
    );
};

// Make available globally
window.ContractorView = ContractorView;
