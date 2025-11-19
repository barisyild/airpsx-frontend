import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import ApiService from "../../services/ApiService";
import "./ScriptDetail.css";

interface ScriptDetailProps {
  isDarkMode: boolean;
  scriptKey: string;
  scriptName: string;
  authorName: string;
  authorSrc: string;
}

interface ScriptInfo {
  key: string;
  name: string;
  authorName: string;
  authorSrc: string;
  description: string;
  type: string;
}

const ScriptDetail = ({ isDarkMode, scriptKey, scriptName, authorName, authorSrc }: ScriptDetailProps) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scriptInfo, setScriptInfo] = useState<ScriptInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  // Script hakkında daha fazla bilgi almak için ilk yükleme
  useEffect(() => {
    const fetchScriptInfo = async () => {
      try {
        setIsLoading(true);
        
        // Fetch script details from the API
        const scripts = await ApiService.getRemoteScripts();
        const currentScript = scripts.find((script: any) => script.key === scriptKey);
        
        if (currentScript) {
          setScriptInfo({
            key: scriptKey,
            name: scriptName || currentScript.name,
            authorName: authorName || currentScript.authorName,
            authorSrc: authorSrc || currentScript.authorSrc,
            description: currentScript.description || "",
            type: currentScript.type || "rulescript" // Default to rulescript if type is not provided
          });
        } else {
          // Fallback to provided props if script not found in API response
          setScriptInfo({
            key: scriptKey,
            name: scriptName,
            authorName: authorName,
            authorSrc: authorSrc,
            description: "",
            type: "rulescript" // Default to rulescript
          });
        }
        
        setError(null);
      } catch (err) {
        console.error("Failed to fetch script details:", err);
        setError("Failed to load script details. Please try again later.");
        // Fallback to provided props if API call fails
        setScriptInfo({
          key: scriptKey,
          name: scriptName,
          authorName: authorName,
          authorSrc: authorSrc,
          description: "",
          type: "rulescript" // Default to rulescript
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchScriptInfo();
  }, [scriptKey, scriptName, authorName, authorSrc]);

  // Component unmount olduğunda interval'i temizle
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  const executeScript = async () => {
    try {
      setIsExecuting(true);
      setOutput("");
      setError(null);

      // Heartbeat interval'ini başlat
      heartbeatIntervalRef.current = window.setInterval(async () => {
        try {
          await ApiService.sendHeartbeat();
        } catch (err) {
          console.error("Heartbeat error:", err);
          // Heartbeat hatası durumunda interval'i temizle
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
        }
      }, 1000);

      // ApiService kullanarak istekte bulun
      await ApiService.executeRemoteScriptStream(scriptKey, (text) => {
        setOutput(prev => prev + text);
        
        // Otomatik kaydırma
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      });

      // Script tamamlandığında interval'i temizle
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    } catch (err) {
      console.error("Script execution failed:", err);
      setError((err as Error).message || "Script execution failed");
      
      // Hata durumunda interval'i temizle
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    } finally {
      setIsExecuting(false);
    }
  };
  
  const viewSourceCode = () => {
    // Determine file extension based on script type
    const fileExtension = scriptInfo?.type === 'lua' ? '.lua' : '.hx';
    window.open(`https://github.com/barisyild/airpsx.com/blob/master/scripts/${scriptKey}/${scriptKey}${fileExtension}`, '_blank');
  };

  // Function to determine if the description is long enough to need a "Show More" button
  const isDescriptionLong = (description: string): boolean => {
    if (!description) return false;
    const lines = description.split('\n');
    return lines.length > 3;
  };

  // Function to render the description with HTML support
  const renderDescription = () => {
    if (!scriptInfo?.description) return null;
    
    const description = scriptInfo.description;
    
    if (!showFullDescription && isDescriptionLong(description)) {
      // Get first 3 lines for preview
      const lines = description.split('\n');
      const previewText = lines.slice(0, 3).join('\n');
      
      return (
        <div className="script-description-container">
          <div 
            className="script-description" 
            dangerouslySetInnerHTML={{ __html: previewText }}
          />
          <button 
            className="show-more-button" 
            onClick={() => setShowFullDescription(true)}
          >
            Show More
          </button>
        </div>
      );
    }
    
    return (
      <div className="script-description-container">
        <div 
          className="script-description" 
          dangerouslySetInnerHTML={{ __html: description }}
        />
        {showFullDescription && isDescriptionLong(description) && (
          <button 
            className="show-less-button" 
            onClick={() => setShowFullDescription(false)}
          >
            Show Less
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`script-detail ${isDarkMode ? "dark" : ""}`}>
        <div className="script-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading script details...</p>
        </div>
      </div>
    );
  }

  if (error && !scriptInfo) {
    return (
      <div className={`script-detail ${isDarkMode ? "dark" : ""}`}>
        <div className="script-detail-error">
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`script-detail ${isDarkMode ? "dark" : ""}`}>
      <div className="script-detail-header">
        <div className="script-detail-info">
          <div className="script-detail-image">
            <img 
              src={ApiService.getScriptImageUrl(scriptKey)} 
              alt={scriptName}
              onError={(e) => {
                if (e.currentTarget instanceof HTMLImageElement) {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='20' text-anchor='middle' alignment-baseline='middle' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                }
              }}
            />
          </div>
          <div className="script-detail-text">
            <h2>{scriptName}</h2>
            <a 
              href={authorSrc} 
              target="_blank" 
              rel="noopener noreferrer"
              className="author-link"
            >
              {authorName}
            </a>
            <div className="source-code-link" onClick={viewSourceCode}>
              <span className="code-icon">&#60;/&#62;</span> View source on GitHub
            </div>
            {renderDescription()}
          </div>
        </div>

        <div className="script-detail-actions">
          <button 
            className={`execute-button ${isExecuting ? "executing" : ""}`}
            onClick={executeScript}
            disabled={isExecuting}
          >
            {isExecuting ? "Executing..." : "Execute Script"}
          </button>
        </div>
      </div>

      <div className="script-detail-output-container">
        <div className="output-header">
          <h3>Output</h3>
          {output && (
            <button 
              className="clear-button"
              onClick={() => setOutput("")}
              disabled={isExecuting}
            >
              Clear
            </button>
          )}
        </div>
        
        <div className="script-output" ref={outputRef}>
          {error && <div className="script-error">{error}</div>}
          {output ? (
            <pre>{output}</pre>
          ) : (
            <div className="no-output">
              {error ? "Execution failed. Try again?" : "Execute the script to see output here."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptDetail;

