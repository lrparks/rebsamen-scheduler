import { CONFIG } from '../../config.js';

/**
 * Court column headers
 */
export default function CourtHeader({ courts }) {
  // Generate court list if not provided
  const courtList = courts || Array.from({ length: CONFIG.TOTAL_COURTS }, (_, i) => ({
    court_number: i + 1,
    court_name: i + 1 === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `Court ${i + 1}`,
    status: 'open',
  }));

  return (
    <div className="flex sticky top-0 z-30 bg-white">
      {/* Empty cell for time column alignment */}
      <div className="w-16 flex-shrink-0" />

      {/* Court headers */}
      {courtList.map((court) => (
        <div
          key={court.court_number}
          className={`
            flex-1 min-w-20 h-12 border-b border-l border-gray-200
            flex flex-col items-center justify-center
            ${court.status === 'closed' || court.status === 'maintenance'
              ? 'bg-gray-100'
              : 'bg-white'
            }
          `}
        >
          <span className="text-xs font-semibold text-gray-700">
            {parseInt(court.court_number, 10) === CONFIG.STADIUM_COURT_NUMBER
              ? 'Stadium'
              : `Court ${court.court_number}`
            }
          </span>
          {court.status && court.status !== 'open' && (
            <span className="text-[10px] text-gray-400 uppercase">
              {court.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
