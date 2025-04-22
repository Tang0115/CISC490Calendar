import React, { useState, useEffect, useRef } from 'react';

function RecurringOptionsModal({ isOpen, onClose, onSave, recurringOptions: initialRecurringOptions }) {
  const [recurringOptions, setRecurringOptions] = useState(initialRecurringOptions);
  const modalRef = useRef(null);
  const firstFocusableElementRef = useRef(null);
  const lastFocusableElementRef = useRef(null);

  useEffect(() => {
    setRecurringOptions(initialRecurringOptions);
  }, [initialRecurringOptions]);

  useEffect(() => {
    if (isOpen) {
      // Focus the first element when modal opens
      firstFocusableElementRef.current?.focus();
      
      // Add keyboard event listener for modal
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusableElementRef.current) {
              e.preventDefault();
              lastFocusableElementRef.current?.focus();
            }
          } else {
            if (document.activeElement === lastFocusableElementRef.current) {
              e.preventDefault();
              firstFocusableElementRef.current?.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleSave = () => {
    onSave(recurringOptions);
    onClose();
  };

  const getPreviewMessage = () => {
    if (!recurringOptions.endDate) return '';
    
    const frequency = recurringOptions.frequency;
    const interval = recurringOptions.interval > 1 ? `every ${recurringOptions.interval} ${frequency}s` : `every ${frequency}`;
    
    // Sort weekdays in chronological order
    const sortedWeekDays = [...recurringOptions.weekDays].sort((a, b) => a - b);
    const weekDaysText = sortedWeekDays.length > 0 
      ? ` on ${sortedWeekDays.map(day => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]).join(', ')}`
      : '';
    
    const endDate = new Date(recurringOptions.endDate).toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    return `This task will repeat ${interval}${weekDaysText} until ${endDate}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
    >
      <div className="modal-content">
        <h2 id="modal-title">Recurring Options</h2>
        <div className="input-row">
          <label htmlFor="frequency-select">Frequency:</label>
          <select
            id="frequency-select"
            value={recurringOptions.frequency}
            onChange={(e) => setRecurringOptions({ ...recurringOptions, frequency: e.target.value })}
            aria-label="Select frequency of recurrence"
            ref={firstFocusableElementRef}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        {recurringOptions.frequency === 'weekly' && (
          <div 
            className="weekday-checkboxes"
            role="group"
            aria-labelledby="weekday-label"
          >
            <span id="weekday-label" className="visually-hidden">Select days of the week</span>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={recurringOptions.weekDays.includes(index)}
                  onChange={(e) => {
                    const newWeekDays = e.target.checked
                      ? [...recurringOptions.weekDays, index]
                      : recurringOptions.weekDays.filter(d => d !== index);
                    setRecurringOptions({ ...recurringOptions, weekDays: newWeekDays });
                  }}
                  aria-label={`${day} checkbox`}
                />
                {day}
              </label>
            ))}
          </div>
        )}
        <div className="input-row">
          <label htmlFor="interval-input">Interval:</label>
          <input
            id="interval-input"
            type="number"
            min="1"
            value={recurringOptions.interval}
            onChange={(e) => setRecurringOptions({ ...recurringOptions, interval: parseInt(e.target.value) })}
            aria-label="Enter interval number"
          />
          <span className="interval-text">
            {recurringOptions.interval > 1 ? `${recurringOptions.frequency}s` : recurringOptions.frequency}
          </span>
        </div>
        <div className="input-row">
          <label htmlFor="end-date-input">End Date:</label>
          <input
            id="end-date-input"
            type="date"
            value={recurringOptions.endDate}
            onChange={(e) => setRecurringOptions({ ...recurringOptions, endDate: e.target.value })}
            aria-label="Select end date"
          />
        </div>
        <div 
          className="preview-message"
          role="status"
          aria-live="polite"
        >
          {getPreviewMessage()}
        </div>
        <div className="modal-buttons">
          <button 
            onClick={handleSave}
            aria-label="Save recurring options"
          >
            Save
          </button>
          <button 
            onClick={onClose}
            aria-label="Cancel and close modal"
            ref={lastFocusableElementRef}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecurringOptionsModal; 