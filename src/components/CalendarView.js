import React, { useRef, useEffect, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import RecurringOptionsModal from './RecurringOptionsModal';

// Utility to get local YYYY-MM-DD
const getLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility to generate recurring event dates
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

function CalendarView({ selectedDate, setSelectedDate, events, setEvents }) {
  const calendarRef = useRef(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recurringOptions, setRecurringOptions] = useState({
    frequency: 'daily',
    weekDays: [],
    endDate: '',
    interval: 1
  });
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    category: 'Work',
    priority: 'Medium',
    recurring: false,
    date: getLocalDateString(selectedDate),
  });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingEvent, setPendingEvent] = useState(null);

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(selectedDate);
      console.log('Calendar initialized with selectedDate:', selectedDate, 'Local date:', getLocalDateString(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    console.log('CalendarView events:', events);
  }, [events]);

  const handleDateClick = (info) => {
    const startTime = info.date.toTimeString().slice(0, 5); // e.g., "13:00"
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = (hours + 1) % 24;
    const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const clickedDate = getLocalDateString(info.date);
    console.log('handleDateClick - Clicked date:', info.date, 'Normalized:', clickedDate);
    setNewEvent({
      ...newEvent,
      date: clickedDate,
      startTime,
      endTime,
    });
    setCreateModalOpen(true);
  };

  const handleEventClick = (info) => {
    const event = events.find(e => e.taskId === info.event.id.toString());
    if (event) {
      console.log('Clicked event:', event);
      setSelectedEvent(event);
      setEditModalOpen(true);
    } else {
      console.error(`Event with ID ${info.event.id} not found in events array`, events);
    }
  };

  const handleEventDrop = (info) => {
    const updatedEvent = {
      ...info.event.extendedProps,
      taskId: info.event.id.toString(),
      title: info.event.title,
      date: getLocalDateString(info.event.start),
      startTime: info.event.start.toTimeString().slice(0, 5),
      endTime: info.event.end ? info.event.end.toTimeString().slice(0, 5) : info.event.start.toTimeString().slice(0, 5),
      metadata: info.event.extendedProps.metadata || { createdBy: 'CurrentUser', lastUpdated: new Date().toISOString() },
    };
    console.log('Event dropped:', updatedEvent);
    setEvents(prevEvents =>
      prevEvents.map(ev => (ev.taskId === updatedEvent.taskId ? updatedEvent : ev))
    );
  };

  const handleRecurringChange = (checked) => {
    if (selectedEvent) {
      setSelectedEvent({ ...selectedEvent, recurring: checked });
      if (checked) {
        setRecurringModalOpen(true);
      }
    } else {
      setNewEvent({ ...newEvent, recurring: checked });
      if (checked) {
        setRecurringModalOpen(true);
      }
    }
  };

  const handleRecurringOptionsSave = (options) => {
    if (selectedEvent) {
      setSelectedEvent({ ...selectedEvent, recurringOptions: options });
    } else {
      setNewEvent({ ...newEvent, recurringOptions: options });
    }
  };

  const handleCreateEvent = () => {
    if (newEvent.title.trim() && newEvent.startTime && newEvent.endTime) {
      const eventData = {
        taskId: Date.now().toString(),
        title: newEvent.title,
        description: newEvent.description || '',
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        category: newEvent.category,
        priority: newEvent.priority || 'Medium',
        recurring: newEvent.recurring,
        recurringOptions: newEvent.recurring ? newEvent.recurringOptions : null,
        date: newEvent.date,
        metadata: { createdBy: 'CurrentUser', lastUpdated: new Date().toISOString() },
      };

      let eventsToAdd = [eventData];

      if (eventData.recurring && eventData.recurringOptions) {
        const recurringDates = generateRecurringDates(
          new Date(`${eventData.date}T${eventData.startTime}`),
          eventData.recurringOptions
        );

        eventsToAdd = recurringDates.map((date, index) => ({
          ...eventData,
          taskId: `${eventData.taskId}-${index}`,
          date: getLocalDateString(date),
          startTime: date.toTimeString().slice(0, 5),
          endTime: new Date(date.getTime() + (new Date(`1970/01/01 ${eventData.endTime}`).getTime() - new Date(`1970/01/01 ${eventData.startTime}`).getTime())).toTimeString().slice(0, 5),
        }));
      }

      setEvents(prevEvents => [...prevEvents, ...eventsToAdd]);
      setCreateModalOpen(false);
      setNewEvent({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        category: 'Work',
        priority: 'Medium',
        recurring: false,
        date: getLocalDateString(selectedDate),
      });
    }
  };

  const handleEditEvent = () => {
    if (selectedEvent.title.trim() && selectedEvent.startTime && selectedEvent.endTime) {
      const updatedEvent = {
        ...selectedEvent,
        priority: selectedEvent.priority || 'Medium',
        metadata: { ...selectedEvent.metadata, lastUpdated: new Date().toISOString() },
      };

      if (updatedEvent.recurring) {
        setConfirmMessage('This is a recurring event. Would you like to edit all instances or just this one?');
        setConfirmAction('edit');
        setPendingEvent(updatedEvent);
        setConfirmModalOpen(true);
      } else {
        setEvents(prevEvents =>
          prevEvents.map(ev => (ev.taskId === updatedEvent.taskId ? updatedEvent : ev))
        );
        setEditModalOpen(false);
      }
    }
  };

  const handleDeleteEvent = () => {
    if (selectedEvent.recurring) {
      setConfirmMessage('This is a recurring event. Would you like to delete all instances or just this one?');
      setConfirmAction('delete');
      setPendingEvent(selectedEvent);
      setConfirmModalOpen(true);
    } else {
      setEvents(prevEvents => prevEvents.filter(ev => ev.taskId !== selectedEvent.taskId));
      setEditModalOpen(false);
    }
  };

  const handleConfirmAction = (action) => {
    if (confirmAction === 'edit' && pendingEvent) {
      let eventsToUpdate = [pendingEvent];
      if (action === 'all' && pendingEvent.recurring && pendingEvent.recurringOptions) {
        const recurringDates = generateRecurringDates(
          new Date(`${pendingEvent.date}T${pendingEvent.startTime}`),
          pendingEvent.recurringOptions
        );

        eventsToUpdate = recurringDates.map((date, index) => ({
          ...pendingEvent,
          taskId: `${pendingEvent.taskId}-${index}`,
          date: getLocalDateString(date),
          startTime: date.toTimeString().slice(0, 5),
          endTime: new Date(date.getTime() + (new Date(`1970/01/01 ${pendingEvent.endTime}`).getTime() - new Date(`1970/01/01 ${pendingEvent.startTime}`).getTime())).toTimeString().slice(0, 5),
        }));
      }

      setEvents(prevEvents => {
        if (action === 'all') {
          const filteredEvents = prevEvents.filter(ev => !ev.taskId.startsWith(pendingEvent.taskId.split('-')[0]));
          return [...filteredEvents, ...eventsToUpdate];
        } else if (action === 'single') {
          return prevEvents.map(ev => (ev.taskId === pendingEvent.taskId ? pendingEvent : ev));
        }
        return prevEvents;
      });
    } else if (confirmAction === 'delete' && pendingEvent) {
      if (action === 'all' && pendingEvent.recurringOptions) {
        // Delete all instances of the recurring event by matching the base taskId
        const baseTaskId = pendingEvent.taskId.split('-')[0];
        setEvents(prevEvents => prevEvents.filter(ev => !ev.taskId.startsWith(baseTaskId)));
      } else if (action === 'single') {
        // Delete only this instance
        setEvents(prevEvents => prevEvents.filter(ev => ev.taskId !== pendingEvent.taskId));
      }
    }
    setEditModalOpen(false);
    setConfirmModalOpen(false);
    setPendingEvent(null);
  };

  const handleCancelConfirm = () => {
    setConfirmModalOpen(false);
    setPendingEvent(null);
  };

  const calendarEvents = useMemo(() => {
    return events.map(event => {
      const normalizedEvent = {
        ...event,
        taskId: event.taskId.toString(),
        title: event.title || 'Untitled',
        startTime: event.startTime || '00:00',
        endTime: event.endTime || event.startTime || '00:00',
        date: event.date || getLocalDateString(selectedDate),
        priority: event.priority || 'Medium',
        category: event.category || 'Work',
        recurring: event.recurring || false,
        metadata: event.metadata || { createdBy: 'CurrentUser', lastUpdated: new Date().toISOString() },
      };
      return {
        id: normalizedEvent.taskId,
        title: normalizedEvent.title,
        start: `${normalizedEvent.date}T${normalizedEvent.startTime}`,
        end: `${normalizedEvent.date}T${normalizedEvent.endTime}`,
        extendedProps: normalizedEvent,
      };
    });
  }, [events, selectedDate]);

  const categories = ['Work', 'Personal', 'School'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const eventClassNames = (eventInfo) => {
    const priority = eventInfo.event.extendedProps.priority || 'Medium';
    return [`priority-${priority.toLowerCase()}`];
  };

  return (
    <div className="calendar-view">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,timeGridDay'
        }}
        events={calendarEvents}
        editable={true}
        selectable={true}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        allDaySlot={false}
        snapDuration="00:15"
        eventClassNames={eventClassNames}
        height="100%"
      />

      {/* Create Event Modal */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Create New Event</div>
            <div className="input-row">
              <label>Title:</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Enter event title..."
              />
            </div>
            <div className="input-row">
              <label>Description:</label>
              <input
                type="text"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Enter description..."
              />
            </div>
            <div className="input-row">
              <label>Start Time:</label>
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>End Time:</label>
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>Category:</label>
              <select
                value={newEvent.category}
                onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="input-row">
              <label>Priority:</label>
              <select
                value={newEvent.priority}
                onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value })}
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
                checked={newEvent.recurring}
                onChange={(e) => handleRecurringChange(e.target.checked)}
              />
            </div>
            <div className="modal-buttons">
              <button className="save-btn" onClick={handleCreateEvent}>Save</button>
              <button className="cancel-btn" onClick={() => setCreateModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Delete Event Modal */}
      {editModalOpen && selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Edit Event</div>
            <div className="input-row">
              <label>Title:</label>
              <input
                type="text"
                value={selectedEvent.title}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>Description:</label>
              <input
                type="text"
                value={selectedEvent.description}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>Start Time:</label>
              <input
                type="time"
                value={selectedEvent.startTime}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, startTime: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>End Time:</label>
              <input
                type="time"
                value={selectedEvent.endTime}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, endTime: e.target.value })}
              />
            </div>
            <div className="input-row">
              <label>Category:</label>
              <select
                value={selectedEvent.category}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, category: e.target.value })}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="input-row">
              <label>Priority:</label>
              <select
                value={selectedEvent.priority}
                onChange={(e) => setSelectedEvent({ ...selectedEvent, priority: e.target.value })}
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
                checked={selectedEvent.recurring}
                onChange={(e) => handleRecurringChange(e.target.checked)}
              />
            </div>
            <div className="modal-buttons">
              <button className="save-btn" onClick={handleEditEvent}>Save</button>
              <button className="delete-btn" onClick={handleDeleteEvent}>Delete</button>
              <button className="cancel-btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Options Modal */}
      <RecurringOptionsModal
        isOpen={recurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        onSave={handleRecurringOptionsSave}
        recurringOptions={recurringOptions}
        setRecurringOptions={setRecurringOptions}
      />

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

export default CalendarView;