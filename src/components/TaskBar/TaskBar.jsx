import { h } from "preact";
import "./TaskBar.css";
import IconService from "../../services/IconService";
const TaskBar = ({
  windows,
  activeWindow,
  isDarkMode,
  onWindowClick,
  onThemeToggle,
}) => {
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
            <span className="taskbar-window-icon">
              {window.icon}
            </span>{" "}
            <span className="taskbar-window-title">{window.title}</span>{" "}
          </button>
        ))}{" "}
      </div>{" "}
      <button className="taskbar-theme-toggle" onClick={onThemeToggle}>
        {" "}
        {isDarkMode ? "☀️" : "🌙"}{" "}
      </button>{" "}
    </div>
  );
};
export default TaskBar;