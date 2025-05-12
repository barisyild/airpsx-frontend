import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import ApiService from "../../services/ApiService";
import "./ScriptStore.css";

const ScriptStore = ({ isDarkMode, onOpenWindow }) => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const fetchScripts = async (query = "") => {
    try {
      setLoading(true);
      const data = query 
        ? await ApiService.searchRemoteScripts(query)
        : await ApiService.getRemoteScripts();
      setScripts(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
      setError("Failed to load scripts. Please try again later.");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearching(true);
    fetchScripts(searchQuery);
  };

  const openScriptDetail = (script) => {
    // Open a new window and pass script details as props
    onOpenWindow({
      app: 'scriptDetail',
      title: script.name,
      props: {
        scriptKey: script.key,
        scriptName: script.name,
        authorName: script.authorName,
        authorSrc: script.authorSrc
      }
    });
  };

  const handleImageError = (e) => {
    if (e.currentTarget instanceof HTMLImageElement) {
      e.currentTarget.onerror = null;
      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='20' text-anchor='middle' alignment-baseline='middle' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
    }
  };

  if (loading) {
    return (
      <div className={`script-store ${isDarkMode ? "dark" : ""}`}>
        <div className="script-store-loading">
          <div className="loading-spinner"></div>
          <p>Loading scripts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`script-store ${isDarkMode ? "dark" : ""}`}>
        <div className="script-store-error">
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => {
              setError(null);
              fetchScripts();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`script-store ${isDarkMode ? "dark" : ""}`}>
      <div className="script-store-header">
        <div className="header-left">
          <h2>Script Store</h2>
          <p>Browse and run community scripts</p>
        </div>
        <div className="header-right">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              className="search-input"
            />
            <button type="submit" className="search-button" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </button>
          </form>
        </div>
      </div>
      
      <div className="script-grid">
        {scripts.length === 0 ? (
          <div className="no-scripts-message">
            {searchQuery ? `No scripts found for "${searchQuery}"` : "No scripts available at the moment."}
          </div>
        ) : (
          scripts.map((script) => (
            <div 
              key={script.key} 
              className="script-card"
              onClick={() => openScriptDetail(script)}
            >
              <div className="script-image">
                <img 
                  src={ApiService.getScriptImageUrl(script.key)} 
                  alt={script.name}
                  onError={handleImageError}
                />
              </div>
              <div className="script-info">
                <h3>{script.name}</h3>
                <a 
                  href={script.authorSrc}
                  className="script-author"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(script.authorSrc, '_blank');
                  }}
                >
                  {script.authorName}
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScriptStore; 