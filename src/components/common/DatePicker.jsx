import { formatDateISO } from '../../utils/dateHelpers.js';

/**
 * Date picker component
 */
export default function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  error = '',
  className = '',
  id,
  name,
}) {
  const inputId = id || name || `date-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="date"
        id={inputId}
        name={name}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        className={`
          block w-full px-3 py-2 text-sm
          border rounded-lg shadow-sm
          bg-white
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

/**
 * Date range picker component
 */
export function DateRangePicker({
  label,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          disabled={disabled}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <span className="text-gray-500">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          min={startDate}
          disabled={disabled}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
    </div>
  );
}
