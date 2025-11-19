import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import "./Toast.css";

interface ToastProps {
  message: string;
  type?: "info" | "success" | "error" | "warning";
  duration?: number;
  onClose?: () => void;
}

const Toast = ({ message, type = "info", duration = 3000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose && onClose();
      }, 300); // Animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast ${type} ${isVisible ? "visible" : "hidden"}`}>
      <div className="toast-icon">
        {type === "success" && "✓"}
        {type === "error" && "✗"}
        {type === "warning" && "⚠"}
        {type === "info" && "ℹ"}
      </div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={() => setIsVisible(false)}>
        ×
      </button>
    </div>
  );
};

export default Toast;

