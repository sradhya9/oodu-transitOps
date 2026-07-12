import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <div className={`toast ${toast.type}`}>
      <span>{toast.message}</span>
      <button className="toast-close" onClick={() => removeToast(toast.id)}>&times;</button>
    </div>
  );
};

export default Toast;
