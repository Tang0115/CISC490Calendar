// Tom coded this file
// Modal component for configuring recurring event options
// Handles frequency, interval, weekdays, and end date selection

import React, { useState, useEffect, useRef } from 'react';

function RecurringOptionsModal({ isOpen, onClose, onSave, recurringOptions: initialRecurringOptions }) {
  // State management for recurring options
  const [recurringOptions, setRecurringOptions] = useState({
    frequency: 'daily',
    weekDays: [],
    endDate: '',
    interval: 1,
    ...initialRecurringOptions
  });

  // Refs for modal focus management
  const modalRef = useRef(null);
  const firstFocusableElementRef = useRef(null);
  const lastFocusableElementRef = useRef(null);

  // Reset options when modal opens with new initial options
  useEffect(() => {
    if (isOpen) {
      setRecurringOptions({
        frequency: 'daily',
        weekDays: [],
        endDate: '',
        interval: 1,
        ...initialRecurringOptions
      });
    }
  }, [isOpen, initialRecurringOptions]);

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

  // Save and validation functions
  const handleSave = () => {
    // Validate required fields
    if (!recurringOptions.endDate) {
      alert('Please select an end date');
      return;
    }

    if (recurringOptions.frequency === 'weekly' && recurringOptions.weekDays.length === 0) {
      alert('Please select at least one day of the week');
      return;
    }

    // Ensure the interval is a valid number
    const interval = Math.max(1, parseInt(recurringOptions.interval) || 1);
    
    // Save with validated options
    onSave({
      ...recurringOptions,
      interval,
      weekDays: [...recurringOptions.weekDays].sort((a, b) => a - b) // Sort weekdays
    });
  };

  // Preview message generation
  const getPreviewMessage = () => {
    if (!recurringOptions.endDate) return 'Please select an end date to see the preview';
    
    const frequency = recurringOptions.frequency;
    const interval = recurringOptions.interval > 1 ? `every ${recurringOptions.interval} ${frequency}s` : `every ${frequency}`;
    
    // Sort weekdays in chronological order
    const sortedWeekDays = [...recurringOptions.weekDays].sort((a, b) => a - b);
    const weekDaysText = sortedWeekDays.length > 0 
      ? ` on ${sortedWeekDays.map(day => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]).join(', ')}`
      : '';
    
    // Parse the date components directly to avoid timezone issues
    const [year, month, day] = recurringOptions.endDate.split('-').map(Number);
    const endDate = new Date(year, month - 1, day); // month is 0-based in JavaScript Date
    const formattedEndDate = endDate.toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    return `This task will repeat ${interval}${weekDaysText} until ${formattedEndDate}`;
  };

  // Modal render
  if (!isOpen) return null;

  return (
    <div 
      className="recurring-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-modal-title"
      ref={modalRef}
    >
      <div className="recurring-modal-content">
        <h2 id="recurring-modal-title">Recurring Event Options</h2>
        <div className="input-row">
          <label htmlFor="frequency-select">Frequency:</label>
          <select
            id="frequency-select"
            value={recurringOptions.frequency}
            onChange={(e) => setRecurringOptions({ ...recurringOptions, frequency: e.target.value })}
            ref={firstFocusableElementRef}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {recurringOptions.frequency === 'weekly' && (
          <div className="input-row">
            <label>Days of Week:</label>
            <div className="weekday-selector">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <label key={day} className="weekday-checkbox">
                  <input
                    type="checkbox"
                    checked={recurringOptions.weekDays.includes(index)}
                    onChange={(e) => {
                      const newWeekDays = e.target.checked
                        ? [...recurringOptions.weekDays, index]
                        : recurringOptions.weekDays.filter(d => d !== index);
                      setRecurringOptions({ ...recurringOptions, weekDays: newWeekDays });
                    }}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="input-row">
          <label htmlFor="interval-input">Interval:</label>
          <input
            id="interval-input"
            type="number"
            min="1"
            value={recurringOptions.interval}
            onChange={(e) => setRecurringOptions({ 
              ...recurringOptions, 
              interval: Math.max(1, parseInt(e.target.value) || 1)
            })}
          />
          <span className="interval-label">
            {recurringOptions.frequency === 'daily' && 'days'}
            {recurringOptions.frequency === 'weekly' && 'weeks'}
            {recurringOptions.frequency === 'monthly' && 'months'}
            {recurringOptions.frequency === 'yearly' && 'years'}
          </span>
        </div>

        <div className="input-row">
          <label htmlFor="end-date-input">End Date:</label>
          <input
            id="end-date-input"
            type="date"
            value={recurringOptions.endDate}
            onChange={(e) => setRecurringOptions({ ...recurringOptions, endDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
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
            className="save-btn" 
            onClick={handleSave}
          >
            Save
          </button>
          <button 
            className="cancel-btn" 
            onClick={onClose}
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