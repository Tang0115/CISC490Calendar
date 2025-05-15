// Tom coded this file
// Day view component that displays and manages events for a specific day
// Handles event creation, editing, deletion, and recurring event functionality

import React, { useMemo, useState, useEffect } from 'react';
import RecurringOptionsModal from './RecurringOptionsModal';

const getLocalDateString = (date) => {
  const d = new Date(date);
  // Use UTC methods to ensure consistency across environments
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateRecurringDates = (startDate, recurringOptions) => {
  const dates = [];
  // Create dates in UTC
  const start = new Date(startDate);
  const end = new Date(recurringOptions.endDate);
  let currentDate = new Date(start);

  // Store original time in UTC
  const originalHours = start.getUTCHours();
  const originalMinutes = start.getUTCMinutes();

  // Set time to midnight UTC for date comparison
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  currentDate.setUTCHours(0, 0, 0, 0);

  while (currentDate.getTime() <= end.getTime()) {
    if (recurringOptions.frequency === 'daily') {
      const newDate = new Date(currentDate);
      newDate.setUTCHours(originalHours, originalMinutes, 0, 0);
      dates.push(newDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + recurringOptions.interval);
    } else if (recurringOptions.frequency === 'weekly') {
      if (recurringOptions.weekDays.includes(currentDate.getUTCDay())) {
        const newDate = new Date(currentDate);
        newDate.setUTCHours(originalHours, originalMinutes, 0, 0);
        dates.push(newDate);
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      
      // If we've completed a week and have an interval > 1, skip ahead
      if (currentDate.getUTCDay() === 0 && recurringOptions.interval > 1) {
        currentDate.setUTCDate(currentDate.getUTCDate() + (recurringOptions.interval - 1) * 7);
      }
    } else if (recurringOptions.frequency === 'monthly') {
      const newDate = new Date(currentDate);
      newDate.setUTCHours(originalHours, originalMinutes, 0, 0);
      dates.push(newDate);
      currentDate.setUTCMonth(currentDate.getUTCMonth() + recurringOptions.interval);
    } else if (recurringOptions.frequency === 'yearly') {
      const newDate = new Date(currentDate);
      newDate.setUTCHours(originalHours, originalMinutes, 0, 0);
      dates.push(newDate);
      currentDate.setUTCFullYear(currentDate.getUTCFullYear() + recurringOptions.interval);
    }
  }

  return dates;
};

function DayDetails({ selectedDate, setSelectedDate, events, setEvents }) {
  // State management for tasks and modals
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    category: 'Work',
    priority: 'Medium',
    recurring: false,
  });
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
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Constants for categories, priorities, and date options
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

  // Recurring event handlers
  const handleRecurringChange = (checked) => {
    if (selectedTask) {
      setSelectedTask({ 
        ...selectedTask, 
        recurring: checked,
        recurringOptions: checked ? {
          frequency: 'daily',
          weekDays: [],
          endDate: '',
          interval: 1
        } : null
      });
      if (checked) {
        setRecurringModalOpen(true);
      }
    } else {
      setNewTask({ 
        ...newTask, 
        recurring: checked,
        recurringOptions: checked ? {
          frequency: 'daily',
          weekDays: [],
          endDate: '',
          interval: 1
        } : null
      });
      if (checked) {
        setRecurringModalOpen(true);
      }
    }
  };

  const handleRecurringOptionsSave = (options) => {
    if (selectedTask) {
      setSelectedTask({ 
        ...selectedTask, 
        recurringOptions: options,
        recurring: true
      });
    } else {
      setNewTask({ 
        ...newTask, 
        recurringOptions: options,
        recurring: true
      });
    }
    setRecurringModalOpen(false);
  };

  // Time validation and overlap checking
  const validateTimeInputs = (startTime, endTime) => {
    const errors = {};
    
    // Check if times are provided
    if (!startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!endTime) {
      errors.endTime = 'End time is required';
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      errors.startTime = 'Invalid time format';
    }
    if (endTime && !timeRegex.test(endTime)) {
      errors.endTime = 'Invalid time format';
    }

    if (startTime && endTime && timeRegex.test(startTime) && timeRegex.test(endTime)) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      // Handle events spanning midnight
      if (endMinutes <= startMinutes && endMinutes !== 0) {
        errors.endTime = 'End time must be after start time';
      }
    }
    return errors;
  };

  const checkForOverlappingEvents = (startTime, endTime, taskId = null, date = null) => {
    if (!startTime || !endTime) return false;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const newStartMinutes = startHour * 60 + startMinute;
    const newEndMinutes = endHour * 60 + endMinute;
    const targetDate = date || getLocalDateString(selectedDate);
    
    return events.some(task => {
      // Skip self when editing
      if (taskId && task.taskId === taskId) return false;
      
      // Only check events on the same day
      if (task.date !== targetDate) return false;

      const [taskStartHour, taskStartMinute] = task.startTime.split(':').map(Number);
      const [taskEndHour, taskEndMinute] = task.endTime.split(':').map(Number);
      const taskStartMinutes = taskStartHour * 60 + taskStartMinute;
      const taskEndMinutes = taskEndHour * 60 + taskEndMinute;

      // Handle events spanning midnight
      const normalizedNewEnd = newEndMinutes < newStartMinutes ? newEndMinutes + 1440 : newEndMinutes;
      const normalizedTaskEnd = taskEndMinutes < taskStartMinutes ? taskEndMinutes + 1440 : taskEndMinutes;

      // Check if events overlap
      const overlaps = (
        (newStartMinutes < normalizedTaskEnd && normalizedNewEnd > taskStartMinutes) ||
        (newStartMinutes === taskStartMinutes && normalizedNewEnd === normalizedTaskEnd)
      );

      if (overlaps) {
        console.log('Overlap detected:', {
          new: { start: startTime, end: endTime },
          existing: { start: task.startTime, end: task.endTime }
        });
      }

      return overlaps;
    });
  };

  // Task management functions
  const handleAddTask = async (allowOverlap = false) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Validate required fields
      if (!newTask.title?.trim()) {
        setErrors({ title: 'Title is required' });
        return;
      }

      const timeErrors = validateTimeInputs(newTask.startTime, newTask.endTime);
      if (Object.keys(timeErrors).length > 0) {
        setErrors(timeErrors);
        return;
      }

      // Only check for overlaps if allowOverlap is false
      if (!allowOverlap && checkForOverlappingEvents(newTask.startTime, newTask.endTime)) {
        setErrors({ overlap: 'This event overlaps with an existing event' });
        return;
      }

      // Validate recurring options if task is recurring
      if (newTask.recurring && (!newTask.recurringOptions?.endDate || 
          (newTask.recurringOptions.frequency === 'weekly' && 
           (!newTask.recurringOptions.weekDays || newTask.recurringOptions.weekDays.length === 0)))) {
        setErrors({ recurring: 'Please complete recurring event settings' });
        return;
      }

      setErrors({});
      const taskData = {
        taskId: Date.now().toString(),
        title: newTask.title.trim(),
        description: newTask.description?.trim() || '',
        startTime: newTask.startTime,
        endTime: newTask.endTime,
        category: newTask.category || 'Work',
        priority: newTask.priority || 'Medium',
        recurring: newTask.recurring,
        recurringOptions: newTask.recurring ? {
          ...newTask.recurringOptions,
          interval: Math.max(1, parseInt(newTask.recurringOptions.interval) || 1)
        } : null,
        metadata: { 
          createdBy: 'CurrentUser', 
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString() 
        },
        date: getLocalDateString(selectedDate),
      };

      let tasksToAdd = [taskData];

      if (taskData.recurring && taskData.recurringOptions) {
        try {
          const recurringDates = generateRecurringDates(
            new Date(`${taskData.date}T${taskData.startTime}`),
            taskData.recurringOptions
          );

          if (recurringDates.length === 0) {
            setErrors({ recurring: 'No valid recurring dates were generated' });
            return;
          }

          tasksToAdd = recurringDates.map((date, index) => {
            const startTime = date.toTimeString().slice(0, 5);
            const durationMs = new Date(`1970/01/01 ${taskData.endTime}`).getTime() - 
                             new Date(`1970/01/01 ${taskData.startTime}`).getTime();
            const endTime = new Date(date.getTime() + durationMs).toTimeString().slice(0, 5);

            return {
              ...taskData,
              taskId: `${taskData.taskId}-${index}`,
              date: getLocalDateString(date),
              startTime,
              endTime,
              metadata: {
                ...taskData.metadata,
                recurringGroupId: taskData.taskId
              }
            };
          });
        } catch (error) {
          console.error('Error generating recurring dates:', error);
          setErrors({ recurring: 'Error generating recurring dates' });
          return;
        }
      }

      // Check storage limit before saving
      try {
        const updatedEvents = [...events, ...tasksToAdd];
        const eventsJson = JSON.stringify(updatedEvents);
        if (eventsJson.length > 5242880) { // 5MB limit
          setErrorMessage('Storage limit exceeded. Please delete some tasks.');
          return;
        }
        localStorage.setItem('tasks', eventsJson);
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          setErrorMessage('Storage limit exceeded. Please delete some tasks.');
          return;
        }
        throw e;
      }

      setLastAction({
        type: 'add',
        tasks: tasksToAdd,
        previousEvents: [...events]
      });
      setEvents(prevEvents => [...prevEvents, ...tasksToAdd]);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);

      // Reset form
      setNewTask({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        category: 'Work',
        priority: 'Medium',
        recurring: false,
      });
      setRecurringOptions({
        frequency: 'daily',
        weekDays: [],
        endDate: '',
        interval: 1
      });
    } catch (error) {
      console.error('Error adding task:', error);
      setErrorMessage('An error occurred while adding the task. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

    if (checkForOverlappingEvents(task.startTime, task.endTime, task.taskId, task.date)) {
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

  const handleDeleteTask = (task) => {
    if (!task) return;
    setTaskToDelete(task);
    setDeleteConfirmModalOpen(true);
  };

  // Confirmation and undo functionality
  const confirmDelete = () => {
    if (!taskToDelete) return;

    if (taskToDelete.recurring) {
      setConfirmMessage('This is a recurring event. Would you like to delete all instances or just this one?');
      setConfirmAction('delete');
      setPendingTask(taskToDelete);
      setConfirmModalOpen(true);
    } else {
      const updatedEvents = events.filter(e => e.taskId !== taskToDelete.taskId);
      
      try {
        // Save to localStorage before updating state
        localStorage.setItem('tasks', JSON.stringify(updatedEvents));
        
        // Store the action for undo
        setLastAction({
          type: 'delete',
          tasks: [taskToDelete],
          previousEvents: [...events]
        });
        
        setEvents(updatedEvents);
        setShowUndo(true);
        setTimeout(() => setShowUndo(false), 5000);
      } catch (error) {
        console.error('Error deleting task:', error);
        setErrorMessage('Failed to delete task. Please try again.');
      }
    }
    setDeleteConfirmModalOpen(false);
    setTaskToDelete(null);
  };

  const handleDeleteRecurring = (action) => {
    if (!pendingTask) return;

    try {
      let updatedEvents;
      let deletedTasks;

      if (action === 'all') {
        // For recurring events, match the base taskId (before the hyphen)
        const baseTaskId = pendingTask.taskId.split('-')[0];
        deletedTasks = events.filter(event => 
          event.taskId === pendingTask.taskId || 
          (event.metadata?.recurringGroupId === baseTaskId)
        );
        updatedEvents = events.filter(event => 
          event.taskId !== pendingTask.taskId && 
          event.metadata?.recurringGroupId !== baseTaskId
        );
      } else {
        // Delete only the selected instance
        deletedTasks = [pendingTask];
        updatedEvents = events.filter(event => event.taskId !== pendingTask.taskId);
      }

      // Save to localStorage before updating state
      localStorage.setItem('tasks', JSON.stringify(updatedEvents));

      // Store the action for undo
      setLastAction({
        type: 'delete',
        tasks: deletedTasks,
        previousEvents: [...events]
      });

      setEvents(updatedEvents);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
    } catch (error) {
      console.error('Error deleting recurring task:', error);
      setErrorMessage('Failed to delete recurring task. Please try again.');
    } finally {
      setConfirmModalOpen(false);
      setPendingTask(null);
    }
  };

  const handleConfirmAction = (action) => {
    if (action === 'cancel') {
      setConfirmModalOpen(false);
      setPendingTask(null);
      return;
    }

    if (confirmAction === 'edit') {
      if (pendingTask) {
        // Store the action type in the pendingTask for later use
        setPendingTask({
          ...pendingTask,
          editAction: action // 'all' or 'single'
        });
        setSelectedTask(pendingTask);
        setEditModalOpen(true);
      }
    } else if (confirmAction === 'delete') {
      handleDeleteRecurring(action);
    }
    
    setConfirmModalOpen(false);
  };

  // UI helper functions
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

  // Date navigation functions
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

  // Form handling functions
  const handleInputChange = (field, value) => {
    setNewTask(prev => ({ ...prev, [field]: value }));
  };

  const formatTime12Hour = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleSaveEdit = (allowOverlap = false) => {
    if (!selectedTask) return;

    const timeErrors = validateTimeInputs(selectedTask.startTime, selectedTask.endTime);
    if (Object.keys(timeErrors).length > 0) {
      setErrors(timeErrors);
      return;
    }

    // Only check for overlaps if allowOverlap is false
    if (!allowOverlap && checkForOverlappingEvents(selectedTask.startTime, selectedTask.endTime, selectedTask.taskId, selectedTask.date)) {
      setErrors({ overlap: 'This event overlaps with an existing event' });
      return;
    }

    if (!selectedTask.title.trim()) {
      setErrors({ title: 'Title is required' });
      return;
    }

    // Validate recurring options if task is recurring
    if (selectedTask.recurring && (!selectedTask.recurringOptions?.endDate || 
        (selectedTask.recurringOptions.frequency === 'weekly' && 
         (!selectedTask.recurringOptions.weekDays || selectedTask.recurringOptions.weekDays.length === 0)))) {
      setErrors({ recurring: 'Please complete recurring event settings' });
      return;
    }

    try {
      if (selectedTask.recurring && selectedTask.editAction) {
        if (selectedTask.editAction === 'all' && selectedTask.recurringOptions) {
          // Generate new recurring dates
          const recurringDates = generateRecurringDates(
            new Date(`${selectedTask.date}T${selectedTask.startTime}`),
            selectedTask.recurringOptions
          );

          if (recurringDates.length === 0) {
            setErrors({ recurring: 'No valid recurring dates were generated' });
            return;
          }

          // Create updated tasks for all recurring instances
          const tasksToUpdate = recurringDates.map((date, index) => {
            const startTime = date.toTimeString().slice(0, 5);
            const durationMs = new Date(`1970/01/01 ${selectedTask.endTime}`).getTime() - 
                             new Date(`1970/01/01 ${selectedTask.startTime}`).getTime();
            const endTime = new Date(date.getTime() + durationMs).toTimeString().slice(0, 5);

            return {
              ...selectedTask,
              taskId: `${selectedTask.taskId.split('-')[0]}-${index}`,
              date: getLocalDateString(date),
              startTime,
              endTime,
              metadata: {
                ...selectedTask.metadata,
                lastUpdated: new Date().toISOString(),
                recurringGroupId: selectedTask.taskId.split('-')[0]
              }
            };
          });

          // Remove all existing instances and add new ones
          const updatedEvents = events.filter(event => 
            !event.taskId.startsWith(selectedTask.taskId.split('-')[0])
          ).concat(tasksToUpdate);

          // Save to localStorage
          localStorage.setItem('tasks', JSON.stringify(updatedEvents));
          
          // Update state
          setEvents(updatedEvents);
          setLastAction({
            type: 'edit',
            tasks: tasksToUpdate,
            previousEvents: [...events]
          });
        } else if (selectedTask.editAction === 'single') {
          // For single instance, just update the specific task
          const updatedEvents = events.map(event => 
            event.taskId === selectedTask.taskId ? selectedTask : event
          );

          // Save to localStorage
          localStorage.setItem('tasks', JSON.stringify(updatedEvents));
          
          // Update state
          setEvents(updatedEvents);
          setLastAction({
            type: 'edit',
            tasks: [selectedTask],
            previousEvents: [...events]
          });
        }
      } else {
        // Single task update
        const updatedTask = {
          ...selectedTask,
          title: selectedTask.title.trim(),
          description: selectedTask.description?.trim() || '',
          metadata: { 
            ...selectedTask.metadata, 
            lastUpdated: new Date().toISOString() 
          }
        };

        // Update the single task in events array
        const updatedEvents = events.map(event => 
          event.taskId === selectedTask.taskId ? updatedTask : event
        );

        // Save to localStorage
        localStorage.setItem('tasks', JSON.stringify(updatedEvents));
        
        // Update state
        setEvents(updatedEvents);
        setLastAction({
          type: 'edit',
          tasks: [updatedTask],
          previousEvents: [...events]
        });
      }

      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
      setEditModalOpen(false);
      setSelectedTask(null);
      setErrors({});
    } catch (error) {
      console.error('Error saving edit:', error);
      setErrorMessage('Failed to save changes. Please try again.');
    }
  };

  // Undo functionality
  const handleUndo = () => {
    if (!lastAction) return;

    try {
      let updatedEvents;
      
      if (lastAction.type === 'add') {
        // Undo add by restoring previous events
        updatedEvents = [...lastAction.previousEvents];
      } else if (lastAction.type === 'delete') {
        // Undo delete by adding back deleted tasks
        updatedEvents = [...events, ...lastAction.tasks];
      } else if (lastAction.type === 'edit') {
        // Undo edit by restoring previous version of tasks
        updatedEvents = events.map(event => {
          const previousVersion = lastAction.previousEvents.find(e => e.taskId === event.taskId);
          return previousVersion || event;
        });
      }

      // Save to localStorage
      localStorage.setItem('tasks', JSON.stringify(updatedEvents));
      
      setEvents(updatedEvents);
      setShowUndo(false);
      setLastAction(null);
    } catch (error) {
      console.error('Error undoing action:', error);
      setErrorMessage('Failed to undo last action. Please try again.');
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

  return (
    <div className="day-details">
      {errorMessage && (
        <div className="error-banner" role="alert">
          {errorMessage}
          <button onClick={() => setErrorMessage('')} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {isLoading && (
        <div className="loading-overlay" role="status">
          <div className="loading-spinner"></div>
          <span className="visually-hidden">Loading...</span>
        </div>
      )}
      {showUndo && (
        <div className="undo-notification" role="alert">
          <div className="undo-content">
            <span className="undo-message">
              {lastAction?.type === 'delete' ? (
                <>Task "{lastAction.tasks[0].title}" deleted</>
              ) : lastAction?.type === 'edit' ? (
                <>Task "{lastAction.tasks[0].title}" edited</>
              ) : (
                <>Task "{lastAction.tasks[0].title}" added</>
              )}
            </span>
            <button className="undo-button" onClick={handleUndo}>
              Undo
            </button>
          </div>
          <div className="undo-timer"></div>
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
              <div 
                key={task.taskId} 
                className={`timeline-item ${task.completed ? 'completed' : ''}`}
                style={{ borderLeft: `5px solid ${getPriorityColor(task.priority)}` }}
                onClick={() => toggleTask(task.taskId)}
              >
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
                  <button className="edit-button" onClick={(e) => {
                    e.stopPropagation();
                    handleEditTask(task);
                  }}>Edit</button>
                  <button className="delete-button" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(task);
                  }}>Delete</button>
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
                  <div className="modal-buttons">
                    <button className="save-btn" onClick={() => {
                      setErrors({});
                      handleAddTask(true); // Pass true to indicate overlap is accepted
                    }}>
                      Proceed Anyway
                    </button>
                    <button className="cancel-btn" onClick={() => setErrors({})}>
                      Cancel
                    </button>
                  </div>
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
                <button onClick={() => handleAddTask()}>Add</button>
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
            {errors.overlap && (
              <div className="overlap-warning-popup">
                <h3>Schedule Conflict</h3>
                <p>{errors.overlap}</p>
                <div className="modal-buttons">
                  <button className="save-btn" onClick={() => {
                    setErrors({});
                    handleSaveEdit(true); // Pass true to indicate overlap is accepted
                  }}>
                    Proceed Anyway
                  </button>
                  <button className="cancel-btn" onClick={() => setErrors({})}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="modal-buttons">
              <button className="save-btn" onClick={() => handleSaveEdit()}>Save</button>
              <button className="delete-btn" onClick={handleDeleteTask}>Delete</button>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Confirm Delete</div>
            <div className="confirm-message">
              Are you sure you want to delete "{taskToDelete?.title}"?
              <br />
              <span className="warning-text">This action can be undone for the next 5 seconds.</span>
            </div>
            <div className="modal-buttons">
              <button className="delete-btn" onClick={confirmDelete}>Delete</button>
              <button className="cancel-btn" onClick={() => {
                setDeleteConfirmModalOpen(false);
                setTaskToDelete(null);
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DayDetails;