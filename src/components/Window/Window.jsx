import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import "./Window.css";
import IconService from "../../services/IconService";

const Window = ({
  window,
  children,
  isActive,
  isDarkMode,
  onClose,
  onFocus,
  onDragStart,
  onMinimize,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const windowRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = (e) => {
    if (
      e.target.closest(".window-header") &&
      !e.target.closest(".window-controls")
    ) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
      setIsDragging(true);
      onDragStart();
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      const touch = e.touches[0];
      const rect = windowRef.current.getBoundingClientRect();
      const desktopRect = document
        .querySelector(".desktop-content")
        .getBoundingClientRect();

      let x = touch.clientX - dragOffset.x;
      let y = touch.clientY - dragOffset.y;

      windowRef.current.style.left = `${x}px`;
      windowRef.current.style.top = `${y}px`;

      constrainWindow(rect, desktopRect);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleMouseDown = (e) => {
    if (
      e.target.closest(".window-header") &&
      !e.target.closest(".window-controls")
    ) {
      setIsDragging(true);
      onDragStart();
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    const rect = windowRef.current.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    });
  };

  const constrainWindow = (rect, desktopRect) => {
    let x = parseInt(windowRef.current.style.left);
    let y = parseInt(windowRef.current.style.top);
    let width = rect.width;
    let height = rect.height;

    if (width > desktopRect.width) {
      width = desktopRect.width;
      windowRef.current.style.width = `${width}px`;
    }

    if (height > desktopRect.height) {
      height = desktopRect.height;
      windowRef.current.style.height = `${height}px`;
    }

    x = Math.max(0, Math.min(x, desktopRect.width - width));
    y = Math.max(0, Math.min(y, desktopRect.height - height));

    windowRef.current.style.left = `${x}px`;
    windowRef.current.style.top = `${y}px`;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const rect = windowRef.current.getBoundingClientRect();
      const desktopRect = document
        .querySelector(".desktop-content")
        .getBoundingClientRect();

      if (isDragging) {
        let x = e.clientX - dragOffset.x;
        let y = e.clientY - dragOffset.y;

        windowRef.current.style.left = `${x}px`;
        windowRef.current.style.top = `${y}px`;

        constrainWindow(rect, desktopRect);
      } else if (isResizing) {
        let width = resizeStart.width + (e.clientX - resizeStart.x);
        let height = resizeStart.height + (e.clientY - resizeStart.y);

        width = Math.max(200, Math.min(width, desktopRect.width));
        height = Math.max(150, Math.min(height, desktopRect.height));

        windowRef.current.style.width = `${width}px`;
        windowRef.current.style.height = `${height}px`;

        constrainWindow(rect, desktopRect);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      const rect = windowRef.current?.getBoundingClientRect();
      const desktopRect = document
        .querySelector(".desktop-content")
        ?.getBoundingClientRect();

      if (rect && desktopRect) {
        constrainWindow(rect, desktopRect);
      }
    });

    // Observe desktop
    const desktopContent = document.querySelector(".desktop-content");
    if (desktopContent) {
      resizeObserver.observe(desktopContent);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={windowRef}
      data-window-id={window.id}
      className={`window ${isActive ? "active" : ""} ${
        isDarkMode ? "dark" : ""
      } 
 ${isResizing ? "resizing" : ""} ${isTouchDevice ? "touch-device" : ""} ${
        window.app === "PlayStation" ? "console" : ""
      }`}
      style={{
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        display: window.minimized ? "none" : "flex",
      }}
      onMouseDown={onFocus}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="window-header" onMouseDown={handleMouseDown}>
        <div className="window-title">
          <span className="window-icon icon">
            {window.icon}
          </span>
          <span className="window-title-text">{window.title}</span>
        </div>
        <div className="window-controls">
          {isTouchDevice ? (
            // Larger buttons for touch devices
            <>
              <button className="window-minimize touch" onClick={onMinimize}>
                −
              </button>
              <button className="window-close touch" onClick={onClose}>
                ×
              </button>
            </>
          ) : (
            <>
              <button className="window-minimize" onClick={onMinimize}>
                −
              </button>
              <button className="window-close" onClick={onClose}>
                ×
              </button>
            </>
          )}
        </div>
      </div>
      <div className="window-content">{children}</div>
      {!isTouchDevice && (
        <div
          className="window-resize"
          onMouseDown={handleResizeMouseDown}
        ></div>
      )}
    </div>
  );
};

export default Window;
