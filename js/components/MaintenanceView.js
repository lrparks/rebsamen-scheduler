// MaintenanceView Component - Maintenance dashboard and task tracking

const MaintenanceView = ({
    courts,
    maintenanceLogs,
    currentStaff,
    onLogMaintenance
}) => {
    const [activeTab, setActiveTab] = React.useState('today');
    const [selectedTask, setSelectedTask] = React.useState(null);
    const [completionNote, setCompletionNote] = React.useState('');

    const today = DateHelpers.getToday();

    // Sample daily tasks (would typically come from config)
    const dailyTasks = [
        { id: 'sweep_courts', name: 'Sweep all courts', frequency: 'daily', priority: 'high' },
        { id: 'empty_trash', name: 'Empty trash cans', frequency: 'daily', priority: 'high' },
        { id: 'check_nets', name: 'Check net tension', frequency: 'daily', priority: 'medium' },
        { id: 'check_windscreens', name: 'Inspect windscreens', frequency: 'daily', priority: 'low' },
        { id: 'water_plants', name: 'Water planters', frequency: 'daily', priority: 'low' },
        { id: 'clean_restrooms', name: 'Clean restrooms', frequency: 'daily', priority: 'high' },
        { id: 'check_lights', name: 'Test court lights', frequency: 'daily', priority: 'medium' },
        { id: 'pickup_balls', name: 'Collect stray balls', frequency: 'daily', priority: 'low' }
    ];

    const weeklyTasks = [
        { id: 'pressure_wash', name: 'Pressure wash courts 1-4', frequency: 'weekly', priority: 'medium' },
        { id: 'line_inspection', name: 'Inspect court lines', frequency: 'weekly', priority: 'medium' },
        { id: 'fence_check', name: 'Check fence integrity', frequency: 'weekly', priority: 'medium' },
        { id: 'bleacher_clean', name: 'Clean stadium bleachers', frequency: 'weekly', priority: 'low' }
    ];

    const monthlyTasks = [
        { id: 'resurface_check', name: 'Surface condition assessment', frequency: 'monthly', priority: 'high' },
        { id: 'light_bulbs', name: 'Replace burned out lights', frequency: 'monthly', priority: 'medium' },
        { id: 'deep_clean', name: 'Deep clean facility', frequency: 'monthly', priority: 'medium' }
    ];

    // Get completed tasks for today
    const todayLogs = React.useMemo(() => {
        return maintenanceLogs.filter(log => log.completed_date === today);
    }, [maintenanceLogs, today]);

    // Check if task is completed today
    const isTaskCompletedToday = (taskId) => {
        return todayLogs.some(log => log.task_id === taskId);
    };

    // Get task completion info
    const getTaskCompletion = (taskId) => {
        return todayLogs.find(log => log.task_id === taskId);
    };

    // Handle task completion
    const handleCompleteTask = async (task) => {
        if (!currentStaff) {
            alert('Please select a staff member first');
            return;
        }

        const logData = {
            task_id: task.id,
            task_name: task.name,
            completed_date: today,
            completed_by: currentStaff.staff_id,
            notes: completionNote
        };

        await onLogMaintenance(logData);
        setSelectedTask(null);
        setCompletionNote('');
    };

    // Get priority badge
    const getPriorityBadge = (priority) => {
        const badges = {
            high: { bg: 'bg-red-100', text: 'text-red-800' },
            medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
            low: { bg: 'bg-green-100', text: 'text-green-800' }
        };
        return badges[priority] || badges.medium;
    };

    // Task list component
    const TaskList = ({ tasks, showCompletion = true }) => (
        <div className="divide-y divide-gray-200">
            {tasks.map(task => {
                const isCompleted = isTaskCompletedToday(task.id);
                const completion = getTaskCompletion(task.id);
                const priorityBadge = getPriorityBadge(task.priority);

                return (
                    <div
                        key={task.id}
                        className={`p-4 flex items-center justify-between ${isCompleted ? 'bg-green-50' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            {showCompletion && (
                                <button
                                    onClick={() => !isCompleted && setSelectedTask(task)}
                                    disabled={isCompleted}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        isCompleted
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-gray-300 hover:border-green-500'
                                    }`}
                                >
                                    {isCompleted && (
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            )}
                            <div>
                                <p className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                    {task.name}
                                </p>
                                {isCompleted && completion && (
                                    <p className="text-xs text-gray-500">
                                        Completed by {completion.completed_by} at {completion.completed_at}
                                        {completion.notes && ` - ${completion.notes}`}
                                    </p>
                                )}
                            </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityBadge.bg} ${priorityBadge.text}`}>
                            {task.priority}
                        </span>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        {[
                            { id: 'today', label: "Today's Checklist" },
                            { id: 'upcoming', label: 'Upcoming Tasks' },
                            { id: 'history', label: 'History' },
                            { id: 'courts', label: 'Court Status' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-green-500 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Today's Checklist */}
            {activeTab === 'today' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h3 className="font-medium text-gray-900">Daily Tasks</h3>
                            <p className="text-sm text-gray-500">
                                {todayLogs.length} of {dailyTasks.length} completed
                            </p>
                        </div>
                        <div className="text-sm text-gray-500">
                            {DateHelpers.formatDisplayDate(today)}
                        </div>
                    </div>
                    <TaskList tasks={dailyTasks} />
                </div>
            )}

            {/* Upcoming Tasks */}
            {activeTab === 'upcoming' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                            <h3 className="font-medium text-gray-900">Weekly Tasks</h3>
                        </div>
                        <TaskList tasks={weeklyTasks} showCompletion={false} />
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 bg-blue-50 border-b border-blue-200">
                            <h3 className="font-medium text-gray-900">Monthly Tasks</h3>
                        </div>
                        <TaskList tasks={monthlyTasks} showCompletion={false} />
                    </div>
                </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">Maintenance History</h3>
                    </div>
                    {maintenanceLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No maintenance logs found.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {maintenanceLogs
                                .sort((a, b) => b.completed_date?.localeCompare(a.completed_date) || 0)
                                .slice(0, 50)
                                .map((log, idx) => (
                                    <div key={idx} className="p-4">
                                        <div className="flex justify-between">
                                            <p className="font-medium text-gray-900">{log.task_name || log.task_id}</p>
                                            <p className="text-sm text-gray-500">{DateHelpers.formatDisplayDate(log.completed_date)}</p>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Completed by {log.completed_by}
                                            {log.notes && ` - ${log.notes}`}
                                        </p>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            )}

            {/* Court Status */}
            {activeTab === 'courts' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-medium text-gray-900">Court Status Overview</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {courts.map(court => {
                            const isAvailable = court.status === 'available' || court.status === 'open' || !court.status;
                            return (
                                <div
                                    key={court.court_number}
                                    className={`p-4 rounded-lg border ${
                                        isAvailable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{court.court_name}</h4>
                                            <p className="text-sm text-gray-500">
                                                {court.surface} surface
                                                {court.lighting === 'true' || court.lighting === 'TRUE' ? ' • Lighted' : ''}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            isAvailable ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                        }`}>
                                            {court.status || 'Available'}
                                        </span>
                                    </div>
                                    {court.status_note && (
                                        <p className="mt-2 text-sm text-gray-600">{court.status_note}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Task Completion Modal */}
            {selectedTask && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Complete Task</h3>
                        <p className="text-gray-600 mb-4">{selectedTask.name}</p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (optional)
                            </label>
                            <textarea
                                value={completionNote}
                                onChange={(e) => setCompletionNote(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Any notes about the task..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedTask(null);
                                    setCompletionNote('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleCompleteTask(selectedTask)}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Mark Complete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Make available globally
window.MaintenanceView = MaintenanceView;
