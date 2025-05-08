import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import "./ImageViewer.css";
import ApiService from "../../services/ApiService";

const ImageViewer = ({ imageFile, currentPath, onClose }) => {
  const [loading, setLoading] = useState(true);
  const imgRef = useRef(null);
  const abortControllerRef = useRef(null);
  const imageUrlRef = useRef('');
  
  // Generate the image URL only when the component is first loaded or when imageFile changes
  useEffect(() => {
    if (!imageFile || !currentPath) return;
    
    setLoading(true);
    
    // Create AbortController only when needed (new image)
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    
    // Generate image URL and add timestamp for caching
    const baseUrl = ApiService.getStreamUrl(currentPath + imageFile.name);
    const separator = baseUrl.includes('?') ? '&' : '?';
    imageUrlRef.current = `${baseUrl}${separator}t=${Date.now()}`;
    
    return () => {
      // Cancel old request when component unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [imageFile, currentPath]);

  // Set the loading state to false when the image loads or an error occurs
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      console.log("Image loaded");
      setLoading(false);
    };

    const handleError = () => {
      console.log("Image error");
      setLoading(false);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [imgRef.current, imageFile]);

  const handleDownload = () => {
    if (imageFile) {
      const filePath = currentPath + imageFile.name;
      ApiService.downloadFiles([filePath]);
    }
  };

  return (
    <div className="image-viewer">
      <div className="image-viewer-content">
        <button className="download-button floating" onClick={handleDownload} title="İndir">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        
        {loading && (
          <div className="image-loading">
            <div className="image-spinner"></div>
            <div className="image-loading-text">Image is loading...</div>
          </div>
        )}
        {imageFile && (
          <img 
            ref={imgRef}
            src={imageUrlRef.current} 
            alt={imageFile?.name}
            className="image-viewer-img"
          />
        )}
      </div>
    </div>
  );
};

export default ImageViewer; 