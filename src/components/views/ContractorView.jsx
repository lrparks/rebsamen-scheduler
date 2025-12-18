import { useState, useMemo, useEffect } from 'react';
import { useContractors } from '../../hooks/useContractors.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { createContractor, updateContractor, deleteContractor } from '../../utils/api.js';
import Select from '../common/Select.jsx';
import Input from '../common/Input.jsx';
import { Textarea } from '../common/Input.jsx';
import { DateRangePicker } from '../common/DatePicker.jsx';
import Modal from '../common/Modal.jsx';
import { formatDateISO, formatDateDisplay, formatTimeDisplay, normalizeTime } from '../../utils/dateHelpers.js';
import { useCourts } from '../../hooks/useCourts.js';
import { useToast } from '../common/Toast.jsx';

/**
 * Contractor schedule view - shows all bookings for a specific contractor
 */
export default function ContractorView({ onBookingClick }) {
  const { contractors, contractorOptions, loading: contractorsLoading, refresh: refreshContractors } = useContractors();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();
  const { showToast } = useToast();

  // Default date range: current month
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [selectedContractor, setSelectedContractor] = useState('');
  const [startDate, setStartDate] = useState(formatDateISO(startOfMonth));
  const [endDate, setEndDate] = useState(formatDateISO(endOfMonth));
  const [selectedContractorDetail, setSelectedContractorDetail] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);

  // Filter bookings for selected contractor and date range
  const filteredBookings = useMemo(() => {
    if (!selectedContractor) return [];

    return bookings.filter(b => {
      if (b.booking_type !== 'contractor') return false;
      if (b.entity_id !== selectedContractor) return false;
      if (b.date < startDate || b.date > endDate) return false;
      return true;
    }).sort((a, b) => {
      // Sort by date, then time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, selectedContractor, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalHours = filteredBookings.reduce((sum, b) => {
      const startNorm = normalizeTime(b.time_start);
      const endNorm = normalizeTime(b.time_end);
      if (!startNorm || !endNorm) return sum;
      const [startH, startM] = startNorm.split(':').map(Number);
      const [endH, endM] = endNorm.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      return sum + hours;
    }, 0);

    const courtsUsed = new Set(filteredBookings.map(b => b.court)).size;
    const activeCount = filteredBookings.filter(b => b.status === 'active').length;
    const completedCount = filteredBookings.filter(b => b.status === 'completed').length;

    return { totalHours, courtsUsed, activeCount, completedCount };
  }, [filteredBookings]);

  // Get selected contractor details
  const contractorDetails = contractors.find(c => c.contractor_id === selectedContractor);

  const loading = contractorsLoading || bookingsLoading;

  const handleAddContractor = () => {
    setEditingContractor(null);
    setShowFormModal(true);
  };

  const handleEditContractor = (contractor) => {
    setEditingContractor(contractor);
    setSelectedContractorDetail(null);
    setShowFormModal(true);
  };

  const handleDuplicateContractor = (contractor) => {
    setEditingContractor({
      ...contractor,
      contractor_id: null,
      name: `${contractor.name} (Copy)`,
      business_name: contractor.business_name ? `${contractor.business_name} (Copy)` : '',
    });
    setSelectedContractorDetail(null);
    setShowFormModal(true);
  };

  const handleDeleteContractor = async (contractor) => {
    if (!confirm(`Are you sure you want to delete "${contractor.business_name || contractor.name}"?`)) {
      return;
    }
    try {
      const result = await deleteContractor(contractor.contractor_id);
      if (result.success) {
        showToast('Contractor deleted successfully', 'success');
        setSelectedContractorDetail(null);
        if (selectedContractor === contractor.contractor_id) {
          setSelectedContractor('');
        }
        refreshContractors();
      } else {
        showToast(result.error || 'Failed to delete contractor', 'error');
      }
    } catch (error) {
      showToast('Failed to delete contractor', 'error');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      let result;
      if (editingContractor?.contractor_id) {
        result = await updateContractor(editingContractor.contractor_id, formData);
      } else {
        result = await createContractor(formData);
      }

      if (result.success) {
        showToast(editingContractor?.contractor_id ? 'Contractor updated successfully' : 'Contractor created successfully', 'success');
        setShowFormModal(false);
        setEditingContractor(null);
        refreshContractors();
      } else {
        showToast(result.error || 'Failed to save contractor', 'error');
      }
    } catch (error) {
      showToast('Failed to save contractor', 'error');
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Contractor Schedule</h2>
        <button
          onClick={handleAddContractor}
          className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
        >
          + Add Contractor
        </button>
      </div>

      {/* Contractor Cards */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">All Contractors ({contractors.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contractors.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No contractors found
            </div>
          ) : (
            contractors.map((contractor) => (
              <ContractorCard
                key={contractor.contractor_id}
                contractor={contractor}
                onClick={() => setSelectedContractorDetail(contractor)}
                isSelected={selectedContractor === contractor.contractor_id}
              />
            ))
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Select Contractor for Schedule"
            value={selectedContractor}
            onChange={setSelectedContractor}
            options={contractorOptions}
            placeholder={loading ? 'Loading...' : 'Choose a contractor...'}
            disabled={loading}
          />
          <DateRangePicker
            label="Date Range"
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </div>

        {/* Contractor Details */}
        {contractorDetails && (
          <div className="bg-purple-50 rounded-lg p-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="text-purple-600 font-medium">Business:</span>{' '}
                {contractorDetails.business_name || contractorDetails.name}
              </div>
              <div>
                <span className="text-purple-600 font-medium">Contact:</span>{' '}
                {contractorDetails.name}
              </div>
              <div>
                <span className="text-purple-600 font-medium">Phone:</span>{' '}
                {contractorDetails.phone || 'N/A'}
              </div>
              <div>
                <span className="text-purple-600 font-medium">Email:</span>{' '}
                {contractorDetails.email || 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {selectedContractor && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Hours"
            value={stats.totalHours.toFixed(1)}
            color="bg-purple-100 text-purple-800"
          />
          <StatCard
            label="Courts Used"
            value={stats.courtsUsed}
            color="bg-blue-100 text-blue-800"
          />
          <StatCard
            label="Active Bookings"
            value={stats.activeCount}
            color="bg-green-100 text-green-800"
          />
          <StatCard
            label="Completed"
            value={stats.completedCount}
            color="bg-gray-100 text-gray-800"
          />
        </div>
      )}

      {/* Bookings Table */}
      {selectedContractor && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Court
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Booking ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No bookings found for this contractor in the selected date range.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr
                      key={booking.booking_id}
                      onClick={() => onBookingClick?.(booking)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateDisplay(booking.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatTimeDisplay(booking.time_start)} - {formatTimeDisplay(booking.time_end)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getCourtName(parseInt(booking.court, 10))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`
                          px-2 py-1 text-xs font-medium rounded-full
                          ${booking.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                          ${booking.status === 'completed' ? 'bg-gray-100 text-gray-800' : ''}
                        `}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {booking.booking_id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedContractor && (
        <div className="text-center py-12 text-gray-500">
          Select a contractor above to view their schedule
        </div>
      )}

      {/* Contractor Detail Modal */}
      <ContractorDetailModal
        contractor={selectedContractorDetail}
        onClose={() => setSelectedContractorDetail(null)}
        onEdit={handleEditContractor}
        onDuplicate={handleDuplicateContractor}
        onDelete={handleDeleteContractor}
      />

      {/* Contractor Form Modal */}
      <ContractorFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingContractor(null); }}
        contractor={editingContractor}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

function ContractorCard({ contractor, onClick, isSelected }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 hover:border-purple-500 hover:shadow-md cursor-pointer transition-all ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{contractor.business_name || contractor.name}</h4>
          {contractor.business_name && contractor.name && (
            <p className="text-sm text-gray-500">{contractor.name}</p>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          contractor.status === 'active' || contractor.is_active === 'TRUE'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {contractor.status === 'active' || contractor.is_active === 'TRUE' ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {contractor.phone && (
          <div className="text-gray-500 text-xs">Phone: {contractor.phone}</div>
        )}
        {contractor.email && (
          <div className="text-gray-500 text-xs truncate">Email: {contractor.email}</div>
        )}
      </div>
    </div>
  );
}

function ContractorDetailModal({ contractor, onClose, onEdit, onDuplicate, onDelete }) {
  if (!contractor) return null;

  return (
    <Modal isOpen={!!contractor} onClose={onClose} title="Contractor Details">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{contractor.business_name || contractor.name}</h3>
            {contractor.business_name && contractor.name && (
              <p className="text-sm text-gray-500">{contractor.name}</p>
            )}
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            contractor.status === 'active' || contractor.is_active === 'TRUE'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {contractor.status === 'active' || contractor.is_active === 'TRUE' ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="border-t pt-4 space-y-3">
          {contractor.phone && (
            <div>
              <span className="text-sm font-medium text-gray-500">Phone:</span>
              <p className="text-gray-900">{contractor.phone}</p>
            </div>
          )}
          {contractor.email && (
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p className="text-gray-900">{contractor.email}</p>
            </div>
          )}
          {contractor.default_courts && (
            <div>
              <span className="text-sm font-medium text-gray-500">Default Courts:</span>
              <p className="text-gray-900">{contractor.default_courts}</p>
            </div>
          )}
          {contractor.rate && (
            <div>
              <span className="text-sm font-medium text-gray-500">Hourly Rate:</span>
              <p className="text-gray-900">${contractor.rate}/hr</p>
            </div>
          )}
          {contractor.notes && (
            <div>
              <span className="text-sm font-medium text-gray-500">Notes:</span>
              <p className="text-gray-900">{contractor.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-4 flex gap-2">
          <button
            onClick={() => onEdit(contractor)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800"
          >
            Edit
          </button>
          <button
            onClick={() => onDuplicate(contractor)}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Duplicate
          </button>
          <button
            onClick={() => onDelete(contractor)}
            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
          >
            Delete
          </button>
        </div>

        <div className="text-xs text-gray-400">Contractor ID: {contractor.contractor_id}</div>
      </div>
    </Modal>
  );
}

function ContractorFormModal({ isOpen, onClose, contractor, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    phone: '',
    email: '',
    default_courts: '',
    rate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Reset form when contractor changes
  useEffect(() => {
    if (contractor) {
      setFormData({
        name: contractor.name || '',
        business_name: contractor.business_name || '',
        phone: contractor.phone || '',
        email: contractor.email || '',
        default_courts: contractor.default_courts || '',
        rate: contractor.rate || '',
        notes: contractor.notes || '',
      });
    } else {
      setFormData({
        name: '',
        business_name: '',
        phone: '',
        email: '',
        default_courts: '',
        rate: '',
        notes: '',
      });
    }
  }, [contractor, isOpen]);

  const handleChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(formData);
    setSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={contractor?.contractor_id ? 'Edit Contractor' : 'Add New Contractor'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Contact Name"
          value={formData.name}
          onChange={handleChange('name')}
          placeholder="Enter contact name"
          required
        />

        <Input
          label="Business Name"
          value={formData.business_name}
          onChange={handleChange('business_name')}
          placeholder="Enter business name (optional)"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="(501) 555-1234"
          />
          <Input
            label="Hourly Rate"
            type="number"
            value={formData.rate}
            onChange={handleChange('rate')}
            placeholder="75"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          placeholder="contractor@example.com"
        />

        <Input
          label="Default Courts"
          value={formData.default_courts}
          onChange={handleChange('default_courts')}
          placeholder="1,2,3,4"
        />

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="Additional notes..."
          rows={2}
        />

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (contractor?.contractor_id ? 'Update Contractor' : 'Create Contractor')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
