import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import ApiService from "../../services/ApiService";
import "./SystemStatus.css";

interface SystemStatusProps {
  isDarkMode: boolean;
}

interface CPUInfo {
  mode: number;
  frequency: number;
  temperature: number;
  socSensorTemperature: number;
}

interface AppInfo {
  titleID: string;
  titleName?: string;
  comm: string;
  pid: number;
  start: number;
}

interface SystemInfo {
  cpu: CPUInfo;
  app?: AppInfo;
}

const SystemStatus = ({ isDarkMode }: SystemStatusProps) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedFields, setUpdatedFields] = useState<Set<string>>(new Set());
  const [uptimeRefresh, setUptimeRefresh] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeRefresh((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const data = await ApiService.getSystemStatus();

      // Detect changing values
      const changed = new Set<string>();
      if (systemInfo) {
        if (Math.abs(data.cpu.frequency - systemInfo.cpu.frequency) > 50000000)
          changed.add("frequency");
        if (Math.abs(data.cpu.temperature - systemInfo.cpu.temperature) > 0.5)
          changed.add("temperature");
        if (
          Math.abs(
            data.cpu.socSensorTemperature - systemInfo.cpu.socSensorTemperature
          ) > 0.5
        )
          changed.add("socTemp");
      }

      setUpdatedFields(changed);
      setSystemInfo(data);
      setError(null);

      // Clear highlight
      setTimeout(() => setUpdatedFields(new Set()), 1000);
    } catch (err) {
      console.error("System info alınamadı:", err);
      setError("Failed to load system information");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (startTime: number): string => {
    if (!startTime) return "--:--:--";

    const now = Math.floor(Date.now() / 1000);
    const uptime = now - startTime;

    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const pad = (num: number) => String(num).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const getCPUModeText = (mode: number): string => {
    switch (mode) {
      case 0:
        return "6CPU";
      case 1:
        return "7CPU (LOW)";
      case 5:
        return "7CPU (NORMAL)";
      default:
        return "Unknown";
    }
  };

  const getValueClassName = (field: string, value: number): string => {
    let className = "info-value";
    if (updatedFields.has(field)) className += " updated";
    if (field.includes("temperature") && value > 45) className += " warning";
    return className;
  };

  if (!systemInfo || error) {
    return (
      <div className={`system-info ${isDarkMode ? "dark" : ""}`}>
        <div className="system-info-header">System Information</div>
        <div className="system-info-error">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{error || "Waiting for data..."}</div>
          <div className="error-detail">
            Unable to retrieve system information. Please check your connection.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`system-info ${isDarkMode ? "dark" : ""}`}>
      <div className="system-info-header">System Status</div>
      <div className="system-info-content">
        {systemInfo.app && systemInfo.app.titleID && (
          <div className="info-section">
            <div className="section-title">Running App</div>
            <div className="game-info">
              <div className="game-image">
                <img
                  src={ApiService.getTitleImageUrl(systemInfo.app.titleID)}
                  alt={systemInfo.app.titleName || systemInfo.app.titleID}
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
              <div className="game-details">
                <div className="info-group">
                  <div className="info-label">Title</div>
                  <div className="info-value">
                    {systemInfo.app.titleName || systemInfo.app.titleID}
                  </div>
                </div>
                <div className="info-group">
                  <div className="info-label">Process</div>
                  <div className="info-value">
                    {systemInfo.app.comm} ({systemInfo.app.pid})
                  </div>
                </div>
                <div className="info-group">
                  <div className="info-label">Uptime</div>
                  <div className="info-value uptime">
                    {formatUptime(systemInfo.app.start)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="info-section">
          <div className="section-title">System Status</div>
          <div className="info-group">
            <div className="info-label">Mode</div>
            <div className="info-value">
              {getCPUModeText(systemInfo.cpu.mode)}
            </div>
          </div>
          <div className="info-group">
            <div className="info-label">Frequency</div>
            <div
              className={getValueClassName(
                "frequency",
                systemInfo.cpu.frequency
              )}
            >
              {(systemInfo.cpu.frequency / 1000000).toFixed(0)} MHz
            </div>
          </div>
          <div className="info-group">
            <div className="info-label">CPU Temp</div>
            <div
              className={getValueClassName(
                "temperature",
                systemInfo.cpu.temperature
              )}
            >
              {systemInfo.cpu.temperature.toFixed(1)}°C
            </div>
          </div>
          <div className="info-group">
            <div className="info-label">SoC Temp</div>
            <div
              className={getValueClassName(
                "socTemp",
                systemInfo.cpu.socSensorTemperature
              )}
            >
              {systemInfo.cpu.socSensorTemperature.toFixed(1)}°C
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;

