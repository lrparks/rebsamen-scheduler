import { useState, useEffect, useMemo } from 'react';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { logMaintenance, fetchMaintenanceLog } from '../../utils/api.js';
import { formatDateDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import { useCourts } from '../../hooks/useCourts.js';
import Button from '../common/Button.jsx';
import Select from '../common/Select.jsx';
import { Textarea } from '../common/Input.jsx';
import { useToast } from '../common/Toast.jsx';

/**
 * Maintenance dashboard view
 */
export default function MaintenanceView() {
  const { initials } = useStaffContext();
  const { courts, courtOptions } = useCourts();
  const toast = useToast();

  const [maintenanceLog, setMaintenanceLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(new Set());

  const today = formatDateISO(new Date());
  const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat

  // Daily checklist items
  const dailyTasks = [
    { id: 'sweep', label: 'Sweep all courts', category: 'cleaning' },
    { id: 'trash', label: 'Empty trash bins', category: 'cleaning' },
    { id: 'nets', label: 'Check net tension', category: 'equipment' },
    { id: 'lines', label: 'Inspect court lines', category: 'inspection' },
    { id: 'lights', label: 'Test court lights', category: 'equipment' },
    { id: 'water', label: 'Refill water stations', category: 'amenities' },
  ];

  // Weekly tasks
  const weeklyTasks = [
    { id: 'deep_clean', label: 'Deep clean courts', day: 1, category: 'cleaning' },
    { id: 'windscreens', label: 'Inspect windscreens', day: 2, category: 'inspection' },
    { id: 'benches', label: 'Clean benches and seating', day: 3, category: 'cleaning' },
    { id: 'signage', label: 'Check signage', day: 4, category: 'inspection' },
    { id: 'inventory', label: 'Equipment inventory', day: 5, category: 'equipment' },
  ];

  // Monthly tasks
  const monthlyTasks = [
    { id: 'surface_inspect', label: 'Surface damage inspection', dayOfMonth: 1, category: 'inspection' },
    { id: 'paint_touch', label: 'Touch up court paint', dayOfMonth: 15, category: 'maintenance' },
    { id: 'equipment_service', label: 'Equipment maintenance', dayOfMonth: 20, category: 'equipment' },
  ];

  // Load maintenance log
  useEffect(() => {
    const loadLog = async () => {
      try {
        const data = await fetchMaintenanceLog();
        setMaintenanceLog(data);

        // Check what's been completed today
        const todayCompleted = new Set();
        data.forEach(entry => {
          if (entry.date === today && entry.status === 'completed') {
            todayCompleted.add(entry.task_id);
          }
        });
        setCompletedToday(todayCompleted);
      } catch (error) {
        console.error('[MaintenanceView] Error loading log:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLog();
  }, [today]);

  const handleCompleteTask = async (task, notes = '') => {
    if (!initials) {
      toast.error('Please select a staff member first');
      return;
    }

    try {
      const logEntry = {
        task_id: task.id,
        task_name: task.label,
        category: task.category,
        date: today,
        completed_by: initials,
        completed_at: new Date().toISOString(),
        status: 'completed',
        notes: notes,
      };

      const result = await logMaintenance(logEntry);

      if (result.success) {
        setCompletedToday(prev => new Set([...prev, task.id]));
        setMaintenanceLog(prev => [...prev, logEntry]);
        toast.success(`Completed: ${task.label}`);
      } else {
        toast.error(result.error || 'Failed to log task');
      }
    } catch (error) {
      console.error('[MaintenanceView] Error:', error);
      toast.error('Failed to log task');
    }
  };

  // Filter today's applicable weekly tasks
  const todaysWeeklyTasks = weeklyTasks.filter(t => t.day === dayOfWeek);

  // Filter today's applicable monthly tasks
  const todayDayOfMonth = new Date().getDate();
  const todaysMonthlyTasks = monthlyTasks.filter(t => t.dayOfMonth === todayDayOfMonth);

  // Recent maintenance history
  const recentHistory = useMemo(() => {
    return maintenanceLog
      .filter(entry => entry.status === 'completed')
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, 20);
  }, [maintenanceLog]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading maintenance data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-900">Maintenance Dashboard</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Checklist */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Today's Checklist</h3>
            <p className="text-sm text-gray-500">{formatDateDisplay(today)}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Daily Tasks */}
            {dailyTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                completed={completedToday.has(task.id)}
                onComplete={handleCompleteTask}
              />
            ))}

            {/* Today's Weekly Tasks */}
            {todaysWeeklyTasks.length > 0 && (
              <>
                <div className="px-4 py-2 bg-blue-50 text-sm font-medium text-blue-800">
                  Weekly Tasks Due Today
                </div>
                {todaysWeeklyTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    completed={completedToday.has(task.id)}
                    onComplete={handleCompleteTask}
                  />
                ))}
              </>
            )}

            {/* Today's Monthly Tasks */}
            {todaysMonthlyTasks.length > 0 && (
              <>
                <div className="px-4 py-2 bg-purple-50 text-sm font-medium text-purple-800">
                  Monthly Tasks Due Today
                </div>
                {todaysMonthlyTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    completed={completedToday.has(task.id)}
                    onComplete={handleCompleteTask}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">Upcoming Scheduled Tasks</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Weekly Tasks */}
            <div className="px-4 py-2 bg-blue-50 text-sm font-medium text-blue-800">
              Weekly Schedule
            </div>
            {weeklyTasks.map(task => {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return (
                <div key={task.id} className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">{task.label}</span>
                  <span className="text-xs text-gray-500">{days[task.day]}</span>
                </div>
              );
            })}

            {/* Monthly Tasks */}
            <div className="px-4 py-2 bg-purple-50 text-sm font-medium text-purple-800">
              Monthly Schedule
            </div>
            {monthlyTasks.map(task => (
              <div key={task.id} className="px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-gray-900">{task.label}</span>
                <span className="text-xs text-gray-500">Day {task.dayOfMonth}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Maintenance History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-900">Recent Maintenance History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Completed By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No maintenance history found
                  </td>
                </tr>
              ) : (
                recentHistory.map((entry, index) => (
                  <tr key={`${entry.task_id}-${entry.completed_at}-${index}`}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDateDisplay(entry.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.task_name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`
                        px-2 py-1 text-xs font-medium rounded-full
                        ${entry.category === 'cleaning' ? 'bg-blue-100 text-blue-800' : ''}
                        ${entry.category === 'inspection' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${entry.category === 'equipment' ? 'bg-green-100 text-green-800' : ''}
                        ${entry.category === 'maintenance' ? 'bg-purple-100 text-purple-800' : ''}
                        ${entry.category === 'amenities' ? 'bg-gray-100 text-gray-800' : ''}
                      `}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.completed_by}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task, completed, onComplete }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    await onComplete(task, notes);
    setLoading(false);
    setShowNotes(false);
    setNotes('');
  };

  return (
    <div className={`px-4 py-3 ${completed ? 'bg-green-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-6 h-6 rounded-full flex items-center justify-center
              ${completed ? 'bg-green-500 text-white' : 'border-2 border-gray-300'}
            `}
          >
            {completed && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={`text-sm ${completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {task.label}
          </span>
        </div>

        {!completed && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => showNotes ? handleComplete() : setShowNotes(true)}
            loading={loading}
          >
            {showNotes ? 'Complete' : 'Mark Done'}
          </Button>
        )}
      </div>

      {showNotes && !completed && (
        <div className="mt-3 ml-9">
          <Textarea
            placeholder="Add notes (optional)..."
            value={notes}
            onChange={setNotes}
            rows={2}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNotes(false)}
            className="mt-2"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
