import { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Select from '../common/Select.jsx';
import { useStaff } from '../../hooks/useStaff.js';
import { useStaffContext } from '../../context/StaffContext.jsx';

/**
 * Staff selector modal for initial login and switching staff
 */
export default function StaffSelector({ isOpen, onClose, isRequired = false }) {
  const { staffOptions, loading: staffLoading } = useStaff();
  const { currentStaff, selectStaff, clearStaff } = useStaffContext();
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [error, setError] = useState('');

  // Pre-select current staff when modal opens
  useEffect(() => {
    if (isOpen && currentStaff) {
      setSelectedStaffId(currentStaff.staff_id || '');
    } else if (isOpen) {
      setSelectedStaffId('');
    }
    setError('');
  }, [isOpen, currentStaff]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedStaffId) {
      setError('Please select a staff member');
      return;
    }

    const staffMember = staffOptions.find(s => s.value === selectedStaffId);
    if (staffMember) {
      selectStaff({
        staff_id: staffMember.value,
        initials: staffMember.initials,
        name: staffMember.name,
        role: staffMember.role,
      });
      onClose();
    }
  };

  const handleClear = () => {
    clearStaff();
    setSelectedStaffId('');
    if (!isRequired) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isRequired ? undefined : onClose}
      title={isRequired ? 'Select Your Name to Continue' : 'Change Staff'}
      showCloseButton={!isRequired}
      closeOnBackdrop={!isRequired}
      closeOnEscape={!isRequired}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          {isRequired
            ? 'Please select your name from the list below. This is required to track bookings and actions.'
            : 'Select a different staff member or clear the current selection.'}
        </p>

        <Select
          label="Staff Member"
          value={selectedStaffId}
          onChange={setSelectedStaffId}
          options={staffOptions}
          placeholder={staffLoading ? 'Loading...' : 'Select staff member...'}
          disabled={staffLoading}
          required
          error={error}
        />

        {currentStaff && (
          <div className="text-sm text-gray-500">
            Currently logged in as: <strong>{currentStaff.name}</strong> ({currentStaff.initials})
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          {currentStaff && !isRequired && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
            >
              Clear Selection
            </Button>
          )}
          {!isRequired && (
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={!selectedStaffId}>
            {isRequired ? 'Continue' : 'Switch Staff'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
