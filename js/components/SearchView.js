// SearchView Component - Search and filter bookings

const SearchView = ({
    bookings,
    courts,
    onBookingClick,
    getEntityName
}) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filters, setFilters] = React.useState({
        dateStart: '',
        dateEnd: '',
        court: '',
        bookingType: '',
        status: ''
    });
    const [sortField, setSortField] = React.useState('date');
    const [sortDir, setSortDir] = React.useState('desc');

    // Filter and search bookings
    const filteredBookings = React.useMemo(() => {
        let results = [...bookings];

        // Text search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(b =>
                b.booking_id?.toLowerCase().includes(q) ||
                b.customer_name?.toLowerCase().includes(q) ||
                b.customer_phone?.includes(q) ||
                b.notes?.toLowerCase().includes(q)
            );
        }

        // Date range filter
        if (filters.dateStart) {
            results = results.filter(b => b.date >= filters.dateStart);
        }
        if (filters.dateEnd) {
            results = results.filter(b => b.date <= filters.dateEnd);
        }

        // Court filter
        if (filters.court) {
            results = results.filter(b => b.court === filters.court);
        }

        // Booking type filter
        if (filters.bookingType) {
            results = results.filter(b => b.booking_type === filters.bookingType);
        }

        // Status filter
        if (filters.status) {
            results = results.filter(b => b.status === filters.status);
        }

        // Sort
        results.sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
                case 'date':
                    aVal = a.date + a.time_start;
                    bVal = b.date + b.time_start;
                    break;
                case 'court':
                    aVal = parseInt(a.court) || 0;
                    bVal = parseInt(b.court) || 0;
                    break;
                case 'customer':
                    aVal = a.customer_name?.toLowerCase() || '';
                    bVal = b.customer_name?.toLowerCase() || '';
                    break;
                case 'type':
                    aVal = a.booking_type || '';
                    bVal = b.booking_type || '';
                    break;
                default:
                    aVal = a[sortField] || '';
                    bVal = b[sortField] || '';
            }

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return results;
    }, [bookings, searchQuery, filters, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilters({
            dateStart: '',
            dateEnd: '',
            court: '',
            bookingType: '',
            status: ''
        });
    };

    const getCourtName = (courtNumber) => {
        const court = courts.find(c => c.court_number === String(courtNumber));
        return court ? court.court_name : `Court ${courtNumber}`;
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { bg: 'bg-green-100', text: 'text-green-800' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
            no_show: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
            completed: { bg: 'bg-gray-100', text: 'text-gray-800' }
        };
        return badges[status] || badges.active;
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return (
            <svg className="w-4 h-4 ml-1 inline" fill="currentColor" viewBox="0 0 20 20">
                {sortDir === 'asc' ? (
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                ) : (
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                )}
            </svg>
        );
    };

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                {/* Search bar */}
                <div className="mb-4">
                    <div className="relative">
                        <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by booking ID, name, phone, or notes..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">From Date</label>
                        <input
                            type="date"
                            value={filters.dateStart}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">To Date</label>
                        <input
                            type="date"
                            value={filters.dateEnd}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Court</label>
                        <select
                            value={filters.court}
                            onChange={(e) => setFilters(prev => ({ ...prev, court: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="">All Courts</option>
                            {courts.map(court => (
                                <option key={court.court_number} value={court.court_number}>
                                    {court.court_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                            value={filters.bookingType}
                            onChange={(e) => setFilters(prev => ({ ...prev, bookingType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="">All Types</option>
                            <option value="open">Open Play</option>
                            <option value="contractor">Contractor</option>
                            <option value="team_usta">Team - USTA</option>
                            <option value="team_hs">Team - HS</option>
                            <option value="tournament">Tournament</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="hold">Hold</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>

                {/* Clear filters */}
                <div className="mt-3 flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                        {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
                    </p>
                    <button
                        onClick={clearFilters}
                        className="text-sm text-green-600 hover:text-green-800"
                    >
                        Clear all filters
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th
                                    onClick={() => handleSort('date')}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                >
                                    Date/Time <SortIcon field="date" />
                                </th>
                                <th
                                    onClick={() => handleSort('court')}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                >
                                    Court <SortIcon field="court" />
                                </th>
                                <th
                                    onClick={() => handleSort('customer')}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                >
                                    Customer <SortIcon field="customer" />
                                </th>
                                <th
                                    onClick={() => handleSort('type')}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                                >
                                    Type <SortIcon field="type" />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    ID
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No bookings found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.slice(0, 100).map(booking => {
                                    const statusBadge = getStatusBadge(booking.status);
                                    return (
                                        <tr
                                            key={booking.booking_id}
                                            onClick={() => onBookingClick(booking)}
                                            className="hover:bg-gray-50 cursor-pointer"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {DateHelpers.formatDisplayDate(booking.date)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {DateHelpers.formatTime(booking.time_start)} - {DateHelpers.formatTime(booking.time_end)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {getCourtName(booking.court)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {booking.customer_name || getEntityName(booking.booking_type, booking.entity_id) || '-'}
                                                </div>
                                                {booking.customer_phone && (
                                                    <div className="text-sm text-gray-500">{booking.customer_phone}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {booking.booking_type?.replace('_', ' ')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                                    {booking.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                                                {booking.booking_id}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredBookings.length > 100 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 text-center">
                        Showing 100 of {filteredBookings.length} results. Refine your search to see more specific results.
                    </div>
                )}
            </div>
        </div>
    );
};

// Make available globally
window.SearchView = SearchView;
