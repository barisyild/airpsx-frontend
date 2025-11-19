import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import ApiService from "../../services/ApiService";
import "./Applications.css";

interface ApplicationsProps {
  isDarkMode: boolean;
}

interface App {
  titleId: string;
  titleName: string;
  size: number;
  installTime?: number;
}

interface RunStatus {
  success: boolean;
  message: string;
}

const Applications = ({ isDarkMode }: ApplicationsProps) => {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const appTitleIdBlackList = [
      "CUSA00001", //PS4 - The PlayRoom
      "CUSA00219", //PS4 - Destiny Advertisement
      "CUSA00568", //PS4 - Destiny Advertisement
      "CUSA00572", //PS4 - Share Factory
      "CUSA00960", //PS4 - Playstation Vue
      "CUSA01000", //PS4 - Destiny Advertisement
      "CUSA01697", //PS4 - Playstation Now
      "CUSA01780", //PS4 - Spotify
      "CUSA02012", //PS4 - Media Player
      "NPIA06503", //PS4 - PlayStation Now
      "NPXS20102", //PS4 - Web Browser
      "NPXS20104", //PS4 - My Content
      "NPXS20105", //PS4 - Playstation Live
      "NPXS20106", //PS4 - Music Unlimited
      "NPXS20107", //PS4 - Playstation My Videos
      "NPXS20108", //PS4 - What's New
      "NPXS20109", //PS4 - BD Player
      "NPXS20110", //PS4 - TV & Video
      "NPXS20111", //PS4 - Library
      "NPXS20112", //PS4 - Game Disk
      "NPXS20114", //PS4 - PlayStation Now
      "NPXS20117", //PS4 - USB Music Player
      "NPXS20118", //PS4 - Shared Play
      "NPXS20132", //PS4 - ???
      "NPXS20133", //PS4 - ???
      "NPXS20979", //PS4 - PlayStation Store
      "NPXS21021", //PS4 - PS5 Remote Play
      "NPXS20120", //PS4 - Playstation Video
      "NPXS20123", //PS4 - TV & Video
      "NPXS20125", //PS4 - TV & Video
      "NPXS40032",
      "NPXS40037",
      "NPXS40047",
      "NPXS40053",
      "NPXS40054",
      "NPXS40056",
      "NPXS40063",
      "NPXS40071",
      "NPXS40139",
      "NPXS40144",
      "NPXS40145",
      "NPXS40148",
      "NPXS40149",
      "NPXS40150"
  ];

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await ApiService.getAppList();
        // Sort by size and filter system apps
        const sortedApps = data
          .filter((app: any) => !appTitleIdBlackList.includes(app.titleId))
          .sort((a: any, b: any) => b.size - a.size);
        setApps(sortedApps);
        setError(null);
      } catch (err) {
        console.error("Apps yüklenemedi:", err);
        setError("Failed to load applications");
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, []);

  const handleAppClick = (app: App) => {
    setSelectedApp(app);
  };

  const handleRunApp = async (titleId: string) => {
    try {
      const result = await ApiService.runApp(titleId);
      setRunStatus(result);

      // Clear status message after 3 seconds
      setTimeout(() => {
        setRunStatus(null);
      }, 3000);
    } catch (error) {
      setRunStatus({
        success: false,
        message: "Error running application",
      });
    }
  };

  return (
    <div className={`applications ${isDarkMode ? "dark" : ""}`}>
      {loading ? (
        <div className="applications-loading">Loading applications...</div>
      ) : error ? (
        <div className="applications-error">{error}</div>
      ) : (
        <>
          <div className="app-grid">
            {apps.map((app) => (
              <div
                key={app.titleId}
                className="app-item"
                onClick={() => handleAppClick(app)}
              >
                <div className="app-icon">
                  <img
                    src={ApiService.getTitleImageUrl(app.titleId)}
                    alt={app.titleName}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                      target.style.background = "#2c3e50";
                    }}
                  />
                </div>
                <div className="app-name">{app.titleName}</div>
                {app.size != 0 && (
                    <div className="app-size">
                      {ApiService.formatBytes(app.size)}
                    </div>
                )}
              </div>
            ))}
          </div>

          {selectedApp && (
            <div
              className="app-details-overlay"
              onClick={() => setSelectedApp(null)}
            >
              <div className="app-details" onClick={(e) => e.stopPropagation()}>
                <div className="app-details-header">
                  <h2>{selectedApp.titleName}</h2>
                  <button onClick={() => setSelectedApp(null)}>×</button>
                </div>
                <div className="app-details-content">
                  <div className="app-details-icon">
                    <img
                      src={ApiService.getTitleImageUrl(selectedApp.titleId)}
                      alt={selectedApp.titleName}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                        target.style.background = "#2c3e50";
                      }}
                    />
                  </div>
                  <div className="app-details-info">
                    <div className="detail-row">
                      <span>Title ID:</span>
                      <span>{selectedApp.titleId}</span>
                    </div>
                    {selectedApp.size != 0 && (
                        <div className="detail-row">
                          <span>Size:</span>
                          <span>{ApiService.formatBytes(selectedApp.size)}</span>
                        </div>
                    )}
                    {selectedApp.installTime != null && (
                        <div className="detail-row">
                          <span>Install Date:</span>
                          <span>
                        {new Date(selectedApp.installTime).toLocaleString()}
                      </span>
                        </div>
                    )}
                    <div className="detail-actions">
                      <button
                        className={`run-button ${
                          runStatus
                            ? runStatus.success
                              ? "success"
                              : "error"
                            : ""
                        }`}
                        onClick={() => handleRunApp(selectedApp.titleId)}
                      >
                        Run Application
                      </button>
                      {runStatus && (
                        <div
                          className={`status-message ${
                            runStatus.success ? "success" : "error"
                          }`}
                        >
                          {runStatus.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Applications;

