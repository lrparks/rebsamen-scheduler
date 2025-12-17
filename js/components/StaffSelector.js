// StaffSelector Component - Staff login/selection modal

const StaffSelector = ({ staff, currentStaff, onSelect, onClose }) => {
    const [selectedId, setSelectedId] = React.useState(currentStaff?.staff_id || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        const selected = staff.find(s => s.staff_id === selectedId);
        if (selected) {
            onSelect(selected);
        }
    };

    // If no staff is selected, show as a full-screen modal
    const isRequired = !currentStaff;

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isRequired ? '' : ''}`}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isRequired ? 'Select Staff Member' : 'Change Staff'}
                    </h2>
                    {!isRequired && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {isRequired && (
                    <p className="text-gray-600 mb-4">
                        Please select your name to continue. This will be used to track who created or modified bookings.
                    </p>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Staff Member
                        </label>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            required
                        >
                            <option value="">-- Select your name --</option>
                            {staff.map(s => (
                                <option key={s.staff_id} value={s.staff_id}>
                                    {s.name} ({s.initials}) - {s.role}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3">
                        {!isRequired && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={!selectedId}
                            className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRequired ? 'Continue' : 'Change'}
                        </button>
                    </div>
                </form>

                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                        Rebsamen Tennis Center - Staff Scheduler
                    </p>
                </div>
            </div>
        </div>
    );
};

// Make available globally
window.StaffSelector = StaffSelector;
