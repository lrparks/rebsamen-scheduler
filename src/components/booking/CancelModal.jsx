import { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Select from '../common/Select.jsx';
import Input from '../common/Input.jsx';
import { Textarea } from '../common/Input.jsx';
import { cancelBooking, markNoShow } from '../../utils/api.js';
import { suggestRefund, getCancelReasonLabel, getRefundStatusLabel } from '../../utils/cancellationPolicy.js';
import { CANCEL_REASONS, REFUND_STATUS } from '../../config.js';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useToast } from '../common/Toast.jsx';

/**
 * Modal for cancelling a booking with reason and refund handling
 */
export default function CancelModal({ isOpen, onClose, booking, isNoShow = false }) {
  const [reason, setReason] = useState(isNoShow ? CANCEL_REASONS.NO_SHOW : '');
  const [refundStatus, setRefundStatus] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const { initials } = useStaffContext();
  const { updateBookingLocal, refreshBookings } = useBookingsContext();
  const toast = useToast();

  // Calculate refund suggestion when reason changes
  useEffect(() => {
    if (reason && booking) {
      const result = suggestRefund(reason, booking.date, booking.time_start);
      setSuggestion(result);
      setRefundStatus(result.suggestedRefund);

      // Set refund amount based on suggestion
      if (result.suggestedRefund === REFUND_STATUS.FULL) {
        setRefundAmount(booking.payment_amount || '0');
      } else if (result.suggestedRefund === REFUND_STATUS.NONE) {
        setRefundAmount('0');
      }
    }
  }, [reason, booking]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason(isNoShow ? CANCEL_REASONS.NO_SHOW : '');
      setRefundStatus('');
      setRefundAmount('');
      setRefundNote('');
      setSuggestion(null);
    }
  }, [isOpen, isNoShow]);

  const reasonOptions = Object.values(CANCEL_REASONS).map(r => ({
    value: r,
    label: getCancelReasonLabel(r),
  }));

  const refundOptions = Object.values(REFUND_STATUS).map(s => ({
    value: s,
    label: getRefundStatusLabel(s),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason) {
      toast.error('Please select a cancellation reason');
      return;
    }

    if (!initials) {
      toast.error('Please select a staff member first');
      return;
    }

    setLoading(true);
    try {
      const cancelData = {
        reason,
        refund_status: refundStatus || REFUND_STATUS.NONE,
        refund_amount: refundAmount || '0',
        refund_note: refundNote,
        cancelled_by: initials,
      };

      let result;
      if (isNoShow) {
        result = await markNoShow(booking.booking_id, initials);
      } else {
        result = await cancelBooking(booking.booking_id, cancelData);
      }

      if (result.success) {
        // Optimistic update
        updateBookingLocal(booking.booking_id, {
          status: isNoShow ? 'no_show' : 'cancelled',
          cancel_reason: reason,
          refund_status: refundStatus,
          refund_amount: refundAmount,
          refund_note: refundNote,
          cancelled_by: initials,
          cancelled_at: new Date().toISOString(),
        });

        toast.success(isNoShow
          ? `Marked as no-show: ${booking.booking_id}`
          : `Booking cancelled: ${booking.booking_id}`
        );
        onClose();

        // Refresh data
        setTimeout(() => refreshBookings(), 1000);
      } else {
        toast.error(result.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('[CancelModal] Error:', error);
      toast.error('Failed to cancel booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNoShow ? 'Mark as No-Show' : 'Cancel Booking'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Booking Info */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Booking ID:</span>
              <span className="ml-1 font-mono font-bold">{booking.booking_id}</span>
            </div>
            <div>
              <span className="text-gray-500">Customer:</span>
              <span className="ml-1">{booking.customer_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Amount Paid:</span>
              <span className="ml-1">${booking.payment_amount || '0.00'}</span>
            </div>
            <div>
              <span className="text-gray-500">Payment Status:</span>
              <span className="ml-1">{booking.payment_status || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <Select
          label="Cancellation Reason"
          value={reason}
          onChange={setReason}
          options={reasonOptions}
          placeholder="Select reason..."
          required
          disabled={isNoShow}
        />

        {/* Policy Suggestion */}
        {suggestion && (
          <div className={`
            p-3 rounded-lg text-sm
            ${suggestion.suggestedRefund === REFUND_STATUS.FULL
              ? 'bg-green-50 text-green-800 border border-green-200'
              : suggestion.suggestedRefund === REFUND_STATUS.NONE
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }
          `}>
            <strong>Policy:</strong> {suggestion.explanation}
          </div>
        )}

        {/* Refund Status */}
        <Select
          label="Refund Status"
          value={refundStatus}
          onChange={setRefundStatus}
          options={refundOptions}
          placeholder="Select refund status..."
        />

        {/* Refund Amount - show if partial */}
        {refundStatus === REFUND_STATUS.PARTIAL && (
          <Input
            label="Refund Amount ($)"
            type="number"
            value={refundAmount}
            onChange={setRefundAmount}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        )}

        {/* Refund Note */}
        <Textarea
          label="Notes"
          value={refundNote}
          onChange={setRefundNote}
          placeholder="Additional notes about the cancellation or refund..."
          rows={2}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={loading}
          >
            {isNoShow ? 'Mark No-Show' : 'Cancel Booking'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
