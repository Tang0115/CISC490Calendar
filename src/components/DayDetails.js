import React, { useMemo, useState, useEffect } from 'react';
import RecurringOptionsModal from './RecurringOptionsModal';

const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateRecurringDates = (startDate, recurringOptions) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(recurringOptions.endDate);
  let currentDate = new Date(start);

  while (currentDate <= end) {
    if (recurringOptions.frequency === 'daily') {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + recurringOptions.interval);
    } else if (recurringOptions.frequency === 'weekly') {
      if (recurringOptions.weekDays.includes(currentDate.getDay())) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getDay() === 0) {
        currentDate.setDate(currentDate.getDate() + (recurringOptions.interval - 1) * 7);
      }
    } else if (recurringOptions.frequency === 'monthly') {
      dates.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + recurringOptions.interval);
    } else if (recurringOptions.frequency === 'yearly') {
      dates.push(new Date(currentDate));
      currentDate.setFullYear(currentDate.getFullYear() + recurringOptions.interval);
    }
  }

  return dates;
};

function DayDetails({ selectedDate, setSelectedDate, events, setEvents }) {
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    category: 'Work',
    priority: 'Medium',
    recurring: false,
  });
  const [showDelete, setShowDelete] = useState(null);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringOptions, setRecurringOptions] = useState({
    frequency: 'daily',
    weekDays: [],
    endDate: '',
    interval: 1
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingTask, setPendingTask] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const [errors, setErrors] = useState({});
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  const categories = useMemo(() => ['Work', 'Personal', 'School'], []);
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const months = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);
  }, []);

  const handleRecurringChange = (checked) => {
    if (selectedTask) {
      setSelectedTask({ ...selectedTask, recurring: checked });
      if (checked) {
        setRecurringModalOpen(true);
      }
    } else {
      setNewTask({ ...newTask, recurring: checked });
      if (checked) {
        setRecurringModalOpen(true);
      }
    }
  };

  const handleRecurringOptionsSave = (options) => {
    if (selectedTask) {
      setSelectedTask({ ...selectedTask, recurringOptions: options });
    } else {
      setNewTask({ ...newTask, recurringOptions: options });
    }
  };

  const validateTimeInputs = (startTime, endTime) => {
    const errors = {};
    if (!startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!endTime) {
      errors.endTime = 'End time is required';
    }
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      if (end <= start) {
        errors.endTime = 'End time must be after start time';
      }
    }
    return errors;
  };

  const checkForOverlappingEvents = (startTime, endTime, taskId = null) => {
    const newStart = new Date(`2000-01-01T${startTime}`);
    const newEnd = new Date(`2000-01-01T${endTime}`);
    
    return events.some(task => {
      if (taskId && task.taskId === taskId) return false;
      const taskStart = new Date(`2000-01-01T${task.startTime}`);
      const taskEnd = new Date(`2000-01-01T${task.endTime}`);
      return (newStart < taskEnd && newEnd > taskStart);
    });
  };

  const handleAddTask = () => {
    const timeErrors = validateTimeInputs(newTask.startTime, newTask.endTime);
    if (Object.keys(timeErrors).length > 0) {
      setErrors(timeErrors);
      return;
    }

    if (checkForOverlappingEvents(newTask.startTime, newTask.endTime)) {
      setErrors({ overlap: 'This event overlaps with an existing event' });
      return;
    }

    setErrors({});
    const taskData = {
      taskId: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      startTime: newTask.startTime,
      endTime: newTask.endTime,
      category: newTask.category,
      priority: newTask.priority,
      recurring: newTask.recurring,
      recurringOptions: newTask.recurring ? newTask.recurringOptions : null,
      metadata: { createdBy: 'CurrentUser', lastUpdated: new Date().toISOString() },
      date: getLocalDateString(selectedDate),
    };

    let tasksToAdd = [taskData];

    if (taskData.recurring && taskData.recurringOptions) {
      const recurringDates = generateRecurringDates(
        new Date(`${taskData.date}T${taskData.startTime}`),
        taskData.recurringOptions
      );

      tasksToAdd = recurringDates.map((date, index) => ({
        ...taskData,
        taskId: `${taskData.taskId}-${index}`,
        date: getLocalDateString(date),
        startTime: date.toTimeString().slice(0, 5),
        endTime: new Date(date.getTime() + (new Date(`1970/01/01 ${taskData.endTime}`).getTime() - new Date(`1970/01/01 ${taskData.startTime}`).getTime())).toTimeString().slice(0, 5),
      }));
    }

    setLastAction({
      type: 'add',
      tasks: tasksToAdd,
      previousEvents: [...events]
    });
    setEvents(prevEvents => [...prevEvents, ...tasksToAdd]);
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 5000);

    setNewTask({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      category: 'Work',
      priority: 'Medium',
      recurring: false,
    });
  };

  const handleUpdateTask = (taskId, updatedTask) => {
    setEvents(prevEvents =>
      prevEvents.map(task =>
        task.taskId === taskId ? { ...task, ...updatedTask, metadata: { ...task.metadata, lastUpdated: new Date().toISOString() } } : task
      )
    );
  };

  const handleEditTask = (task) => {
    const timeErrors = validateTimeInputs(task.startTime, task.endTime);
    if (Object.keys(timeErrors).length > 0) {
      setErrors(timeErrors);
      return;
    }

    if (checkForOverlappingEvents(task.startTime, task.endTime, task.taskId)) {
      setErrors({ overlap: 'This event overlaps with an existing event' });
      return;
    }

    setErrors({});
    if (task.recurring) {
      setConfirmMessage('This is a recurring event. Would you like to edit all instances or just this one?');
      setConfirmAction('edit');
      setPendingTask(task);
      setConfirmModalOpen(true);
    } else {
      setSelectedTask(task);
      setEditModalOpen(true);
    }
  };

  const handleDeleteTask = (taskId) => {
    const task = events.find(t => t.taskId === taskId);
    if (task.recurring) {
      setConfirmMessage('This is a recurring event. Would you like to delete all instances or just this one?');
      setConfirmAction('delete');
      setPendingTask(task);
      setConfirmModalOpen(true);
    } else {
      setDeletedTasks(prev => [...prev, { ...task, deletedAt: Date.now() }]);
      setLastAction({
        type: 'delete',
        taskId: taskId,
        previousEvents: [...events]
      });
      setEvents(prevEvents => prevEvents.filter(task => task.taskId !== taskId));
      setShowDelete(null);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
    }
  };

  const handleConfirmAction = (action) => {
    if (confirmAction === 'edit') {
      if (pendingTask) {
        if (action === 'all') {
          setSelectedTask(pendingTask);
          setEditModalOpen(true);
        } else if (action === 'single') {
          setSelectedTask(pendingTask);
          setEditModalOpen(true);
        }
      }
    } else if (confirmAction === 'delete') {
      if (pendingTask) {
        if (action === 'all' && pendingTask.recurringOptions) {
          // Delete all instances of the recurring event by matching the base taskId
          const baseTaskId = pendingTask.taskId.split('-')[0];
          setEvents(prevEvents => prevEvents.filter(task => !task.taskId.startsWith(baseTaskId)));
        } else if (action === 'single') {
          // Delete only this instance
          setEvents(prevEvents => prevEvents.filter(task => task.taskId !== pendingTask.taskId));
        }
      }
      setShowDelete(null);
    }
    setConfirmModalOpen(false);
    setPendingTask(null);
  };

  const handleCancelConfirm = () => {
    setConfirmModalOpen(false);
    setPendingTask(null);
  };

  const dayTasks = useMemo(() => {
    const filteredTasks = events.filter(task => task.date === getLocalDateString(selectedDate))
      .sort((a, b) => new Date(`1970/01/01 ${a.startTime}`) - new Date(`1970/01/01 ${b.startTime}`));
    return filteredTasks;
  }, [events, selectedDate]);

  useEffect(() => {
    console.log('DayDetails selectedDate:', selectedDate, 'Normalized:', getLocalDateString(selectedDate));
    console.log('DayDetails events:', events);
    console.log('DayDetails dayTasks:', dayTasks);
  }, [selectedDate, events, dayTasks]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Low': return '#A8CCDC';
      case 'Medium': return '#DDA853';
      case 'High': return '#164046';
      case 'Critical': return '#FF0000';
      default: return '#FFFFFF';
    }
  };

  const toggleTask = (taskId) => {
    const task = events.find(t => t.taskId === taskId);
    if (task) {
      const updatedTask = { ...task, completed: !task.completed, metadata: { ...task.metadata, lastUpdated: new Date().toISOString() } };
      handleUpdateTask(taskId, updatedTask);
    }
  };

  const handlePreviousDay = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    setSelectedDate(prevDate);
  };

  const handleNextDay = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(nextDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDateChange = (year, month, day) => {
    const newDate = new Date(year, month, day);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const handleInputChange = (field, value) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
  };

  const formatTime12Hour = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleSaveEdit = () => {
    if (selectedTask.title.trim() && selectedTask.startTime && selectedTask.endTime) {
      const updatedTask = {
        ...selectedTask,
        metadata: { ...selectedTask.metadata, lastUpdated: new Date().toISOString() },
      };
      handleUpdateTask(selectedTask.taskId, updatedTask);
      setEditModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleUndo = () => {
    if (lastAction) {
      setEvents(lastAction.previousEvents);
      setLastAction(null);
      setShowUndo(false);
    }
  };

  const handleUndoDelete = () => {
    const lastDeletedTask = deletedTasks[deletedTasks.length - 1];
    if (lastDeletedTask) {
      setEvents(prevEvents => [...prevEvents, lastDeletedTask]);
      setDeletedTasks(prev => prev.filter(task => task.taskId !== lastDeletedTask.taskId));
      setShowUndoNotification(false);
    }
  };

  return (
    <div className="day-details">
      {showUndo && (
        <div className="undo-notification">
          <span>Task {lastAction?.type === 'add' ? 'added' : 'deleted'}</span>
          <button onClick={handleUndo}>Undo</button>
        </div>
      )}
      {showUndoNotification && (
        <div className="undo-notification" role="alert">
          <span>Task deleted</span>
          <button onClick={handleUndoDelete}>Undo</button>
        </div>
      )}
      <h2>Details for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
      <div className="date-navigation">
        <button onClick={handlePreviousDay}>Previous Day</button>
        <button onClick={handleToday}>Today</button>
        <button onClick={handleNextDay}>Next Day</button>
        <div className="date-selector">
          <select
            value={selectedDate.getFullYear()}
            onChange={(e) => handleDateChange(parseInt(e.target.value), selectedDate.getMonth(), selectedDate.getDate())}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedDate.getMonth()}
            onChange={(e) => handleDateChange(selectedDate.getFullYear(), parseInt(e.target.value), selectedDate.getDate())}
          >
            {months.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedDate.getDate()}
            onChange={(e) => handleDateChange(selectedDate.getFullYear(), selectedDate.getMonth(), parseInt(e.target.value))}
          >
            {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="details-content">
        <div className="timeline-section">
          <h3>Today's Timeline</h3>
          <div className="timeline">
            {dayTasks.map((task) => (
              <div key={task.taskId} className="timeline-item">
                <div className="task-content">
                  <div className="task-title">
                    {task.title}
                    {task.recurring && <span className="recurring-badge">🔄</span>}
                  </div>
                  <div className="task-time">
                    {formatTime12Hour(task.startTime)} - {formatTime12Hour(task.endTime)}
                  </div>
                  <div className="task-category">
                    {task.category}
                  </div>
                  <div className="task-priority">
                    Priority: {task.priority}
                  </div>
                  {task.description && (
                    <div className="task-description">
                      {task.description}
                    </div>
                  )}
                </div>
                <div className="task-actions">
                  <button className="edit-button" onClick={() => handleEditTask(task)}>Edit</button>
                  <button className="delete-button" onClick={() => handleDeleteTask(task.taskId)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="right-section">
          <h3>Add Task</h3>
          <div className="schedule-section">
            <div className="task-input-complex">
              <div className="input-row">
                <label>Task Category:</label>
                <select value={newTask.category} onChange={(e) => handleInputChange('category', e.target.value)}>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="input-row">
                <label htmlFor="task-title">Task Title:</label>
                <input
                  id="task-title"
                  type="text"
                  value={newTask.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter task title"
                  aria-invalid={errors.title ? 'true' : 'false'}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                />
                {errors.title && <span id="title-error" className="error-message">{errors.title}</span>}
              </div>
              <div className="input-row">
                <label>Task Description:</label>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter Task Description..."
                />
              </div>
              <div className="input-row">
                <label htmlFor="start-time">Starting Time:</label>
                <input
                  id="start-time"
                  type="time"
                  value={newTask.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  aria-invalid={errors.startTime ? 'true' : 'false'}
                  aria-describedby={errors.startTime ? 'start-time-error' : undefined}
                />
                {errors.startTime && <span id="start-time-error" className="error-message">{errors.startTime}</span>}
              </div>
              <div className="input-row">
                <label htmlFor="end-time">Ending Time:</label>
                <input
                  id="end-time"
                  type="time"
                  value={newTask.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  aria-invalid={errors.endTime ? 'true' : 'false'}
                  aria-describedby={errors.endTime ? 'end-time-error' : undefined}
                />
                {errors.endTime && <span id="end-time-error" className="error-message">{errors.endTime}</span>}
              </div>
              {errors.overlap && (
                <div className="overlap-warning-popup">
                  <h3>Schedule Conflict</h3>
                  <p>{errors.overlap}</p>
                  <button className="close-button" onClick={() => setErrors({})}>
                    Close
                  </button>
                </div>
              )}
              <div className="input-row">
                <label>Priority:</label>
                <select value={newTask.priority} onChange={(e) => handleInputChange('priority', e.target.value)}>
                  {priorities.map(p => (
                    <option key={p} value={p}>{p} Priority</option>
                  ))}
                </select>
              </div>
              <div className="input-row">
                <label>Recurring Task:</label>
                <input
                  type="checkbox"
                  checked={newTask.recurring}
                  onChange={(e) => handleRecurringChange(e.target.checked)}
                />
              </div>
              <div className="input-row">
                <button onClick={handleAddTask}>Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RecurringOptionsModal
        isOpen={recurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        onSave={handleRecurringOptionsSave}
        recurringOptions={recurringOptions}
        setRecurringOptions={setRecurringOptions}
      />

      {/* Edit Task Modal */}
      {editModalOpen && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Edit Task</div>
            <div className="input-row">
              <label>Title:</label>
              <input
                type="text"
                value={selectedTask.title}
                onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>Description:</label>
              <input
                type="text"
                value={selectedTask.description}
                onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>Start Time:</label>
              <input
                type="time"
                value={selectedTask.startTime}
                onChange={(e) => setSelectedTask({ ...selectedTask, startTime: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>End Time:</label>
              <input
                type="time"
                value={selectedTask.endTime}
                onChange={(e) => setSelectedTask({ ...selectedTask, endTime: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>Category:</label>
              <select
                value={selectedTask.category}
                onChange={(e) => setSelectedTask({ ...selectedTask, category: e.target.value })}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="input-row">
              <label>Priority:</label>
              <select
                value={selectedTask.priority}
                onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="input-row">
              <label>Recurring:</label>
              <input
                type="checkbox"
                checked={selectedTask.recurring}
                onChange={(e) => handleRecurringChange(e.target.checked)}
              />
            </div>
            <div className="modal-buttons">
              <button className="save-btn" onClick={handleSaveEdit}>Save</button>
              <button className="cancel-btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Confirm Action</div>
            <div className="confirm-message">{confirmMessage}</div>
            <div className="modal-buttons">
              <button className="save-btn" onClick={() => handleConfirmAction('all')}>All Instances</button>
              <button className="save-btn" onClick={() => handleConfirmAction('single')}>Just This One</button>
              <button className="cancel-btn" onClick={() => handleConfirmAction('cancel')}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DayDetails;