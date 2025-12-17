import { useStaffContext } from '../../context/StaffContext.jsx';
import { useBookingsContext } from '../../context/BookingsContext.jsx';

/**
 * Application header with staff info and actions
 */
export default function Header({ onStaffClick, onRefresh, appMode, onSwitchMode }) {
  const { currentStaff, initials } = useStaffContext();
  const { loading, lastRefresh } = useBookingsContext();

  const formatLastRefresh = () => {
    if (!lastRefresh) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - lastRefresh) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff === 1) return '1 minute ago';
    return `${diff} minutes ago`;
  };

  return (
    <header className="bg-green-700 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
            <div>
              <h1 className="text-lg font-bold leading-tight">Rebsamen Tennis Center</h1>
              <p className="text-xs text-green-200">
                {appMode === 'maintenance' ? 'Maintenance Dashboard' : 'Court Scheduler'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Refresh Status - only show in full mode */}
          {appMode === 'full' && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                title="Refresh bookings"
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline text-green-200">{formatLastRefresh()}</span>
              </button>
            </div>
          )}

          {/* Mode Switch Button */}
          <button
            onClick={onSwitchMode}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white/10 rounded hover:bg-white/20 transition-colors"
            title="Switch access mode"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="hidden sm:inline">
              {appMode === 'maintenance' ? 'Maintenance Mode' : 'Full Access'}
            </span>
          </button>

          {/* Staff Selector */}
          <button
            onClick={onStaffClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-sm font-medium">
              {currentStaff ? `Staff: ${initials}` : 'Select Staff'}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
