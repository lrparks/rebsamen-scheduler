// CancelModal Component - Handle booking cancellation with refund policy

const CancelModal = ({
    isOpen,
    onClose,
    booking,
    onConfirm
}) => {
    const [reason, setReason] = React.useState('customer');
    const [refundStatus, setRefundStatus] = React.useState('none');
    const [refundAmount, setRefundAmount] = React.useState(0);
    const [refundNote, setRefundNote] = React.useState('');
    const [isOverride, setIsOverride] = React.useState(false);

    // Calculate suggested refund when modal opens or reason changes
    React.useEffect(() => {
        if (isOpen && booking) {
            const suggestion = Rates.calculateRefund(booking, reason);
            setRefundStatus(suggestion.status);
            setRefundAmount(suggestion.amount);
            setRefundNote(suggestion.description);
            setIsOverride(false);
        }
    }, [isOpen, booking, reason]);

    const handleReasonChange = (e) => {
        setReason(e.target.value);
        setIsOverride(false);
    };

    const handleRefundOverride = () => {
        setIsOverride(true);
    };

    const handleConfirm = () => {
        onConfirm({
            reason,
            refundInfo: {
                status: refundStatus,
                amount: parseFloat(refundAmount) || 0,
                note: refundNote
            }
        });
    };

    if (!isOpen || !booking) return null;

    const reasons = [
        { value: 'customer', label: 'Customer Request' },
        { value: 'weather', label: 'Weather' },
        { value: 'facility', label: 'Facility Issue' },
        { value: 'other', label: 'Other' }
    ];

    const refundStatuses = [
        { value: 'none', label: 'No Refund' },
        { value: 'partial', label: 'Partial Refund' },
        { value: 'full', label: 'Full Refund' },
        { value: 'credit', label: 'Credit' }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
                    <p className="text-sm text-gray-500">ID: {booking.booking_id}</p>
                </div>

                {/* Booking Summary */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="text-sm">
                        <p><strong>{booking.customer_name || 'Customer'}</strong></p>
                        <p>{DateHelpers.formatDisplayDate(booking.date)}</p>
                        <p>{DateHelpers.formatTime(booking.time_start)} - {DateHelpers.formatTime(booking.time_end)}</p>
                        <p>Court {booking.court}</p>
                        {booking.payment_amount && (
                            <p className="mt-2">
                                Payment: <strong>{Rates.formatCurrency(parseFloat(booking.payment_amount))}</strong>
                                {booking.payment_status && ` (${booking.payment_status})`}
                            </p>
                        )}
                    </div>
                </div>

                {/* Cancellation Form */}
                <div className="px-6 py-4 space-y-4">
                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cancellation Reason
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {reasons.map(r => (
                                <label
                                    key={r.value}
                                    className={`flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                                        reason === r.value
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r.value}
                                        checked={reason === r.value}
                                        onChange={handleReasonChange}
                                        className="sr-only"
                                    />
                                    <span className="text-sm">{r.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Policy-based Suggestion */}
                    {!isOverride && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                                <strong>Policy Suggestion:</strong> {refundNote}
                            </p>
                            <button
                                type="button"
                                onClick={handleRefundOverride}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                                Override refund
                            </button>
                        </div>
                    )}

                    {/* Refund Override */}
                    {isOverride && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Refund Status
                                </label>
                                <select
                                    value={refundStatus}
                                    onChange={(e) => setRefundStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                >
                                    {refundStatuses.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            {(refundStatus === 'partial' || refundStatus === 'full') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Refund Amount
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={refundAmount}
                                            onChange={(e) => setRefundAmount(e.target.value)}
                                            step="0.01"
                                            min="0"
                                            max={booking.payment_amount || 999}
                                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Refund Note
                                </label>
                                <textarea
                                    value={refundNote}
                                    onChange={(e) => setRefundNote(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="Reason for refund override..."
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                        Go Back
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Confirm Cancellation
                    </button>
                </div>
            </div>
        </div>
    );
};

// Make available globally
window.CancelModal = CancelModal;
