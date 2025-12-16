// Navigation Component - Main header and navigation

const Navigation = ({
    currentView,
    onViewChange,
    currentStaff,
    onStaffClick,
    selectedDate,
    onDateChange,
    onRefresh,
    lastUpdated,
    loading
}) => {
    const views = [
        { id: 'daily', label: 'Daily Grid', icon: 'grid' },
        { id: 'weekly', label: 'Week View', icon: 'calendar' },
        { id: 'contractors', label: 'Contractors', icon: 'users' },
        { id: 'teams', label: 'Teams', icon: 'trophy' },
        { id: 'search', label: 'Search', icon: 'search' },
        { id: 'maintenance', label: 'Maintenance', icon: 'wrench' }
    ];

    const handlePrevDay = () => {
        onDateChange(DateHelpers.addDays(selectedDate, -1));
    };

    const handleNextDay = () => {
        onDateChange(DateHelpers.addDays(selectedDate, 1));
    };

    const handleToday = () => {
        onDateChange(DateHelpers.getToday());
    };

    const renderIcon = (icon) => {
        switch (icon) {
            case 'grid':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                );
            case 'calendar':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                );
            case 'users':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
            case 'trophy':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                );
            case 'search':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                );
            case 'wrench':
                return (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <header className="bg-parks-green shadow-lg sticky top-0 z-40">
            {/* Top bar */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo and title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-parks-green" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 2a10 10 0 010 20" fill="none" stroke="currentColor" strokeWidth="2"/>
                                <path d="M2 12h20" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">Rebsamen Tennis Center</h1>
                            <p className="text-green-200 text-xs">Court Scheduler</p>
                        </div>
                    </div>

                    {/* Staff info and actions */}
                    <div className="flex items-center gap-3">
                        {/* Refresh button */}
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="p-2 text-green-200 hover:text-white hover:bg-green-800 rounded-lg transition-colors disabled:opacity-50"
                            title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
                        >
                            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        {/* Staff indicator */}
                        <button
                            onClick={onStaffClick}
                            className="flex items-center gap-2 px-3 py-2 bg-green-800 hover:bg-green-900 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-white font-medium">
                                {currentStaff ? currentStaff.initials : 'Select'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation tabs */}
            <nav className="px-4 pb-2">
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    {views.map(view => (
                        <button
                            key={view.id}
                            onClick={() => onViewChange(view.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                                currentView === view.id
                                    ? 'bg-white text-parks-green'
                                    : 'text-green-200 hover:bg-green-800'
                            }`}
                        >
                            {renderIcon(view.icon)}
                            <span className="hidden sm:inline">{view.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Date navigation (for daily/weekly views) */}
            {(currentView === 'daily' || currentView === 'weekly') && (
                <div className="px-4 py-2 bg-green-800 flex items-center justify-between">
                    <button
                        onClick={handlePrevDay}
                        className="p-2 text-green-200 hover:text-white hover:bg-green-900 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleToday}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                DateHelpers.isToday(selectedDate)
                                    ? 'bg-white text-parks-green font-medium'
                                    : 'text-green-200 hover:bg-green-900'
                            }`}
                        >
                            Today
                        </button>
                        <div className="text-white font-medium">
                            {DateHelpers.formatDisplayDate(selectedDate)}
                        </div>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="bg-green-900 text-white border border-green-700 rounded-lg px-2 py-1 text-sm"
                        />
                    </div>

                    <button
                        onClick={handleNextDay}
                        className="p-2 text-green-200 hover:text-white hover:bg-green-900 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </header>
    );
};

// Make available globally
window.Navigation = Navigation;
