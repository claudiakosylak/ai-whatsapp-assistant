import { useEffect, useState } from "react"

export const Logs = () => {
    const [logs, setLogs] = useState<string[]>([])

    useEffect(() => {
        const fetchLogs = async () => {
          try {
            const response = await fetch("/api/logs");
            if (!response.ok) throw new Error("Failed to fetch logs");
            const data = await response.json();
            setLogs(data);
          } catch (error) {
            console.error("Error fetching logs:", error);
          }
        };

        fetchLogs();
        const intervalId = setInterval(fetchLogs, 5000);

        return () => clearInterval(intervalId); // Cleanup on unmount
      }, []);

    return (
        <div className="panel">
        <h2>Logs</h2>
        <div className="logs">
            {logs
              .map((log, idx) => <div className="log-entry" key={`${log.substring(10)}-${idx}`}>{log}</div>)}
        </div>
    </div>
    )
}
