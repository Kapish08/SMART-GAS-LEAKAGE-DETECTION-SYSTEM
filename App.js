import React, { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import { ref, onValue, set, query, limitToLast } from "firebase/database";
import "./App.css";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
} from "chart.js";

// Register chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale);

function App() {
  const [gasValue, setGasValue] = useState(0);
  const [temp, setTemp] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [alarm, setAlarm] = useState(false);
  const [fan, setFan] = useState("OFF");
  const [logs, setLogs] = useState([]);
  const [readings, setReadings] = useState([]); // store recent gas readings for chart

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // Realtime SmartGasDetection listener
    const rootRef = ref(db, "SmartGasDetection");
    onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGasValue(data.gas_value || 0);
        setAlarm(data.alarm_triggered || false);
        setFan(data.fan_status || "OFF");
        setTemp(data.temperature ?? null);
        setHumidity(data.humidity ?? null);

        // Append to readings (for chart)
        setReadings((prev) => {
          const updated = [
            ...prev,
            { timestamp: new Date().toISOString(), gasLevel: data.gas_value || 0 },
          ];
          return updated.slice(-10); // keep only last 10 readings
        });
      }
    });

    // Show only last 8 logs
    const logsQuery = query(ref(db, "AlertLogs"), limitToLast(8));
    onValue(logsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.values(data)
          .filter((log) => log.timestamp && log.reason)
          .reverse();
        setLogs(arr);
      } else {
        setLogs([]);
      }
    });
  }, []);

  // Turn off alarm manually
  const handleAlarmToggle = () => {
    if (alarm) {
      set(ref(db, "SmartGasDetection/alarm_triggered"), false);
    }
  };

  // Chart rendering and updating
  useEffect(() => {
    if (!chartRef.current) return;

    const labels = readings.map((r) => new Date(r.timestamp).toLocaleTimeString());
    const gasValues = readings.map((r) => r.gasLevel);

    if (chartInstance.current) {
      chartInstance.current.data.labels = labels;
      chartInstance.current.data.datasets[0].data = gasValues;
      chartInstance.current.update();
    } else {
      const ctx = chartRef.current.getContext("2d");
      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Gas Level (ppm)",
              data: gasValues,
              borderWidth: 2,
              borderColor: "rgba(255, 99, 132, 1)",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: "Recent Gas Levels",
            },
          },
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    }
  }, [readings]);

  return (
    <div className="dashboard">
      <h1>Smart Gas Detection Dashboard</h1>

      <div className="status-cards">
        <div className="card">
          <h3>Gas Value</h3>
          <p>{gasValue} ppm</p>
        </div>
        <div className="card">
          <h3>Temperature</h3>
          <p>{temp !== null ? `${temp} °C` : "N/A"}</p>
        </div>
        <div className="card">
          <h3>Humidity</h3>
          <p>{humidity !== null ? `${humidity} %` : "N/A"}</p>
        </div>
        <div className={`card ${alarm ? "danger" : "safe"}`}>
          <h3>Alarm Status</h3>
          <p>{alarm ? "Triggered" : "Normal"}</p>
        </div>
        <div className="card">
          <h3>Fan Status</h3>
          <p>{fan}</p>
        </div>
      </div>

      {alarm && (
        <button className="off-btn" onClick={handleAlarmToggle}>
          Turn OFF Alarm
        </button>
      )}

      <div className="logs">
        <h2>Recent Alert Logs</h2>
        {logs.length === 0 ? (
          <p>No recent logs available.</p>
        ) : (
          <ul>
            {logs.map((log, i) => (
              <li key={i}>
                <b>{new Date(log.timestamp).toLocaleString()}</b> —{" "}
                {log.reason || "Alert"} ({log.status})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="chart-container">
        <canvas ref={chartRef} width="400" height="200"></canvas>
      </div>
    </div>
  );
}

export default App;