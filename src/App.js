// Tom coded this file
// Main application component that handles routing and theme switching
// Manages the overall state of the calendar application

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import DayDetails from './components/DayDetails';
import CalendarView from './components/CalendarView';
import './App.css';

function App() {
  // State management for date, menu, theme, and events
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [view, setView] = useState('day');

  const [events, setEvents] = useState(() => {
    const savedTasks = localStorage.getItem('tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  // Theme toggle functionality
  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(events));
  }, [events]);

  // View switching logic
  const switchView = (newView) => {
    if (newView === 'day') {
      setSelectedDate(new Date()); // Reset to today when switching to Day View
    }
    setView(newView);
    setMenuOpen(false);
  };

  // Main render with routing and theme support
  return (
    <BrowserRouter>
      <div className={`app ${theme}`}>
        <header>
          <div className="header-left">
            <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
              ☰
            </button>
            <span className="current-time">{currentTime}</span>
          </div>
          <h1>My Calendar</h1>
          <div className="header-right">
            <div className="theme-switch-wrapper">
              <span className="theme-mode-label">Light</span>
              <label className="theme-switch">
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={handleThemeToggle}
                />
                <span className="slider"></span>
              </label>
              <span className="theme-mode-label">Dark</span>
            </div>
          </div>
          {menuOpen && (
            <div className="menu">
              <button
                className={view === 'day' ? 'active' : ''}
                onClick={() => switchView('day')}
              >
                Day View
              </button>
              <button
                className={view === 'calendar' ? 'active' : ''}
                onClick={() => switchView('calendar')}
              >
                Calendar View
              </button>
            </div>
          )}
        </header>
        <div className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                view === 'day' ? (
                  <DayDetails
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    events={events}
                    setEvents={setEvents}
                  />
                ) : (
                  <CalendarView
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    events={events}
                    setEvents={setEvents}
                  />
                )
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
