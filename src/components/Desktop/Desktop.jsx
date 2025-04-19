import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import Window from "../Window/Window";
import TaskBar from "../TaskBar/TaskBar";
import SystemMonitor from "../SystemStatus/SystemStatus";
import IconService from "../../services/IconService";
import SystemDetails from "../SystemDetails/SystemDetails";
import ApiService from "../../services/ApiService";
import WindowConfig from "../../config/WindowConfig";
import "./Desktop.css";
import Disclaimer from "../Disclaimer/Disclaimer";

const isConsole = /PlayStation/i.test(navigator.userAgent);

const Desktop = () => {
  const [desktopItems] = useState(WindowConfig.getDesktopItems());

  const [windows, setWindows] = useState([]);
  const [activeWindow, setActiveWindow] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    item: null,
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });
  const [storage, setStorage] = useState([]);
  const [storageError, setStorageError] = useState(null);
  const [isStorageLoading, setIsStorageLoading] = useState(true);
  const [language, setLanguage] = useState("tr");
  const [lastClickTime, setLastClickTime] = useState({
    id: null,
    time: 0,
    clickCount: 0,
  });
  const [selectedIcons, setSelectedIcons] = useState(new Set());
  const [selectedIconIndex, setSelectedIconIndex] = useState(-1);
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => {
    return document.cookie.includes('disclaimerAccepted=true');
  });
  const [pkgUploadStatus, setPkgUploadStatus] = useState({
    uploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [packageUrl, setPackageUrl] = useState('');
  const [urlInstallStatus, setUrlInstallStatus] = useState({
    loading: false,
    error: null,
    success: false
  });
  const dragTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const fetchStorage = async () => {
    try {
      const data = await ApiService.getStorageInfo();
      setStorage(data);
      setStorageError(null);
    } catch (error) {
      console.error("Storage bilgisi alınamadı:", error);
      setStorageError("Failed to load storage information");
    } finally {
      setIsStorageLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
    const interval = setInterval(fetchStorage, 30000); // Her 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const getStorageIcon = (name) => {
    if (name.includes("USB")) return "💽";
    if (name.includes("Disc")) return "💿";
    return "💾";
  };

  const constrainWindowPosition = (position, size, desktopRect) => {
    let { x, y } = position;
    const { width, height } = size;

    // Limit the size of a window if it is larger than the desktop
    const constrainedSize = {
      width: Math.min(width, desktopRect.width),
      height: Math.min(height, desktopRect.height),
    };

    // Limit location
    x = Math.max(0, Math.min(x, desktopRect.width - constrainedSize.width));
    y = Math.max(0, Math.min(y, desktopRect.height - constrainedSize.height));

    return {
      position: { x, y },
      size: constrainedSize,
    };
  };

  const openWindow = (app) => {
    const config = WindowConfig.getConfig(app);
    if (!config) return;

    // If the same type of window is already open
    if (windows.some((w) => w.app === app)) {
      const existingWindow = windows.find((w) => w.app === app);
      if (existingWindow.minimized) {
        setWindows(
          windows.map((w) =>
            w.id === existingWindow.id
              ? { ...w, minimized: false }
              : w
          )
        );
      }
      setActiveWindow(existingWindow.id);
      return;
    }

    const desktopContent = document.querySelector(".desktop-content");
    const rect = desktopContent?.getBoundingClientRect();

    if (rect) {
      const newWindow = {
        id: Date.now(),
        app: app,
        title: config.title,
        icon: config.icon,
        position: {
          x: 50 + (windows.length * 20),
          y: 50 + (windows.length * 20)
        },
        size: {
          width: config.defaultWidth,
          height: config.defaultHeight
        },
        minSize: {
          width: config.minWidth,
          height: config.minHeight
        },
        minimized: false
      };

      setWindows([...windows, newWindow]);
      setActiveWindow(newWindow.id);
    }
  };

  const closeWindow = (id) => {
    setWindows(windows.filter((w) => w.id !== id));
    if (activeWindow === id) {
      setActiveWindow(null);
    }
  };

  const handleDragStart = () => {
    setContextMenu({ ...contextMenu, show: false });
  };

  const minimizeWindow = (id) => {
    setWindows(
      windows.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  };

  const handleDesktopContextMenu = (e) => {
    e.preventDefault();

    // Block if the clicked location is storage-panel or its children
    if (e.target.closest(".storage-panel")) {
      return;
    }

    // Block if the clicked location is a window or its children
    if (e.target.closest(".window")) {
      return;
    }

    // Show context menu only for desktop-icons or desktop-item
    const clickedElement = e.target;
    const isDesktopIcons = clickedElement.classList.contains("desktop-icons");
    const isDesktopItem = clickedElement.closest(".desktop-item");

    // Eğer desktop-icons veya desktop-item değilse, return
    if (!isDesktopIcons && !isDesktopItem) {
      return;
    }

    const item = isDesktopItem
      ? desktopItems.find(
          (item) =>
            item.name ===
            isDesktopItem.querySelector(".desktop-item-name").textContent
        )
      : null;

    setContextMenu({
      show: true,
      x: e.pageX,
      y: e.pageY,
      item,
      isBackground: !isDesktopItem,
    });
  };

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // If an input or textarea is in focus, handling keyboard events
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      ) {
        return;
      }

      // If there is an active window and it is not minimized
      const activeWindowElement = windows.find(w => w.id === activeWindow && !w.minimized);
      if (activeWindowElement) {
        // If an element in the active window is not in focus
        const activeWindowDom = document.querySelector(`[data-window-id="${activeWindow}"]`);
        if (!activeWindowDom?.contains(document.activeElement)) {
          // Focus on the first focusable element in the window when Tab is pressed
          if (e.key === 'Tab') {
            e.preventDefault();
            const focusableElements = activeWindowDom.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
              focusableElements[0].focus();
            }
          }
        }
        return; // Handling desktop keyboard events if there is an active window
      }

      // Desktop keyboard navigation - only works when there are no windows
      if (!desktopItems.length) return;

      const numColumns = Math.floor((window.innerHeight - 60) / 120);
      const currentColumn = Math.floor(selectedIconIndex / numColumns);

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (selectedIconIndex > -1) {
            const newIndex = selectedIconIndex - 1;
            if (newIndex >= 0) {
              setSelectedIconIndex(newIndex);
              setSelectedIcons(new Set([desktopItems[newIndex].id]));
            }
          } else {
            setSelectedIconIndex(0);
            setSelectedIcons(new Set([desktopItems[0].id]));
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (selectedIconIndex < desktopItems.length - 1) {
            const newIndex = selectedIconIndex + 1;
            setSelectedIconIndex(newIndex);
            setSelectedIcons(new Set([desktopItems[newIndex].id]));
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (currentColumn > 0) {
            const newIndex = selectedIconIndex - numColumns;
            if (newIndex >= 0) {
              setSelectedIconIndex(newIndex);
              setSelectedIcons(new Set([desktopItems[newIndex].id]));
            }
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (currentColumn < Math.ceil(desktopItems.length / numColumns) - 1) {
            const newIndex = selectedIconIndex + numColumns;
            if (newIndex < desktopItems.length) {
              setSelectedIconIndex(newIndex);
              setSelectedIcons(new Set([desktopItems[newIndex].id]));
            }
          }
          break;

        case "Enter":
          e.preventDefault();
          if (
            selectedIconIndex > -1 &&
            !windows.some((w) => w.app === desktopItems[selectedIconIndex].app)
          ) {
            const selectedItem = desktopItems[selectedIconIndex];
            if (selectedItem.app === "systemInfo") {
              setShowSystemDetails(true);
            } else {
              openWindow(selectedItem.app);
            }
          }
          break;

        case "Escape":
          setSelectedIconIndex(-1);
          setSelectedIcons(new Set());
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIconIndex, desktopItems, windows, activeWindow]);

  const handleDesktopItemClick = (e, item) => {
    const index = desktopItems.findIndex((i) => i.id === item.id);
    setSelectedIconIndex(index);

    // Link special case
    if (item.type === "link") {
      window.open(item.url, '_blank');
      return;
    }

    // Exception for System Info
    if (item.app === "systemInfo") {
      setShowSystemDetails(true);
      return;
    }

    const currentTime = Date.now();

    // Double click control
    if (
      lastClickTime.id === item.id &&
      currentTime - lastClickTime.time < 500 &&
      lastClickTime.clickCount === 1
    ) {
      // Double click - open window
      openWindow(item.app);
      setLastClickTime({ id: null, time: 0, clickCount: 0 });
    } else {
      // One click - choice
      setLastClickTime({
        id: item.id,
        time: currentTime,
        clickCount: 1,
      });
      
      setSelectedIcons(new Set([item.id]));
    }
  };

  const handleAcceptDisclaimer = () => {
    // Set the cookie to be valid for 1 year
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `disclaimerAccepted=true; expires=${expiryDate.toUTCString()}; path=/`;
    setDisclaimerAccepted(true);
  };

  // Function to handle PKG file uploads
  const handlePkgFileUpload = (file) => {
    if (file && file.name.toLowerCase().endsWith('.pkg')) {
      setPkgUploadStatus({
        uploading: true,
        progress: 0,
        error: null,
        success: false
      });
      
      ApiService.uploadPkg(file, (progress) => {
        setPkgUploadStatus(prev => ({
          ...prev,
          progress
        }));
      })
      .then(response => {
        setPkgUploadStatus({
          uploading: false,
          progress: 100,
          error: null,
          success: true
        });
        
        setTimeout(() => {
          setPkgUploadStatus({
            uploading: false,
            progress: 0,
            error: null,
            success: false
          });
        }, 3000);
      })
      .catch(error => {
        setPkgUploadStatus({
          uploading: false,
          progress: 0,
          error: error.message || 'An error occurred during installation\n',
          success: false
        });
      });
    } else {
      setPkgUploadStatus({
        uploading: false,
        progress: 0,
        error: 'Please select a valid .pkg file',
        success: false
      });
    }
  };

  // Handle package installation from URL
  const handleUrlInstall = async () => {
    if (!packageUrl.trim()) {
      setUrlInstallStatus({
        loading: false,
        error: 'Please enter a valid URL',
        success: false
      });
      return;
    }

    setUrlInstallStatus({
      loading: true,
      error: null,
      success: false
    });

    try {
      await ApiService.installPackageFromUrl(packageUrl);
      setUrlInstallStatus({
        loading: false,
        error: null,
        success: true
      });
      
      // Reset form after successful installation
      setTimeout(() => {
        setShowUrlModal(false);
        setPackageUrl('');
        setUrlInstallStatus({
          loading: false,
          error: null,
          success: false
        });
      }, 2000);
    } catch (error) {
      setUrlInstallStatus({
        loading: false,
        error: error.message || 'Failed to install package from URL',
        success: false
      });
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handlePkgFileUpload(file);
    }
    // Reset file input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div
      className={`desktop ${isDarkMode ? "dark" : ""}`}
      onClick={(e) => {
        // Clear selection when clicked on empty field
        if (
          e.target.classList.contains("desktop-content") ||
          e.target.classList.contains("desktop-icons")
        ) {
          setSelectedIcons(new Set());
        }
        setContextMenu({ ...contextMenu, show: false });
      }}
      onContextMenu={handleDesktopContextMenu}
    >
      {!disclaimerAccepted && (
        <Disclaimer 
          onAccept={handleAcceptDisclaimer}
          isDarkMode={isDarkMode}
        />
      )}
      <div className="desktop-content">
        <div className="desktop-icons">
          {desktopItems.map((item, index) => (
            <div
              key={item.id}
              className={`desktop-item ${
                selectedIcons.has(item.id) ? "selected" : ""
              }`}
              onClick={(e) => handleDesktopItemClick(e, item)}
              tabIndex={0}
            >
              <div className="desktop-item-icon">
                {item.icon}
              </div>
              <div className="desktop-item-name">{item.name}</div>
            </div>
          ))}
        </div>
        <div className={`storage-panel ${isDarkMode ? "dark" : ""}`}>
          <div className="storage-header">
            Storage
            <button
              className="refresh-button"
              onClick={fetchStorage}
              disabled={isStorageLoading}
            >
              🔄
            </button>
          </div>

          {isStorageLoading ? (
            <div className="storage-loading">Loading storage info...</div>
          ) : storageError ? (
            <div className="storage-error">{storageError}</div>
          ) : (
            storage.map((drive, index) => (
              <div key={drive.path} className="storage-item">
                <div className="storage-icon">{getStorageIcon(drive.name)}</div>
                <div className="storage-info">
                  <div className="storage-name">{drive.name}</div>
                  <div className="storage-usage">
                    <div className="storage-bar">
                      <div
                        className="storage-bar-fill"
                        style={{
                          width: `${(drive.used / drive.total) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="storage-text">
                      {ApiService.formatBytes(drive.used)} /{" "}
                      {ApiService.formatBytes(drive.total)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="storage-dropzone" 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.add('drag-over');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('drag-over');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('drag-over');
              
              const files = Array.from(e.dataTransfer.files);
              const pkgFile = files.find(file => file.name.toLowerCase().endsWith('.pkg'));
              
              if (pkgFile) {
                handlePkgFileUpload(pkgFile);
              } else {
                setPkgUploadStatus({
                  uploading: false,
                  progress: 0,
                  error: 'Please drag a valid .pkg file',
                  success: false
                });
              }
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".pkg"
              onChange={handleFileInputChange}
            />
            <div className="dropzone-content">
              {pkgUploadStatus.uploading ? (
                <div className="pkg-upload-progress">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${pkgUploadStatus.progress}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    Uploading: %{pkgUploadStatus.progress.toFixed(1)}
                  </div>
                </div>
              ) : pkgUploadStatus.error ? (
                <div className="pkg-upload-error">
                  <div className="dropzone-icon">❌</div>
                  <div className="dropzone-text">{pkgUploadStatus.error}</div>
                </div>
              ) : pkgUploadStatus.success ? (
                <div className="pkg-upload-success">
                  <div className="dropzone-icon">✅</div>
                  <div className="dropzone-text">PKG file successfully uploaded!</div>
                </div>
              ) : (
                <>
                  <div className="dropzone-icon">📦</div>
                  <div className="dropzone-text">
                    PKG Installer - Drag PKG file here
                  </div>
                  <button 
                    className="url-install-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the file input click
                      setShowUrlModal(true);
                    }}
                  >
                    Install from URL
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <SystemMonitor isDarkMode={isDarkMode} />
        <SystemDetails
          isDarkMode={isDarkMode}
          showPanel={showSystemDetails}
          onClose={() => setShowSystemDetails(false)}
        />
        {windows.map((window) => {
          const Component = WindowConfig.getComponent(window.app);
          return (
            <Window
              key={window.id}
              window={window}
              isActive={activeWindow === window.id}
              isDarkMode={isDarkMode}
              onClose={() => closeWindow(window.id)}
              onFocus={() => setActiveWindow(window.id)}
              onDragStart={handleDragStart}
              onMinimize={() => minimizeWindow(window.id)}
            >
              {Component && <Component isDarkMode={isDarkMode} contextMenu={contextMenu} setContextMenu={setContextMenu}/>}
            </Window>
          );
        })}
      </div>
      <TaskBar
        windows={windows}
        activeWindow={activeWindow}
        isDarkMode={isDarkMode}
        onWindowClick={(id, isActive) => {
          const window = windows.find((w) => w.id === id);

          if (window.minimized) {
            const desktopRect = document
              .querySelector(".desktop-content")
              ?.getBoundingClientRect();
            if (desktopRect) {
              const { position, size } = constrainWindowPosition(
                window.position,
                window.size,
                desktopRect
              );

              setWindows(
                windows.map((w) =>
                  w.id === id
                    ? {
                        ...w,
                        minimized: false,
                        position,
                        size,
                      }
                    : w
                )
              );
            } else {
              setWindows(
                windows.map((w) =>
                  w.id === id ? { ...w, minimized: false } : w
                )
              );
            }
          } else if (isActive) {
            // Minimize if already active
            setWindows(
              windows.map((w) => (w.id === id ? { ...w, minimized: true } : w))
            );
            setActiveWindow(null);
          }

          if (!isActive && !window.minimized) {
            setActiveWindow(id);
          }
        }}
        onThemeToggle={() => setIsDarkMode(!isDarkMode)}
      />
      
      {/* URL Install Modal */}
      {showUrlModal && (
        <div className={`url-modal-overlay ${isDarkMode ? "dark" : ""}`} onClick={() => setShowUrlModal(false)}>
          <div className={`url-modal ${isDarkMode ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="url-modal-header">
              <h3>Install Package from URL</h3>
              <button className="close-button" onClick={() => setShowUrlModal(false)}>×</button>
            </div>
            <div className="url-modal-content">
              <input
                type="text"
                className="url-input"
                placeholder="Enter package URL (e.g., http://example.com/game.pkg)"
                value={packageUrl}
                style={{width: "94%"}}
                onChange={(e) => setPackageUrl(e.target.value)}
                disabled={urlInstallStatus.loading}
              />
              {urlInstallStatus.error && (
                <div className="url-error-message">{urlInstallStatus.error}</div>
              )}
              {urlInstallStatus.success && (
                <div className="url-success-message">Package installation started successfully!</div>
              )}
            </div>
            <div className="url-modal-footer">
              <button 
                className="install-url-button"
                onClick={handleUrlInstall}
                disabled={urlInstallStatus.loading}
              >
                {urlInstallStatus.loading ? 'Installing...' : 'Install'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Desktop;
