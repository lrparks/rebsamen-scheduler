/**
 * Reusable styled dropdown component
 */
export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  required = false,
  error = '',
  className = '',
  id,
  name,
}) {
  const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

/**
 * Multi-select component for selecting multiple courts
 */
export function MultiSelect({
  label,
  value = [],
  onChange,
  options = [],
  disabled = false,
  required = false,
  error = '',
  className = '',
}) {
  const toggleOption = (optionValue) => {
    const numValue = typeof optionValue === 'string' ? parseInt(optionValue, 10) : optionValue;
    if (value.includes(numValue)) {
      onChange(value.filter(v => v !== numValue));
    } else {
      onChange([...value, numValue].sort((a, b) => a - b));
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={`
        border rounded-lg p-2 max-h-48 overflow-y-auto
        ${error ? 'border-red-500' : 'border-gray-300'}
        ${disabled ? 'bg-gray-100' : 'bg-white'}
      `}>
        <div className="grid grid-cols-4 gap-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={`
                flex items-center gap-2 p-2 rounded cursor-pointer
                hover:bg-gray-50
                ${value.includes(option.value) ? 'bg-primary/10 text-primary' : ''}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                disabled={disabled}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
