// TeamsView Component - Teams and tournaments overview

const TeamsView = ({
    teams,
    bookings,
    onBookingClick,
    courts
}) => {
    const [activeTab, setActiveTab] = React.useState('teams');

    // Get today and 90 days from now
    const today = DateHelpers.getToday();
    const futureDate = DateHelpers.addDays(today, 90);

    // Get team bookings
    const getTeamBookings = (teamId) => {
        return bookings.filter(b =>
            b.entity_id === teamId &&
            b.booking_type.startsWith('team_') &&
            b.status !== 'cancelled' &&
            b.date >= today
        ).sort((a, b) => a.date.localeCompare(b.date));
    };

    // Get tournament bookings
    const tournamentBookings = React.useMemo(() => {
        return bookings.filter(b =>
            b.booking_type === 'tournament' &&
            b.status !== 'cancelled' &&
            b.date >= today &&
            b.date <= futureDate
        ).sort((a, b) => a.date.localeCompare(b.date));
    }, [bookings, today, futureDate]);

    // Group tournaments by name/event
    const tournamentsByName = React.useMemo(() => {
        const grouped = {};
        tournamentBookings.forEach(b => {
            const name = b.customer_name || 'Tournament';
            if (!grouped[name]) {
                grouped[name] = {
                    name,
                    bookings: [],
                    startDate: b.date,
                    endDate: b.date,
                    courts: new Set()
                };
            }
            grouped[name].bookings.push(b);
            if (b.date < grouped[name].startDate) grouped[name].startDate = b.date;
            if (b.date > grouped[name].endDate) grouped[name].endDate = b.date;
            grouped[name].courts.add(b.court);
        });
        return Object.values(grouped).sort((a, b) => a.startDate.localeCompare(b.startDate));
    }, [tournamentBookings]);

    // Get court name
    const getCourtName = (courtNumber) => {
        const court = courts.find(c => c.court_number === String(courtNumber));
        return court ? court.court_name : `Court ${courtNumber}`;
    };

    // Get team type badge color
    const getTeamTypeBadge = (type) => {
        const badges = {
            usta: { bg: 'bg-green-100', text: 'text-green-800', label: 'USTA' },
            high_school: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High School' },
            college: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'College' },
            other: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Other' }
        };
        return badges[type] || badges.other;
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('teams')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'teams'
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Active Teams
                        </button>
                        <button
                            onClick={() => setActiveTab('tournaments')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'tournaments'
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Upcoming Tournaments
                        </button>
                    </nav>
                </div>
            </div>

            {/* Teams Tab */}
            {activeTab === 'teams' && (
                <div className="space-y-4">
                    {teams.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                            No active teams found.
                        </div>
                    ) : (
                        teams.map(team => {
                            const teamBookings = getTeamBookings(team.team_id);
                            const nextBooking = teamBookings[0];
                            const badge = getTeamTypeBadge(team.team_type);

                            return (
                                <div key={team.team_id} className="bg-white rounded-lg shadow overflow-hidden">
                                    <div className="p-4 flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {team.contact_name && `${team.contact_name} • `}
                                                {team.phone && `${team.phone} • `}
                                                {team.email}
                                            </p>
                                            {team.season_start && team.season_end && (
                                                <p className="text-sm text-gray-500">
                                                    Season: {DateHelpers.formatDisplayDate(team.season_start)} - {DateHelpers.formatDisplayDate(team.season_end)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                {teamBookings.length} upcoming
                                            </div>
                                        </div>
                                    </div>

                                    {nextBooking && (
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                            <p className="text-xs text-gray-500 uppercase font-medium">Next Booking</p>
                                            <button
                                                onClick={() => onBookingClick(nextBooking)}
                                                className="mt-1 text-sm text-green-600 hover:text-green-800"
                                            >
                                                {DateHelpers.formatDisplayDate(nextBooking.date)} at {DateHelpers.formatTime(nextBooking.time_start)} - {getCourtName(nextBooking.court)}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Tournaments Tab */}
            {activeTab === 'tournaments' && (
                <div className="space-y-4">
                    {tournamentsByName.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                            No upcoming tournaments in the next 90 days.
                        </div>
                    ) : (
                        tournamentsByName.map((tournament, idx) => (
                            <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="p-4 bg-red-50 border-b border-red-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
                                            <p className="text-sm text-red-600">
                                                {tournament.startDate === tournament.endDate
                                                    ? DateHelpers.formatDisplayDate(tournament.startDate)
                                                    : `${DateHelpers.formatDisplayDate(tournament.startDate)} - ${DateHelpers.formatDisplayDate(tournament.endDate)}`
                                                }
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                {tournament.courts.size} court{tournament.courts.size !== 1 ? 's' : ''}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {tournament.bookings.length} slot{tournament.bookings.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Courts Blocked</p>
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(tournament.courts).sort((a, b) => parseInt(a) - parseInt(b)).map(court => (
                                            <span key={court} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                                                {getCourtName(court)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// Make available globally
window.TeamsView = TeamsView;
