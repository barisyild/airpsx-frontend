import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import ApiService from "../../services/ApiService";
import "./ProcessList.css";

const ProcessList = ({ isDarkMode }) => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedFields, setUpdatedFields] = useState(new Set());
  const [lastUpdateFailed, setLastUpdateFailed] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "pid",
    direction: "asc",
  });
  const [uptimeRefresh, setUptimeRefresh] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeRefresh((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const data = await ApiService.getProcessList();

        if (!Array.isArray(data)) {
          throw new Error("Invalid data format");
        }

        // Mevcut process'leri pid'ye göre map'le
        const currentProcessMap = processes.reduce((acc, process) => {
          acc[process.pid] = process;
          return acc;
        }, {});

        // Follow the changes
        const changed = new Set();

        // Create new process list
        const updatedProcesses = data.map((newProcess) => {
          const existingProcess = currentProcessMap[newProcess.pid];

          if (existingProcess) {
            // Check changes
            if (existingProcess.rssize !== newProcess.rssize) {
              changed.add(`memory-${newProcess.pid}`);
            }
            if (existingProcess.stat !== newProcess.stat) {
              changed.add(`stat-${newProcess.pid}`);
            }
            // We can also check other areas that can change
          }

          delete currentProcessMap[newProcess.pid]; // Delete committed process from map
          return newProcess;
        });

        // Save changed areas for highlight effect
        setUpdatedFields(changed);
        setTimeout(() => setUpdatedFields(new Set()), 1000);

        setProcesses(updatedProcesses);
        setError(null);
        setLastUpdateFailed(false);
        setLastUpdateTime(new Date());
      } catch (error) {
        console.error("Failed to fetch processes:", error);
        if (processes.length === 0) {
          setError("Failed to load process list");
        } else {
          setLastUpdateFailed(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedProcesses = () => {
    const sortedProcesses = [...processes];
    sortedProcesses.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Special sorting rules
      if (sortConfig.key === "rssize") {
        aValue = a.rssize * a.pageSize;
        bValue = b.rssize * b.pageSize;
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sortedProcesses;
  };

  const formatMemory = (size) => {
    // pageSize multiplied by rssize gives the actual memory usage
    const bytes = size * 16384; // pageSize fixed 16384
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (startTime) => {
    if (!startTime) return "--:--:--";

    const now = Math.floor(Date.now() / 1000);
    const uptime = now - startTime;

    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const pad = (num) => String(num).padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const getValueClassName = (type, pid) => {
    const key = `${type}-${pid}`;
    return updatedFields.has(key) ? "updated" : "";
  };

  if (loading && processes.length === 0) {
    return (
      <div className={`process-list ${isDarkMode ? "dark" : ""}`}>
        <div className="process-list-message loading">
          <div className="loading-spinner"></div>
          <div>Loading process list...</div>
        </div>
      </div>
    );
  }

  if (error && processes.length === 0) {
    return (
      <div className={`process-list ${isDarkMode ? "dark" : ""}`}>
        <div className="process-list-message error">{error}</div>
      </div>
    );
  }

  if (!processes.length) {
    return (
      <div className={`process-list ${isDarkMode ? "dark" : ""}`}>
        <div className="process-list-message">No processes found</div>
      </div>
    );
  }

  return (
    <div className={`process-list ${isDarkMode ? "dark" : ""}`}>
      {lastUpdateFailed && (
        <div className="update-status error">
          <span className="error-icon">⚠️</span>
          Last update failed
          {lastUpdateTime && (
            <span className="last-update">
              Last successful update: {lastUpdateTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th onClick={() => requestSort("pid")}>PID</th>
            <th onClick={() => requestSort("comm")}>Process Name</th>
            <th onClick={() => requestSort("ppid")}>PPID</th>
            <th onClick={() => requestSort("rssize")}>Memory</th>
            <th onClick={() => requestSort("stat")}>Status</th>
            <th onClick={() => requestSort("start")}>Uptime</th>
            <th onClick={() => requestSort("emul")}>Type</th>
            <th onClick={() => requestSort("titleID")}>Title ID</th>
          </tr>
        </thead>
        <tbody>
          {getSortedProcesses().map((process) => (
            <tr key={process.pid}>
              <td>{process.pid}</td>
              <td>{process.comm}</td>
              <td>{process.ppid}</td>
              <td className={getValueClassName("memory", process.pid)}>
                {formatMemory(process.rssize)}
              </td>
              <td className={getValueClassName("stat", process.pid)}>
                {process.stat}
              </td>
              <td>{formatUptime(process.start)}</td>
              <td>{process.emul}</td>
              <td>{process.titleID || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProcessList;
