import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const COLORS = {
  success: 'var(--tl)',
  error: 'var(--rd)',
  info: 'var(--am)',
  warn: 'var(--am)',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toastwrap">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{ borderLeft: `3px solid ${COLORS[t.type]}` }}
          >
            <span style={{ fontSize: 13 }}>{t.msg}</span>
            <div className="tpb" style={{ background: COLORS[t.type] }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
