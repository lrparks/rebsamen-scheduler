import { useState, useEffect, useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { fetchClosures } from '../../utils/api.js';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import { formatDateDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import { useToast } from '../common/Toast.jsx';
import { CONFIG } from '../../config.js';
import { callAppsScript } from '../../utils/api.js';

/**
 * Closures Management View
 * Allows adding, viewing, and managing court closures
 */
export default function ClosuresView() {
  const { closures, refreshBookings } = useBookingsContext();
  const [allClosures, setAllClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClosure, setEditingClosure] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active', 'all', 'past'
  const toast = useToast();

  // Fetch all closures including inactive
  useEffect(() => {
    loadClosures();
  }, []);

  const loadClosures = async () => {
    setLoading(true);
    try {
      const data = await fetchClosures();
      setAllClosures(data);
    } catch (error) {
      console.error('[ClosuresView] Error loading closures:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter closures
  const filteredClosures = useMemo(() => {
    const today = formatDateISO(new Date());
    return allClosures.filter(c => {
      if (filter === 'active') {
        return c.is_active === 'TRUE' && c.date >= today;
      }
      if (filter === 'past') {
        return c.date < today;
      }
      return true; // 'all'
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [allClosures, filter]);

  const handleAdd = () => {
    setEditingClosure(null);
    setShowModal(true);
  };

  const handleEdit = (closure) => {
    setEditingClosure(closure);
    setShowModal(true);
  };

  const handleSave = async (closureData) => {
    try {
      const result = await callAppsScript('saveClosure', { closure: closureData });
      if (result.success) {
        toast.success(editingClosure ? 'Closure updated' : 'Closure created');
        setShowModal(false);
        loadClosures();
        refreshBookings(); // Refresh to update grid display
      } else {
        toast.error(result.error || 'Failed to save closure');
      }
    } catch (error) {
      toast.error('Failed to save closure');
    }
  };

  const handleDelete = async (closure) => {
    if (!confirm(`Delete closure for ${formatDateDisplay(closure.date)}?`)) return;

    try {
      const result = await callAppsScript('deleteClosure', { closureId: closure.closure_id });
      if (result.success) {
        toast.success('Closure deleted');
        loadClosures();
        refreshBookings();
      } else {
        toast.error(result.error || 'Failed to delete closure');
      }
    } catch (error) {
      toast.error('Failed to delete closure');
    }
  };

  const getCourtLabel = (court) => {
    if (!court || court.toLowerCase() === 'all') return 'All Courts';
    const num = parseInt(court, 10);
    if (num === CONFIG.STADIUM_COURT_NUMBER) return 'Stadium';
    return `Court ${num}`;
  };

  const getTimeLabel = (start, end) => {
    if ((!start || start === '00:00') && (!end || end === '21:00')) {
      return 'All Day';
    }
    return `${start || '00:00'} - ${end || '21:00'}`;
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Court Closures</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage court closures for holidays, maintenance, and special events
              </p>
            </div>
            <Button onClick={handleAdd}>
              + Add Closure
            </Button>
          </div>

          {/* Filter */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-600">Show:</span>
            <div className="flex gap-2">
              {[
                { value: 'active', label: 'Upcoming' },
                { value: 'past', label: 'Past' },
                { value: 'all', label: 'All' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    filter === opt.value
                      ? 'bg-green-100 text-green-800 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Closures List */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading closures...</div>
          ) : filteredClosures.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No closures found. Click "Add Closure" to create one.
            </div>
          ) : (
            filteredClosures.map((closure, idx) => (
              <div
                key={closure.closure_id || idx}
                className={`px-6 py-4 hover:bg-gray-50 ${
                  closure.is_active !== 'TRUE' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDateDisplay(closure.date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getCourtLabel(closure.court)} • {getTimeLabel(closure.time_start, closure.time_end)}
                        </div>
                      </div>
                    </div>
                    {closure.reason && (
                      <div className="mt-2 text-sm text-gray-600 ml-13">
                        {closure.reason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {closure.is_active !== 'TRUE' && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(closure)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(closure)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ClosureModal
          closure={editingClosure}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/**
 * Closure Add/Edit Modal
 */
function ClosureModal({ closure, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: closure?.date || formatDateISO(new Date()),
    court: closure?.court || 'all',
    time_start: closure?.time_start || '',
    time_end: closure?.time_end || '',
    reason: closure?.reason || '',
    is_active: closure?.is_active || 'TRUE',
  });
  const [allDay, setAllDay] = useState(!closure?.time_start && !closure?.time_end);
  const [saving, setSaving] = useState(false);

  // Generate court options
  const courtOptions = [
    { value: 'all', label: 'All Courts' },
    ...Array.from({ length: CONFIG.TOTAL_COURTS }, (_, i) => ({
      value: String(i + 1),
      label: i + 1 === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `Court ${i + 1}`,
    })),
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      ...formData,
      closure_id: closure?.closure_id || `CLO-${Date.now()}`,
      time_start: allDay ? '' : formData.time_start,
      time_end: allDay ? '' : formData.time_end,
    };

    await onSave(data);
    setSaving(false);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={closure ? 'Edit Closure' : 'Add Closure'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={formData.date}
          onChange={(val) => setFormData(prev => ({ ...prev, date: val }))}
          required
        />

        <Select
          label="Court"
          value={formData.court}
          onChange={(val) => setFormData(prev => ({ ...prev, court: val }))}
          options={courtOptions}
        />

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600"
          />
          <label htmlFor="allDay" className="text-sm text-gray-700">All Day</label>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={formData.time_start}
              onChange={(val) => setFormData(prev => ({ ...prev, time_start: val }))}
            />
            <Input
              label="End Time"
              type="time"
              value={formData.time_end}
              onChange={(val) => setFormData(prev => ({ ...prev, time_end: val }))}
            />
          </div>
        )}

        <Input
          label="Reason"
          value={formData.reason}
          onChange={(val) => setFormData(prev => ({ ...prev, reason: val }))}
          placeholder="e.g., Holiday, Court Maintenance, Tournament Setup..."
        />

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.is_active === 'TRUE'}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked ? 'TRUE' : 'FALSE' }))}
            className="h-4 w-4 rounded border-gray-300 text-green-600"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" loading={saving} fullWidth>
            {closure ? 'Update' : 'Create'} Closure
          </Button>
        </div>
      </form>
    </Modal>
  );
}
