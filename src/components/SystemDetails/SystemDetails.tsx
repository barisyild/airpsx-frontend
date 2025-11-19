import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import "./SystemDetails.css";
import ApiService from "../../services/ApiService";

interface SystemDetailsProps {
  isDarkMode: boolean;
  showPanel: boolean;
  onClose: () => void;
}

interface SystemDetailsData {
  modelName: string;
  serialNumber: string;
  hw_model: string;
  hw_machine: string;
  ostype: string;
  sdk_version: string;
  ps4_sdk_version: string;
  kernel_version: string;
  upd_version: string;
  kernel_boot_time: number;
}

// Variable to store static system information
let staticSystemDetails: SystemDetailsData | null = null;

const SystemDetails = ({ isDarkMode, showPanel, onClose }: SystemDetailsProps) => {
  const [systemDetails, setSystemDetails] = useState<SystemDetailsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryTimeoutRef = useRef<number | null>(null);

  const fetchSystemDetails = async () => {
    // If static data is already loaded, use it
    if (staticSystemDetails) {
      setSystemDetails(staticSystemDetails);
      setIsLoading(false);
      return;
    }

    try {
      const data = await ApiService.getSystemInfo();
      staticSystemDetails = data;
      setSystemDetails(data);
      setError(null);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    } catch (error) {
      console.error("System bilgisi alınamadı:", error);
      setError("Failed to load system information");

      // In case of error, try again after 5 seconds
      if (showPanel) {
        retryTimeoutRef.current = window.setTimeout(() => {
          setIsLoading(true);
          fetchSystemDetails();
        }, 5000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showPanel && !staticSystemDetails) {
      fetchSystemDetails();
    } else if (showPanel && staticSystemDetails) {
      setSystemDetails(staticSystemDetails);
      setIsLoading(false);
    }

    // Cleanup: Clear retry timeout when panel closes
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [showPanel]);

  const formatUptime = (bootTime: number): string => {
    if (!bootTime) return "Unknown";

    const now = Math.floor(Date.now() / 1000);
    const uptime = now - bootTime;
    const seconds = uptime % 60;
    const minutes = Math.floor(uptime / 60) % 60;
    const hours = Math.floor(uptime / 3600) % 24;
    const days = Math.floor(uptime / 86400);

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (!showPanel) return null;

  return (
    <div className={`system-details-overlay ${isDarkMode ? "dark" : ""}`}>
      <div className="system-details-panel">
        <div className="system-details-header">
          <span>System Information</span>
          <button onClick={onClose}>×</button>
        </div>

        {isLoading ? (
          <div className="system-details-loading">
            Loading system information...
          </div>
        ) : error ? (
          <div className="system-details-error">
            {error}
            <button
              className="retry-button"
              onClick={() => {
                setIsLoading(true);
                fetchSystemDetails();
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          systemDetails && (
            <div className="system-details-content">
              <div className="detail-group">
                <h3>Hardware Information</h3>
                <div className="detail-item">
                  <span>Model Name:</span>
                  <span>{systemDetails.modelName}</span>
                </div>
                <div className="detail-item">
                  <span>Serial Number:</span>
                  <span>{systemDetails.serialNumber}</span>
                </div>
                <div className="detail-item">
                  <span>Hardware Model:</span>
                  <span>{systemDetails.hw_model}</span>
                </div>
                <div className="detail-item">
                  <span>Architecture:</span>
                  <span>{systemDetails.hw_machine}</span>
                </div>
              </div>

              <div className="detail-group">
                <h3>Software Information</h3>
                <div className="detail-item">
                  <span>Operating System:</span>
                  <span>{systemDetails.ostype}</span>
                </div>
                <div className="detail-item">
                  <span>SDK Version:</span>
                  <span>{systemDetails.sdk_version}</span>
                </div>
                <div className="detail-item">
                  <span>PS4 SDK:</span>
                  <span>{systemDetails.ps4_sdk_version}</span>
                </div>
                <div className="detail-item">
                  <span>Kernel Version:</span>
                  <span>{systemDetails.kernel_version}</span>
                </div>
                <div className="detail-item">
                  <span>Update Version:</span>
                  <span>{systemDetails.upd_version}</span>
                </div>
                <div className="detail-item">
                  <span>System Uptime:</span>
                  <span>{formatUptime(systemDetails.kernel_boot_time)}</span>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SystemDetails;

