import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import "./FileManager.css";
import IconService from "../../services/IconService";
import ApiService from "../../services/ApiService";
import ToastService from "../../services/ToastService.jsx";

const FileManager = ({ contextMenu, setContextMenu, isDarkMode = true }) => {
  // Let's put the path related states at the top
  const [currentPath, setCurrentPath] = useState('/');
  const [pathHistory, setPathHistory] = useState(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Other states
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectionBox, setSelectionBox] = useState({
    isSelecting: false,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isDragged, setIsDragged] = useState(false);
  const [lastClickTime, setLastClickTime] = useState({ id: null, time: 0 });
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingItemId, setRenamingItemId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  // Video player states
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  // Image viewer states
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [loadingImages, setLoadingImages] = useState(new Set());

  // Ref definition
  const fileManagerRef = useRef(null);

  // Load files
  const loadFiles = async (path) => {
    try {
      setLoading(true);
      setError(null);
      const files = await ApiService.listFiles(path);
      setItems(files);
    } catch (err) {
      console.error("Failed to load files:", err);
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  // Refresh files when path changes
  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  useEffect(() => {
    // Add all image items to loading state initially
    const imageItemIds = items
      .filter(item => isImageFile(item.name))
      .map(item => item.id);
    
    setLoadingImages(new Set(imageItemIds));
  }, [items]);

  const handlePathChange = (e) => {
    setCurrentPath(e.target.value);
  };

  const handlePathKeyDown = (e) => {
    if (e.key === 'Enter') {
      navigateToPath(currentPath);
    }
  };

  const navigateToPath = async (path) => {
    const normalizedPath = path.endsWith('/') ? path : path + '/';
    
    // Clear context menu
    setContextMenu({ ...contextMenu, show: false });
    
    if (normalizedPath !== pathHistory[historyIndex]) {
      const newHistory = pathHistory.slice(0, historyIndex + 1);
      setPathHistory([...newHistory, normalizedPath]);
      setHistoryIndex(newHistory.length);
    }
    
    setCurrentPath(normalizedPath);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(pathHistory[historyIndex - 1]);
    }
  };

  const handleForward = () => {
    if (historyIndex < pathHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(pathHistory[historyIndex + 1]);
    }
  };

  const handleParentDirectory = () => {
    const parentPath = currentPath.split('/').slice(0, -2).join('/') + '/';
    if (parentPath !== currentPath) {
      navigateToPath(parentPath);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fileManagerRef.current?.contains(document.activeElement) ||
          document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          setFocusedItemIndex(prev => {
            const nextIndex = e.shiftKey 
              ? (prev <= 0 ? items.length - 1 : prev - 1)
              : (prev >= items.length - 1 ? 0 : prev + 1);
            
            setSelectedItems(new Set([items[nextIndex].id]));
            
            const fileItem = fileManagerRef.current.querySelector(
              `[data-id="${items[nextIndex].id}"]`
            );
            fileItem?.scrollIntoView({ block: 'nearest' });
            
            return nextIndex;
          });
          break;

        case 'Enter':
          if (focusedItemIndex >= 0) {
            const item = items[focusedItemIndex];
            handleDoubleClick(item);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedItemIndex]);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (selectionBox.isSelecting) {
        const rect = fileManagerRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        x = Math.max(0, Math.min(x, rect.width));
        y = Math.max(0, Math.min(y, rect.height));

        setSelectionBox((prev) => ({
          ...prev,
          end: { x, y },
        }));

        updateSelection(x, y, e.ctrlKey);
      }
    };

    const handleGlobalMouseUp = () => {
      if (selectionBox.isSelecting) {
        setSelectionBox((prev) => ({ ...prev, isSelecting: false }));
      }
    };

    if (selectionBox.isSelecting) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [selectionBox.isSelecting]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.context-menu')) {
      return;
    }

    e.preventDefault();

    if (e.target.closest(".file-item")) {
      return;
    }

    if (
      e.target.classList.contains("file-grid") &&
      e.clientX >= e.target.getBoundingClientRect().right - 20
    ) {
      return;
    }

    setContextMenu({ ...contextMenu, show: false });

    if (e.button === 0) { // Left click
      const rect = fileManagerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setSelectionBox({
        isSelecting: true,
        start: { x, y },
        end: { x, y },
      });

      if (!e.ctrlKey && !e.target.closest(".file-item")) {
        setSelectedItems(new Set());
      }

      setIsDragged(false);
    }
  };

  const updateSelection = (currentX, currentY, isCtrlKey) => {
    const rect = fileManagerRef.current.getBoundingClientRect();

    currentX = Math.max(0, Math.min(currentX, rect.width));
    currentY = Math.max(0, Math.min(currentY, rect.height));

    const selectionRect = {
      left: Math.min(selectionBox.start.x, currentX),
      right: Math.max(selectionBox.start.x, currentX),
      top: Math.min(selectionBox.start.y, currentY),
      bottom: Math.max(selectionBox.start.y, currentY),
    };

    const fileItems = fileManagerRef.current.getElementsByClassName("file-item");
    const newSelectedItems = new Set(isCtrlKey ? selectedItems : []);

    Array.from(fileItems).forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const fileRect = {
        left: itemRect.left - rect.left,
        right: itemRect.right - rect.left,
        top: itemRect.top - rect.top,
        bottom: itemRect.bottom - rect.top,
      };

      if (
        !(
          fileRect.right < selectionRect.left ||
          fileRect.left > selectionRect.right ||
          fileRect.bottom < selectionRect.top ||
          fileRect.top > selectionRect.bottom
        )
      ) {
        const itemId = item.getAttribute('data-id');
        if (itemId) {
          newSelectedItems.add(itemId);
        }
      }
    });

    setSelectedItems(newSelectedItems);
  };

  const handleMouseUp = (e) => {
    if (selectionBox.isSelecting) {
      const rect = fileManagerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const width = Math.abs(selectionBox.end.x - selectionBox.start.x);
      const height = Math.abs(selectionBox.end.y - selectionBox.start.y);

      if (width >= 5 || height >= 5) {
        updateSelection(x, y, e.ctrlKey);
      }
    }
    setSelectionBox((prev) => ({ ...prev, isSelecting: false }));
    setTimeout(() => setIsDragged(false), 0);
  };

  const handleItemClick = (e, item) => {
    e.stopPropagation();

    if (!isDragged) {
      const currentTime = new Date().getTime();

      if (
        lastClickTime.id === item.id &&
        currentTime - lastClickTime.time < 300
      ) {
        handleDoubleClick(item);
        setLastClickTime({ id: null, time: 0 });
        return;
      }

      setLastClickTime({ id: item.id, time: currentTime });

      // Clear context menu
      setContextMenu({ ...contextMenu, show: false });

      if (e.ctrlKey || e.metaKey) {
        const newSelectedItems = new Set(selectedItems);
        if (selectedItems.has(item.id)) {
          newSelectedItems.delete(item.id);
        } else {
          newSelectedItems.add(item.id);
        }
        setSelectedItems(newSelectedItems);
      } 
      else if (e.shiftKey && selectedItems.size > 0) {
        const lastSelectedId = Array.from(selectedItems)[selectedItems.size - 1];
        const lastIndex = items.findIndex(i => i.id === lastSelectedId);
        const currentIndex = items.findIndex(i => i.id === item.id);
        
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        const newSelectedItems = new Set(selectedItems);
        for (let i = start; i <= end; i++) {
          newSelectedItems.add(items[i].id);
        }
        setSelectedItems(newSelectedItems);
      }
      else {
        setSelectedItems(new Set([item.id]));
      }
    }
  };

  const handleDoubleClick = (item) => {
    if (item.isDirectory) {
      // Clear context menu
      setContextMenu({ ...contextMenu, show: false });
      
      // Go to new directory
      const newPath = currentPath + item.name + '/';
      navigateToPath(newPath);
    } else {
      // Check if this is a video or audio file
      const isMediaFile = isAudioVideoFile(item.name);
      if (isMediaFile) {
        openMediaPlayer(item);
      } else if (isImageFile(item.name)) {
        openImageViewer(item);
      } else {
        console.log("Open File:", item.name);
      }
    }
  };

  // Ses dosyası mı kontrol eder
  const isAudioFile = (fileName) => {
    if (!fileName) return false;
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
    const lowerCaseFileName = fileName.toLowerCase();
    return audioExtensions.some(ext => lowerCaseFileName.endsWith(ext));
  };

  // Video dosyası mı kontrol eder
  const isVideoFile = (fileName) => {
    if (!fileName) return false;
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.mpg', '.mpeg', '.m4v'];
    const lowerCaseFileName = fileName.toLowerCase();
    return videoExtensions.some(ext => lowerCaseFileName.endsWith(ext));
  };

  // Resim dosyası mı kontrol eder
  const isImageFile = (fileName) => {
    if (!fileName) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
    const lowerCaseFileName = fileName.toLowerCase();
    return imageExtensions.some(ext => lowerCaseFileName.endsWith(ext));
  };

  const isAudioVideoFile = (fileName) => {
    return isAudioFile(fileName) || isVideoFile(fileName);
  };

  const openMediaPlayer = (item) => {
    setCurrentVideo(item);
    setVideoPlayerOpen(true);
  };

  const openImageViewer = (item) => {
    setCurrentImage(item);
    setImageViewerOpen(true);
  };

  const closeMediaPlayer = () => {
    setVideoPlayerOpen(false);
    setCurrentVideo(null);
  };

  const closeImageViewer = () => {
    setImageViewerOpen(false);
    setCurrentImage(null);
  };

  const downloadMedia = () => {
    if (currentVideo) {
      const filePath = currentPath + currentVideo.name;
      ApiService.downloadFiles([filePath]);
    }
  };

  const handleContextMenu = (e, item) => {
    if (!selectionBox.isSelecting) {
      e.preventDefault();

      if (!selectedItems.has(item.id)) {
        setSelectedItems(new Set([item.id]));
      }

      setContextMenu({
        show: true,
        x: e.pageX,
        y: e.pageY,
        item,
        isBackground: false,
      });
    }
  };

  const handleDownload = (item) => {
    // Create full paths to all selected files
    const selectedPaths = Array.from(selectedItems)
      .map(id => {
        const selectedItem = items.find(item => item.id === id);
        return currentPath + selectedItem.name;
      });

    // If there are no selected files, download only the clicked file
    const pathsToDownload = selectedPaths.length > 0 
      ? selectedPaths 
      : [currentPath + item.name];

    try {
      ApiService.downloadFiles(pathsToDownload);
    } catch (err) {
      console.error("Download failed:", err);
      // An error message can be shown here
    }

    setContextMenu({ ...contextMenu, show: false });
  };

  const handleDelete = (item) => {
    const itemsToDelete = Array.from(selectedItems).map(id => 
      items.find(item => item.id === id)
    );

    const fileList = itemsToDelete
      .map(item => `• ${item.name}`)
      .join('\n');

    const confirmMessage = itemsToDelete.length > 1
      ? `Are you sure you want to delete these ${itemsToDelete.length} items?\n\n${fileList}`
      : `Are you sure you want to delete "${item.name}"?`;

    if (window.confirm(confirmMessage)) {
      const newItems = items.filter(item => !selectedItems.has(item.id));
      setItems(newItems);
      setSelectedItems(new Set());
      console.log("Deleted items:", itemsToDelete.map(item => item.name));
    }

    setContextMenu({ ...contextMenu, show: false });
  };

  const handleBackgroundContextMenu = (e) => {
    e.preventDefault();
    if (
      e.target.classList.contains("file-manager") ||
      e.target.classList.contains("file-grid")
    ) {
      if (selectedItems.size > 0) {
        const firstSelectedItem = items.find(
          (item) => item.id === Array.from(selectedItems)[0]
        );
        setContextMenu({
          show: true,
          x: e.pageX,
          y: e.pageY,
          isBackground: false,
          item: firstSelectedItem,
        });
      } else {
        setContextMenu({
          show: true,
          x: e.pageX,
          y: e.pageY,
          isBackground: true,
          item: null,
        });
      }
    }
  };

  const createNewFolder = () => {
    const newId = Math.max(...items.map((item) => item.id)) + 1;
    const newFolder = {
      id: newId,
      name: "New Folder",
      type: "folder",
    };
    setItems([...items, newFolder]);
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    if (files.length > 0) {
      setUploadProgress(0);
      setUploadError(null);

      try {
        for (const file of files) {
          await ApiService.uploadFile(currentPath + file.name, file, (progress) => {
            setUploadProgress(progress);
          });
        }
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 3000);
        loadFiles(currentPath);
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadError(error.message);
      }
    }
  };

  const handleRename = (item) => {
    setRenamingItemId(item.id);
    setRenameValue(item.name);
    setIsRenaming(true);
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleRenameSubmit = async (item) => {
    try {
      if (renameValue && renameValue !== item.name) {
        await ApiService.renameFile(currentPath + item.name, renameValue);
        // Refresh file list
        loadFiles(currentPath);
      }
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setIsRenaming(false);
      setRenamingItemId(null);
    }
  };

  const handleExecutePayload = async (item) => {
    try {
      const response = await ApiService.executePayload(currentPath + item.name);
      if (response.success) {
        ToastService.success("Payload executed successfully");
      } else {
        ToastService.error(response.message || "Failed to execute payload");
      }
    } catch (err) {
      console.error("Execute payload failed:", err);
      ToastService.error("Network error while executing payload");
    }
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleInstallPackage = async (item) => {
    try {
      // Get all selected items
      const selectedFilePaths = Array.from(selectedItems)
        .map(id => {
          const selectedItem = items.find(item => item.id === id);
          return selectedItem;
        })
        .filter(item => item && item.name.toLowerCase().endsWith('.pkg'))
        .map(item => currentPath + item.name);

      // If no PKG files are in the selection, just install the right-clicked item
      if (selectedFilePaths.length === 0 && item.name.toLowerCase().endsWith('.pkg')) {
        selectedFilePaths.push(currentPath + item.name);
      }

      if (selectedFilePaths.length === 0) {
        ToastService.error("No PKG files selected for installation");
        return;
      }

      // Install each PKG file in sequence
      let installCount = 0;
      for (const packagePath of selectedFilePaths) {
        await ApiService.installPackageFromUrl(packagePath);
        installCount++;
      }

      if (installCount === 1) {
        ToastService.success("Package installation started");
      } else {
        ToastService.success(`Installation of ${installCount} packages started`);
      }
    } catch (err) {
      console.error("Package installation failed:", err);
      ToastService.error(err.message || "Failed to install package");
    }
    setContextMenu({ ...contextMenu, show: false });
  };

  return (
    <div
      ref={fileManagerRef}
      className={`file-manager ${isDarkMode ? "dark" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={handleBackgroundContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="path-navigation">
        <div className="path-buttons">
          <button 
            onClick={handleBack}
            disabled={historyIndex <= 0}
            title="Back"
          >
            ◀
          </button>
          <button 
            onClick={handleForward}
            disabled={historyIndex >= pathHistory.length - 1}
            title="Forward"
          >
            ▶
          </button>
          <button 
            onClick={handleParentDirectory}
            disabled={currentPath === '/'}
            title="Parent Directory"
          >
            ▲
          </button>
        </div>
        <input
          type="text"
          className="path-input"
          value={currentPath}
          onChange={handlePathChange}
          onKeyDown={handlePathKeyDown}
        />
      </div>
      <div
        className="file-grid"
        onScroll={() => {
          if (selectionBox.isSelecting) {
            setSelectionBox((prev) => ({ ...prev, isSelecting: false }));
          }
        }}
      >
        {loading ? (
          <div className="loading">Loading files...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : items.length === 0 ? (
          <div className="empty">No files found</div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              data-id={String(item.id)}
              className={`file-item ${selectedItems.has(item.id) ? "selected" : ""} ${
                index === focusedItemIndex ? "focused" : ""
              }`}
              tabIndex={0}
              onClick={(e) => handleItemClick(e, item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              onFocus={() => {
                setFocusedItemIndex(index);
                if (!selectedItems.has(item.id)) {
                  setSelectedItems(new Set([item.id]));
                }
              }}
            >
              <div className="file-icon icon">
                {isImageFile(item.name) ? (
                  <div className="image-thumbnail">
                    {loadingImages.has(item.id) && (
                      <div className="image-loading-spinner">
                        <div className="spinner"></div>
                      </div>
                    )}
                    <img 
                      src={ApiService.getStreamUrl(currentPath + item.name)} 
                      alt={item.name}
                      loading="lazy"
                      onLoad={() => {
                        setLoadingImages(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id);
                          return newSet;
                        });
                      }}
                      style={{ opacity: loadingImages.has(item.id) ? 0 : 1 }}
                      onError={() => {
                        setLoadingImages(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id);
                          return newSet;
                        });
                      }}
                    />
                  </div>
                ) : (
                  IconService.getFileIcon(item.type, item.name)
                )}
              </div>
              {isRenaming && renamingItemId === item.id ? (
                <input
                  type="text"
                  className="rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameSubmit(item);
                    } else if (e.key === 'Escape') {
                      setIsRenaming(false);
                      setRenamingItemId(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <div className="file-name">{item.name}</div>
              )}
            </div>
          ))
        )}
      </div>
      {uploadProgress !== null && (
        <div className="upload-progress">
          Uploading: {Math.round(uploadProgress)}%
          <div className="upload-progress-bar">
            <div
              className="upload-progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      {uploadError && (
        <div className="upload-error">
          {uploadError}
        </div>
      )}
      {selectionBox.isSelecting && (
        <div
          className="selection-box"
          style={{
            left: `${Math.min(selectionBox.start.x, selectionBox.end.x)}px`,
            top: `${Math.min(selectionBox.start.y, selectionBox.end.y)}px`,
            width: `${Math.abs(selectionBox.end.x - selectionBox.start.x)}px`,
            height: `${Math.abs(selectionBox.end.y - selectionBox.start.y)}px`,
          }}
        />
      )}
      {contextMenu.show && (
        <div
          className={`context-menu ${isDarkMode ? "dark" : ""}`}
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {(contextMenu.item.name.toLowerCase().endsWith('.pkg')) && (
              <>
                <div
                    className="context-menu-item install"
                    onClick={() => handleInstallPackage(contextMenu.item)}
                >
                  Install Package
                </div>
                <div className="context-menu-separator" />
              </>
          )}
          {(contextMenu.item.name.endsWith('.elf') || contextMenu.item.name.endsWith('.bin')) && (
              <>
                <div className="context-menu-separator" />
                <div
                    className="context-menu-item execute"
                    onClick={() => handleExecutePayload(contextMenu.item)}
                >
                  Execute Payload
                </div>
              </>
          )}
          {contextMenu.isBackground ? (
            <div className="context-menu-item create-folder" onClick={createNewFolder}>
              Create Folder
            </div>
          ) : (
            <>
              <div
                className="context-menu-item download"
                onClick={() => handleDownload(contextMenu.item)}
              >
                Download
              </div>
              <div
                className="context-menu-item rename"
                onClick={() => handleRename(contextMenu.item)}
              >
                Rename
              </div>
              <div className="context-menu-separator" />
              <div
                className="context-menu-item delete"
                onClick={() => handleDelete(contextMenu.item)}
              >
                Delete
              </div> 
            </>
          )}
        </div>
      )}
      {videoPlayerOpen && currentVideo && (
        <div className="video-player-overlay" onClick={closeMediaPlayer}>
          <div className="video-player-container" onClick={(e) => e.stopPropagation()}>
            <div className="video-player-header">
              <div className="video-title">{currentVideo.name}</div>
              <div className="video-controls">
                <button className="download-button" onClick={downloadMedia} title="Download">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button className="close-button" onClick={closeMediaPlayer}>✖</button>
              </div>
            </div>
            <div className="video-player-content">
              {isAudioFile(currentVideo.name) ? (
                <div className="audio-player-wrapper">
                  <div className="audio-visualization">
                    <div className="audio-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="3"></circle>
                        <line x1="12" y1="2" x2="12" y2="4"></line>
                        <line x1="12" y1="20" x2="12" y2="22"></line>
                        <line x1="4" y1="12" x2="2" y2="12"></line>
                        <line x1="22" y1="12" x2="20" y2="12"></line>
                        <line x1="6.34" y1="6.34" x2="4.93" y2="4.93"></line>
                        <line x1="19.07" y1="4.93" x2="17.66" y2="6.34"></line>
                        <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"></line>
                        <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"></line>
                      </svg>
                    </div>
                    <div className="audio-title-large">{currentVideo.name}</div>
                  </div>
                  <audio 
                    src={ApiService.getStreamUrl(currentPath + currentVideo.name)} 
                    controls 
                    autoPlay
                    className="audio-player-element"
                  />
                </div>
              ) : (
                <video 
                  src={ApiService.getStreamUrl(currentPath + currentVideo.name)} 
                  controls 
                  autoPlay
                />
              )}
            </div>
          </div>
        </div>
      )}
      {imageViewerOpen && currentImage && (
        <div className="image-viewer-overlay" onClick={closeImageViewer}>
          <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="image-viewer-header">
              <div className="image-title">{currentImage.name}</div>
              <div className="image-controls">
                <button className="download-button" onClick={() => handleDownload(currentImage)} title="Download">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button className="close-button" onClick={closeImageViewer}>✖</button>
              </div>
            </div>
            <div className="image-viewer-content">
              {currentImage && (
                <>
                  {imageViewerOpen && (
                    <div className="image-loading-spinner large">
                      <div className="spinner"></div>
                    </div>
                  )}
                  <img 
                    src={ApiService.getStreamUrl(currentPath + currentImage.name)} 
                    alt={currentImage.name}
                    className="image-viewer-img"
                    onLoad={(e) => {
                      // Hide spinner when image is loaded
                      const parent = e.target.parentNode;
                      const spinner = parent.querySelector('.image-loading-spinner');
                      if (spinner) spinner.style.display = 'none';
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;
