import { useState, useEffect } from "react";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [page, setPage] = useState("loading");

  useEffect(() => {
    const timeout = setTimeout(() => setPage("setup"), 3000);

    fetch("http://localhost:8000/api/auth/status")
      .then(r => r.json())
      .then(data => {
        clearTimeout(timeout);
        setPage(data.authenticated ? "dashboard" : "setup");
      })
      .catch(() => {
        clearTimeout(timeout);
        setPage("setup");
      });
  }, []);

  if (page === "loading") return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0f", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ color: "#374151", fontSize: "13px" }}>Starting MailMind...</div>
    </div>
  );

  if (page === "setup") return <Setup onComplete={() => setPage("dashboard")} />;
  return <Dashboard onSignOut={() => setPage("setup")} />;
}
