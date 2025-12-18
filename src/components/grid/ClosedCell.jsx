/**
 * Cell component for displaying closed/unavailable time slots
 */
export default function ClosedCell({ reason }) {
  return (
    <div
      className="absolute inset-0.5 rounded bg-gray-200 border border-gray-300 flex items-center justify-center cursor-not-allowed"
      title={reason || 'Closed'}
    >
      <div className="text-center px-1">
        <svg
          className="w-4 h-4 text-gray-500 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <span className="text-xs text-gray-500 font-medium hidden sm:block truncate">
          {reason || 'Closed'}
        </span>
      </div>
    </div>
  );
}
