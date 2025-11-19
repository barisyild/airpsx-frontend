import { h } from "preact";
import "./TaskBar.css";

interface WindowInfo {
  id: string | number;
  icon: string;
  title: string;
}

interface TaskBarProps {
  windows: WindowInfo[];
  activeWindow: string | number | null;
  isDarkMode: boolean;
  onWindowClick: (id: string | number, isActive: boolean) => void;
  onThemeToggle: () => void;
}

const TaskBar = ({
  windows,
  activeWindow,
  isDarkMode,
  onWindowClick,
  onThemeToggle,
}: TaskBarProps) => {
  return (
    <div className={`taskbar ${isDarkMode ? "dark" : ""}`}>
      {" "}
      <div className="taskbar-windows">
        {" "}
        {windows.map((window) => (
          <button
            key={window.id}
            className={`taskbar-window-button ${
              activeWindow === window.id ? "active" : ""
            }`}
            onClick={() => onWindowClick(window.id, activeWindow === window.id)}
          >
            {" "}
            <span className="taskbar-window-icon icon">
              {window.icon}
            </span>{" "}
            <span className="taskbar-window-title">{window.title}</span>{" "}
          </button>
        ))}{" "}
      </div>{" "}
      <button className="taskbar-theme-toggle icon" onClick={onThemeToggle}>
        {" "}
        {isDarkMode ? "☀️" : "🌙"}{" "}
      </button>{" "}
    </div>
  );
};

export default TaskBar;

