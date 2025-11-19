import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import Window from "../Window/Window";
import TaskBar from "../TaskBar/TaskBar";
import SystemMonitor from "../SystemStatus/SystemStatus";
import SystemDetails from "../SystemDetails/SystemDetails";
import ApiService from "../../services/ApiService";
import WindowConfig from "../../config/WindowConfig";
import "./Desktop.css";
import Disclaimer from "../Disclaimer/Disclaimer";

const isConsole = /PlayStation/i.test(navigator.userAgent);

interface DesktopItem {
  id: number;
  name: string;
  type: string;
  app: string;
  icon: string;
  url?: string;
}

interface WindowInstance {
  id: number | string;
  app: string;
  title: string;
  icon: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize: { width: number; height: number };
  minimized: boolean;
  props: Record<string, any>;
  customInstance?: boolean;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  item: DesktopItem | null;
  isBackground?: boolean;
}

interface LastClickTime {
  id: number | null;
  time: number;
  clickCount: number;
}

interface StorageInfo {
  name: string;
  path: string;
  used: number;
  total: number;
}

interface PkgUploadStatus {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

interface UrlInstallStatus {
  loading: boolean;
  error: string | null;
  success: boolean;
}

const Desktop = () => {
  const [desktopItems] = useState<DesktopItem[]>(WindowConfig.getDesktopItems());

  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindow, setActiveWindow] = useState<number | string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    item: null,
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true;
  });
  const [storage, setStorage] = useState<StorageInfo[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isStorageLoading, setIsStorageLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<string>("tr");
  const [lastClickTime, setLastClickTime] = useState<LastClickTime>({
    id: null,
    time: 0,
    clickCount: 0,
  });
  const [selectedIcons, setSelectedIcons] = useState<Set<number>>(new Set());
  const [selectedIconIndex, setSelectedIconIndex] = useState<number>(-1);
  const [showSystemDetails, setShowSystemDetails] = useState<boolean>(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(() => {
    return document.cookie.includes('disclaimerAccepted=true');
  });
  const [pkgUploadStatus, setPkgUploadStatus] = useState<PkgUploadStatus>({
    uploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [packageUrl, setPackageUrl] = useState<string>('');
  const [urlInstallStatus, setUrlInstallStatus] = useState<UrlInstallStatus>({
    loading: false,
    error: null,
    success: false
  });
  const dragTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const getStorageIcon = (name: string): string => {
    if (name.includes("USB")) return "💽";
    if (name.includes("Disc")) return "💿";
    return "💾";
  };

  const constrainWindowPosition = (
    position: { x: number; y: number },
    size: { width: number; height: number },
    desktopRect: DOMRect
  ) => {
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

  const openWindow = (app: string, customProps: Record<string, any> = {}, customTitle: string | null = null): number | string | void => {
    const config = WindowConfig.getConfig(app);
    if (!config) return;

    // If we received a custom window id, check for existing window with that id
    if (customProps.windowId && windows.some((w) => w.id === customProps.windowId)) {
      const existingWindow = windows.find((w) => w.id === customProps.windowId);
      if (existingWindow && existingWindow.minimized) {
        setWindows(
          windows.map((w) =>
            w.id === existingWindow.id
              ? { ...w, minimized: false }
              : w
          )
        );
      }
      if (existingWindow) {
        setActiveWindow(existingWindow.id);
      }
      return;
    }

    // If we don't have a custom window ID but the same type of window is already open
    if (!customProps.windowId && windows.some((w) => w.app === app && !w.customInstance)) {
      const existingWindow = windows.find((w) => w.app === app && !w.customInstance);
      if (existingWindow && existingWindow.minimized) {
        setWindows(
          windows.map((w) =>
            w.id === existingWindow.id
              ? { ...w, minimized: false }
              : w
          )
        );
      }
      if (existingWindow) {
        setActiveWindow(existingWindow.id);
      }
      return;
    }

    const desktopContent = document.querySelector(".desktop-content");
    const rect = desktopContent?.getBoundingClientRect();

    if (rect) {
      // Use customProps.windowId if provided, otherwise generate a new id
      const windowId = customProps.windowId || Date.now();
      
      const newWindow: WindowInstance = {
        id: windowId,
        app: app,
        title: customTitle || config.title,
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
        minimized: false,
        props: customProps,
        customInstance: !!customTitle // Mark if this is a custom instance
      };

      setWindows([...windows, newWindow]);
      setActiveWindow(newWindow.id);
      return windowId;
    }
  };

  const closeWindow = (id: number | string) => {
    setWindows(windows.filter((w) => w.id !== id));
    if (activeWindow === id) {
      setActiveWindow(null);
    }
  };

  const handleDragStart = () => {
    setContextMenu({ ...contextMenu, show: false });
  };

  const minimizeWindow = (id: number | string) => {
    setWindows(
      windows.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  };

  const handleDesktopContextMenu = (e: MouseEvent) => {
    e.preventDefault();

    // Block if the clicked location is storage-panel or its children
    if ((e.target as HTMLElement).closest(".storage-panel")) {
      return;
    }

    // Block if the clicked location is a window or its children
    if ((e.target as HTMLElement).closest(".window")) {
      return;
    }

    // Show context menu only for desktop-icons or desktop-item
    const clickedElement = e.target as HTMLElement;
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
            (isDesktopItem.querySelector(".desktop-item-name") as HTMLElement)?.textContent
        )
      : null;

    setContextMenu({
      show: true,
      x: e.pageX,
      y: e.pageY,
      item: item || null,
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
    const handleKeyDown = (e: KeyboardEvent) => {
      // If an input or textarea is in focus, handling keyboard events
      if (
        (document.activeElement as HTMLElement).tagName === "INPUT" ||
        (document.activeElement as HTMLElement).tagName === "TEXTAREA"
      ) {
        return;
      }

      // If there is an active window and it is not minimized
      const activeWindowElement = windows.find(w => w.id === activeWindow && !w.minimized);
      if (activeWindowElement) {
        // If an element in the active window is not in focus
        const activeWindowDom = document.querySelector(`[data-window-id="${activeWindow}"]`);
        if (activeWindowDom && !activeWindowDom.contains(document.activeElement)) {
          // Focus on the first focusable element in the window when Tab is pressed
          if (e.key === 'Tab') {
            e.preventDefault();
            const focusableElements = activeWindowDom.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
              (focusableElements[0] as HTMLElement).focus();
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

  const handleDesktopItemClick = (e: MouseEvent, item: DesktopItem) => {
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
  const handlePkgFileUpload = (file: File) => {
    if (file && file.name.toLowerCase().endsWith('.pkg')) {
      // If there's an active upload, stop it first
      if (pkgUploadStatus.uploading) {
        console.log('[Desktop] Stopping previous PKG upload...');
        ApiService.stopPkgUpload();
      }
      
      setPkgUploadStatus({
        uploading: true,
        progress: 0,
        error: null,
        success: false
      });
      
      ApiService.uploadPkg(
        file, 
        (progress) => {
          // Progress callback - chunk upload progress
          setPkgUploadStatus(prev => ({
            ...prev,
            progress: Math.min(progress, 100) // Ensure it doesn't exceed 100
          }));
        },
        (completeData) => {
          // Complete callback - upload fully completed
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
        }
      )
      .catch(error => {
        setPkgUploadStatus({
          uploading: false,
          progress: 0,
          error: error.message || 'An error occurred during upload',
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

  // Function to handle PKG upload cancellation
  const handleCancelUpload = async () => {
    try {
      const sessionKey = ApiService.getSessionKey();
      
      // Stop the upload queue first
      ApiService.stopPkgUpload();
      
      // Call the cancel API
      if (sessionKey) {
        await ApiService.cancelPkgUpload(sessionKey);
      }
      
      // Reset the upload status
      setPkgUploadStatus({
        uploading: false,
        progress: 0,
        error: null,
        success: false
      });
    } catch (error) {
      console.error('[Desktop] Failed to cancel upload:', error);
      setPkgUploadStatus({
        uploading: false,
        progress: 0,
        error: 'Upload cancelled',
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
    } catch (error: any) {
      setUrlInstallStatus({
        loading: false,
        error: error.message || 'Failed to install package from URL',
        success: false
      });
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handlePkgFileUpload(file);
    }
    // Reset file input so the same file can be selected again
    target.value = '';
  };

  return (
    <div
      className={`desktop ${isDarkMode ? "dark" : ""}`}
      onClick={(e) => {
        // Clear selection when clicked on empty field
        if (
          (e.target as HTMLElement).classList.contains("desktop-content") ||
          (e.target as HTMLElement).classList.contains("desktop-icons")
        ) {
          setSelectedIcons(new Set());
        }
        setContextMenu({ ...contextMenu, show: false });
      }}
      onContextMenu={handleDesktopContextMenu as any}
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
              onClick={(e) => handleDesktopItemClick(e as any, item)}
              tabIndex={0}
            >
              <div className="desktop-item-icon icon">
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
              className="refresh-button icon"
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
                <div className="storage-icon icon">{getStorageIcon(drive.name)}</div>
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
              (e.currentTarget as HTMLElement).classList.add('drag-over');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLElement).classList.remove('drag-over');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLElement).classList.remove('drag-over');
              
              const files = Array.from(e.dataTransfer!.files);
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
              onChange={handleFileInputChange as any}
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
                  <button 
                    className="cancel-upload-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelUpload();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : pkgUploadStatus.error ? (
                <div className="pkg-upload-error">
                  <div className="dropzone-icon icon">❌</div>
                  <div className="dropzone-text">{pkgUploadStatus.error}</div>
                </div>
              ) : pkgUploadStatus.success ? (
                <div className="pkg-upload-success">
                  <div className="dropzone-icon icon">✅</div>
                  <div className="dropzone-text">PKG file successfully uploaded!</div>
                </div>
              ) : (
                <>
                  <div className="dropzone-icon icon">📦</div>
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
        {windows.map((win) => {
          const Component = WindowConfig.getComponent(win.app);
          return (
            <Window
              key={win.id}
              window={win}
              isActive={activeWindow === win.id}
              isDarkMode={isDarkMode}
              onClose={() => closeWindow(win.id)}
              onFocus={() => setActiveWindow(win.id)}
              onDragStart={handleDragStart}
              onMinimize={() => minimizeWindow(win.id)}
            >
              {Component && (
                <Component
                  contextMenu={contextMenu}
                  setContextMenu={setContextMenu}
                  isDarkMode={isDarkMode}
                  storage={storage}
                  isStorageLoading={isStorageLoading}
                  storageError={storageError}
                  language={language}
                  onOpenWindow={(options: {app: string; title: string; props: Record<string, any>}) => {
                    // options: { app, title, props }
                    openWindow(options.app, options.props, options.title);
                  }}
                  {...win.props}
                />
              )}
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

          if (window && window.minimized) {
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

          if (!isActive && window && !window.minimized) {
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
                onChange={(e) => setPackageUrl((e.target as HTMLInputElement).value)}
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

