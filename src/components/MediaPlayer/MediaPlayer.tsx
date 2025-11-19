import { h } from "preact";
import { useEffect, useState, useRef } from "preact/hooks";
import "./MediaPlayer.css";
import ApiService from "../../services/ApiService";

interface FileItem {
  name: string;
  [key: string]: any;
}

interface MediaPlayerProps {
  mediaFile: FileItem | null;
  currentPath: string;
  onClose: () => void;
}

const MediaPlayer = ({ mediaFile, currentPath, onClose }: MediaPlayerProps) => {
  const [loading, setLoading] = useState(true);
  const isAudioFile = isAudioFileType(mediaFile?.name);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaUrlRef = useRef<string>('');

  // Generate the media URL only when the component is first loaded or when mediaFile changes
  useEffect(() => {
    if (!mediaFile || !currentPath) return;
    
    setLoading(true);
    
    // Create AbortController only when needed (new media)
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    
    // Generate media URL and add timestamp for caching
    const baseUrl = ApiService.getStreamUrl(currentPath + mediaFile.name);
    const separator = baseUrl.includes('?') ? '&' : '?';
    mediaUrlRef.current = `${baseUrl}${separator}t=${Date.now()}`;
    
    return () => {
      // Clear resources when component unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Stop media playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      }
      
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
    };
  }, [mediaFile, currentPath]);

  // Check if the file is an audio file
  function isAudioFileType(fileName: string | undefined): boolean {
    if (!fileName) return false;
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
    const lowerCaseFileName = fileName.toLowerCase();
    return audioExtensions.some(ext => lowerCaseFileName.endsWith(ext));
  }

  const handleDownload = () => {
    if (mediaFile) {
      const filePath = currentPath + mediaFile.name;
      ApiService.downloadFiles([filePath]);
    }
  };

  return (
    <div className="media-player">
      <div className="download-button-container">
        <button className="download-button-media" onClick={handleDownload} title="İndir">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
      
      <div className="media-player-content">
        {isAudioFile ? (
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
              <div className="audio-title-large">{mediaFile?.name}</div>
            </div>
            {mediaFile && (
              <audio 
                ref={audioRef}
                src={mediaUrlRef.current} 
                controls 
                autoPlay
                className="audio-player-element"
                onLoadStart={() => setLoading(true)}
                onLoadedData={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            )}
          </div>
        ) : (
          <div className="video-container">
            {mediaFile && (
              <video 
                ref={videoRef}
                src={mediaUrlRef.current} 
                controls 
                autoPlay
                onLoadStart={() => setLoading(true)}
                onLoadedData={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            )}
          </div>
        )}
        {loading && (
          <div className="media-loading">
            <div className="media-spinner"></div>
            <div className="media-loading-text">Loading...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;

