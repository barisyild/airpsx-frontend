import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import ApiService from "../../services/ApiService";
import ToastService from "../../services/ToastService";
import "./MediaGallery.css";

const MediaGallery = ({ isDarkMode }) => {
  const [media, setMedia] = useState([]);
  const [titles, setTitles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ApiService.getMediaList();
      const entries = data.entries.map(entry => {
        const isVideo = entry.filePath.toLowerCase().endsWith('.mp4');
        const isJxr = isJxrFormat(entry.filePath);
        const hasTrophy = entry.ext && entry.ext.trophy;
        const titleId = entry.meta && entry.meta.appVerTitleId;
        
        // Extract duration if available
        let duration = null;
        if (entry.meta && entry.meta.segmentInfo && 
            entry.meta.segmentInfo.mediaTime && 
            entry.meta.segmentInfo.mediaTime.length > 0 && 
            entry.meta.segmentInfo.mediaTime[0].length > 1) {
          duration = entry.meta.segmentInfo.mediaTime[0][1];
        }
        
        return {
          ...entry,
          isVideo,
          isJxr,
          hasTrophy,
          titleId,
          duration,
          date: entry.meta && entry.meta.segmentInfo ? 
                new Date(entry.meta.segmentInfo.start) : 
                new Date(0)
        };
      });
      
      setMedia(entries);
      setTitles(data.titles || {});
    } catch (error) {
      console.error("Failed to load media list:", error);
      setError("Failed to load media list");
      ToastService.error("Failed to load media list");
    } finally {
      setLoading(false);
    }
  };

  // Function to check if an image is in JXR format
  const isJxrFormat = (filePath) => {
    if (!filePath) return false;
    const path = filePath.toLowerCase();
    return path.endsWith('.jxr') || path.endsWith('.wdp') || path.endsWith('.hdp');
  };

  const downloadMedia = (mediaItem) => {
    try {
      const url = ApiService.getMediaUrl(mediaItem.filePath + "?download=true");
      const a = document.createElement('a');
      a.href = url;
      a.download = mediaItem.filePath.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      ToastService.success("Download started");
    } catch (error) {
      console.error("Download failed:", error);
      ToastService.error("Download failed");
    }
  };

  const openViewer = (mediaItem) => {
    setSelectedMedia(mediaItem);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setSelectedMedia(null);
  };

  const getGameTitle = (titleId) => {
    if (!titleId) return "Unknown";
    return titles[titleId] || "Deleted Games and Apps";
  };

  const getFilteredMedia = () => {
    let filtered = [...media];
    
    // Apply type filter
    if (filter === "images") {
      filtered = filtered.filter(item => !item.isVideo);
    } else if (filter === "videos") {
      filtered = filtered.filter(item => item.isVideo);
    } else if (filter === "trophies") {
      filtered = filtered.filter(item => item.hasTrophy);
    }
    
    // Apply game filter
    if (gameFilter !== "all") {
      filtered = filtered.filter(item => item.titleId === gameFilter);
    }
    
    // Apply sorting
    if (sort === "date-desc") {
      filtered.sort((a, b) => b.date - a.date);
    } else if (sort === "date-asc") {
      filtered.sort((a, b) => a.date - b.date);
    }
    
    return filtered;
  };

  const getGamesList = () => {
    const games = new Set();
    media.forEach(item => {
      if (item.titleId) {
        games.add(item.titleId);
      }
    });
    return Array.from(games);
  };

  const filteredMedia = getFilteredMedia();
  const gamesList = getGamesList();

  const formatDuration = (duration) => {
    if (!duration) return "";
    
    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`media-gallery ${isDarkMode ? "dark" : ""}`}>
      <div className="media-toolbar">
        <div className="filter-group">
          <label>Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Media</option>
            <option value="images">Images Only</option>
            <option value="videos">Videos Only</option>
            <option value="trophies">Trophy Media</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Game:</label>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Games</option>
            {gamesList.map((titleId) => (
              <option key={titleId} value={titleId}>
                {getGameTitle(titleId)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort:</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="filter-select"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
          </select>
        </div>

        <button className="refresh-button" onClick={loadMedia} disabled={loading}>
          🔄
        </button>
      </div>

      <div className="media-content">
        {loading ? (
          <div className="media-loading">Loading media...</div>
        ) : error ? (
          <div className="media-error">{error}</div>
        ) : filteredMedia.length === 0 ? (
          <div className="media-empty">No media found</div>
        ) : (
          <div className="media-grid">
            {filteredMedia.map((item, index) => (
              <div key={index} className="media-item" onClick={() => openViewer(item)}>
                <div className="media-thumbnail">
                  {item.isVideo && <div className="video-indicator">▶</div>}
                  {item.isJxr ? (
                    <div className="jxr-thumbnail">
                      <div className="jxr-thumbnail-content">
                        <div className="jxr-thumbnail-icon">HDR</div>
                        <div className="jxr-thumbnail-text">HDR Content</div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={ApiService.getMediaThumbnailUrl(item.filePath)}
                      alt="Media thumbnail"
                      loading="lazy"
                    />
                  )}
                  {item.hasTrophy && (
                    <div className="trophy-badge" title="Trophy Earned">
                      🏆
                    </div>
                  )}
                </div>
                <div className="media-info">
                  <div className="media-title" title={getGameTitle(item.titleId)}>
                    {getGameTitle(item.titleId)}
                  </div>
                  <div className="media-details">
                    <div className="media-date">
                      {item.date.toLocaleDateString()}
                    </div>
                    {item.isVideo && item.duration && (
                      <div className="media-duration">
                        {formatDuration(item.duration)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerOpen && selectedMedia && (
        <div className="media-viewer-overlay" onClick={closeViewer}>
          <div className="media-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <div className="viewer-title">
                {getGameTitle(selectedMedia.titleId)}
                {selectedMedia.hasTrophy && (
                  <span className="viewer-trophy">🏆</span>
                )}
                {selectedMedia.isJxr && (
                  <span className="viewer-hdr">HDR</span>
                )}
              </div>
              <div className="viewer-actions">
                <button
                  className="download-button"
                  onClick={() => downloadMedia(selectedMedia)}
                  title="Download"
                >
                  ⬇️
                </button>
                <button className="close-button" onClick={closeViewer} title="Close">
                  ✖
                </button>
              </div>
            </div>
            <div className="viewer-content">
              {selectedMedia.isVideo ? (
                <video
                  src={ApiService.getMediaUrl(selectedMedia.filePath)}
                  controls
                  autoPlay
                />
              ) : selectedMedia.isJxr ? (
                <div className="hdr-content-container">
                  <div className="hdr-content-message">
                    <div className="hdr-icon">HDR</div>
                    <div className="hdr-text">HDR Content cannot be previewed.</div>
                  </div>
                </div>
              ) : (
                <img
                  src={ApiService.getMediaUrl(selectedMedia.filePath)}
                  alt="Media content"
                />
              )}
            </div>
            <div className="viewer-footer">
              <div className="media-date">
                {selectedMedia.date.toLocaleString()}
              </div>
              {selectedMedia.isVideo && selectedMedia.duration && (
                <div className="media-duration viewer-duration">
                  {formatDuration(selectedMedia.duration)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
