import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

const NotificationContext = createContext(null);

const TYPE_TO_VARIANT = {
  success: 'success',
  danger: 'danger',
  error: 'danger',
  warning: 'warning',
  info: 'info'
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const timers = useRef({});

  // Cleanup all timers on unmount
  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      Object.values(currentTimers).forEach(clearTimeout);
    };
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const addNotification = useCallback((config) => {
    const { type = 'info', title, message, duration = 4500 } = config;
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    if (duration !== Infinity) {
      timers.current[id] = setTimeout(() => removeNotification(id), duration);
    }
    return id;
  }, [removeNotification]);

  const contextValue = useMemo(() => ({
    notify: addNotification,
    notifySuccess: (message, options = {}) => addNotification({ type: 'success', message, ...options }),
    notifyError: (message, options = {}) => addNotification({ type: 'danger', message, ...options }),
    notifyWarning: (message, options = {}) => addNotification({ type: 'warning', message, ...options }),
    notifyInfo: (message, options = {}) => addNotification({ type: 'info', message, ...options }),
    dismiss: removeNotification
  }), [addNotification, removeNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div className="notification-stack position-fixed top-0 end-0 p-3" style={{ zIndex: 2100, maxWidth: '360px', width: '100%' }}>
        {notifications.map(({ id, type, title, message }) => (
          <div
            key={id}
            className={`alert alert-${TYPE_TO_VARIANT[type] || 'secondary'} shadow notification-card border-0 mb-3 d-flex align-items-start gap-2`}
            role="alert"
          >
            <div className="flex-grow-1">
              {title && <h6 className="alert-heading mb-1">{title}</h6>}
              <div className="small fw-semibold">{message}</div>
            </div>
            <button
              className="btn btn-sm btn-light border-0 rounded-circle p-1"
              onClick={() => removeNotification(id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
