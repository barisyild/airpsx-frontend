import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import ApiService from "../../services/ApiService";
import "./ScriptDetail.css";

const ScriptDetail = ({ isDarkMode, scriptKey, scriptName, authorName, authorSrc }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [scriptInfo, setScriptInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const outputRef = useRef(null);

  // Script hakkında daha fazla bilgi almak için ilk yükleme
  useEffect(() => {
    const fetchScriptInfo = async () => {
      try {
        setIsLoading(true);
        // Burada script hakkında daha detaylı bilgi alınabilir
        // Şu anlık sadece parametre olarak gelen bilgileri kullanıyoruz
        setScriptInfo({
          key: scriptKey,
          name: scriptName,
          authorName: authorName,
          authorSrc: authorSrc
        });
        setError(null);
      } catch (err) {
        console.error("Failed to fetch script details:", err);
        setError("Failed to load script details. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchScriptInfo();
  }, [scriptKey, scriptName, authorName, authorSrc]);

  const executeScript = async () => {
    try {
      setIsExecuting(true);
      setOutput("");
      setError(null);

      // ApiService kullanarak istekte bulun
      await ApiService.executeRemoteScriptStream(scriptKey, (text) => {
        setOutput(prev => prev + text);
        
        // Otomatik kaydırma
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      });
    } catch (err) {
      console.error("Script execution failed:", err);
      setError(err.message || "Script execution failed");
    } finally {
      setIsExecuting(false);
    }
  };
  
  const viewSourceCode = () => {
    window.open(`https://github.com/barisyild/airpsx.com/blob/master/scripts/${scriptKey}/${scriptKey}.rulescript`, '_blank');
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
            <div className="script-detail-type">
              Type: {scriptInfo?.type || "RuleScript"}
            </div>
            <div className="script-detail-cache">
              Cache: {scriptInfo?.hasCache ? "Available" : "None"}
            </div>
            <div className="source-code-link" onClick={viewSourceCode}>
              <span className="code-icon">&#60;/&#62;</span> View source on GitHub
            </div>
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