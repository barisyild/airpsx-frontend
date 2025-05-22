import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ApiService from "../../services/ApiService";
import "./Statistics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Statistics = ({ isDarkMode }) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const data = await ApiService.getSystemStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Stats yüklenemedi:", err);
      setError("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(); // Initial installation

    // Update every 60 seconds
    const interval = setInterval(fetchStats, 60000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  const calculateAverages = (data) => {
    const gameStats = data.filter((stat) => stat.titleID);
    const idleStats = data.filter((stat) => !stat.titleID);

    const calculateAvg = (arr) => ({
      frequency:
        arr.reduce((sum, stat) => sum + stat.frequency, 0) /
        (arr.length || 1) /
        1000000,
      temperature:
        arr.reduce((sum, stat) => sum + stat.temperature, 0) /
        (arr.length || 1),
      socTemp:
        arr.reduce((sum, stat) => sum + stat.socSensorTemperature, 0) /
        (arr.length || 1),
    });

    return {
      game: calculateAvg(gameStats),
      idle: calculateAvg(idleStats),
    };
  };

  const exportToCSV = () => {
    if (stats.length === 0) return;

    // Create CSV header
    const headers = [
      "Timestamp",
      "CPU Frequency (MHz)",
      "CPU Temperature (°C)",
      "SoC Temperature (°C)",
      "Title ID",
      "Title Name"
    ];

    // Create CSV content
    const csvContent = stats.map(stat => {
      const timestamp = new Date(stat.timestamp).toISOString();
      const frequency = (stat.frequency / 1000000).toFixed(2);
      const temperature = stat.temperature.toFixed(2);
      const socTemp = stat.socSensorTemperature.toFixed(2);
      const titleID = stat.titleID || "";
      const titleName = stat.titleName || "";

      return [timestamp, frequency, temperature, socTemp, titleID, titleName].join(",");
    });

    // Combine header and content
    const csv = [headers.join(","), ...csvContent].join("\n");

    // Create a Blob and download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Set filename with current date
    const date = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `system-stats-${date}.csv`);
    link.style.visibility = "hidden";
    
    // Append to document, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: isDarkMode ? "#fff" : "#666",
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        grid: {
          color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkMode ? "#fff" : "#666",
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: isDarkMode ? "#fff" : "#666",
        },
      },
      x: {
        grid: {
          color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDarkMode ? "#fff" : "#666",
        },
      },
    },
  };

  const chartData = {
    labels: stats.map((stat) => new Date(stat.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: "CPU Frequency (MHz)",
        data: stats.map((stat) => stat.frequency / 1000000),
        borderColor: "#3498db",
        backgroundColor: "rgba(52, 152, 219, 0.5)",
        yAxisID: "y",
      },
      {
        label: "CPU Temperature (°C)",
        data: stats.map((stat) => stat.temperature),
        borderColor: "#e74c3c",
        backgroundColor: "rgba(231, 76, 60, 0.5)",
        yAxisID: "y1",
      },
      {
        label: "SoC Temperature (°C)",
        data: stats.map((stat) => stat.socSensorTemperature),
        borderColor: "#f1c40f",
        backgroundColor: "rgba(241, 196, 15, 0.5)",
        yAxisID: "y1",
      },
    ],
  };

  const averages = calculateAverages(stats);

  return (
    <div className={`statistics ${isDarkMode ? "dark" : ""}`}>
      {loading ? (
        <div className="statistics-loading">Loading statistics...</div>
      ) : error ? (
        <div className="statistics-error">{error}</div>
      ) : (
        <div className="statistics-content">
          <div className="chart-container">
            <button
                className="export-button"
                onClick={exportToCSV}
                disabled={stats.length === 0}
                title="Export statistics to CSV file"
            >
              Export CSV
            </button>
            <Line options={chartOptions} data={chartData} />
          </div>
          <div className="stats-averages">
            <div className="averages-group">
              <h3>System Idle Averages</h3>
              <div className="averages-grid">
                <div className="average-item">
                  <span>CPU Frequency</span>
                  <strong>{averages.idle.frequency.toFixed(0)} MHz</strong>
                </div>
                <div className="average-item">
                  <span>CPU Temperature</span>
                  <strong>{averages.idle.temperature.toFixed(1)}°C</strong>
                </div>
                <div className="average-item">
                  <span>SoC Temperature</span>
                  <strong>{averages.idle.socTemp.toFixed(1)}°C</strong>
                </div>
              </div>
            </div>
            <div className="averages-group">
              <h3>Gaming Averages</h3>
              <div className="averages-grid">
                <div className="average-item">
                  <span>CPU Frequency</span>
                  <strong>{averages.game.frequency.toFixed(0)} MHz</strong>
                </div>
                <div className="average-item">
                  <span>CPU Temperature</span>
                  <strong>{averages.game.temperature.toFixed(1)}°C</strong>
                </div>
                <div className="average-item">
                  <span>SoC Temperature</span>
                  <strong>{averages.game.socTemp.toFixed(1)}°C</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
