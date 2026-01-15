import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";

// Session config passed from server
declare global {
  interface Window {
    __MOG_CONFIG__?: {
      terminalUrl: string;
      publicUrl: string;
      command: string;
      readonly: boolean;
      recording: boolean;
    };
  }
}

type ConnectionStatus = "connecting" | "live" | "disconnected";

// Icons as inline SVGs for zero dependencies
const Icons = {
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Circle: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
};

function App() {
  const config = window.__MOG_CONFIG__ ?? {
    terminalUrl: `http://localhost:${new URLSearchParams(window.location.search).get("port") ?? "7000"}`,
    publicUrl: window.location.href,
    command: "unknown",
    readonly: false,
    recording: false,
  };

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [copied, setCopied] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Check terminal connectivity
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(config.terminalUrl, { mode: "no-cors" });
        setStatus("live");
      } catch {
        setStatus("disconnected");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [config.terminalUrl]);

  // Copy URL to clipboard
  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(config.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [config.publicUrl]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    setStatus("live");
  }, []);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    setStatus("disconnected");
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">
              <Icons.Eye />
            </span>
            <span className="logo-text">mog</span>
          </div>

          <div className="divider" />

          <div className="url-container">
            <span className="url-text">{config.publicUrl}</span>
            <button
              className={`copy-btn ${copied ? "copied" : ""}`}
              onClick={copyUrl}
              title="Copy URL"
            >
              {copied ? <Icons.Check /> : <Icons.Copy />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Status</span>
          <StatusBadge status={status} />
        </div>

        <div className="status-item">
          <span className="status-label">Command</span>
          <span className="command">{config.command}</span>
        </div>

        {config.readonly && (
          <div className="status-item">
            <span className="badge badge-neutral">read-only</span>
          </div>
        )}

        {config.recording && (
          <div className="status-item">
            <span className="badge badge-recording">
              <span className="pulse-dot" />
              recording
            </span>
          </div>
        )}
      </div>

      {/* Terminal */}
      <div className="terminal-container">
        {status === "connecting" && !iframeLoaded && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <span className="loading-text">Connecting to terminal...</span>
          </div>
        )}

        {status === "disconnected" && !iframeLoaded && (
          <div className="error-state">
            <span className="error-icon">
              <Icons.AlertCircle />
            </span>
            <span className="error-title">Terminal Disconnected</span>
            <span className="error-message">
              The terminal session may have ended or the connection was lost.
              Refresh to try again.
            </span>
          </div>
        )}

        <iframe
          className="terminal-iframe"
          src={config.terminalUrl}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{ opacity: iframeLoaded ? 1 : 0 }}
          title="Terminal"
        />
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-left">
          <span className="footer-text">
            Watch AI agents work in real-time
          </span>
        </div>
        <a
          href="https://github.com/yourusername/mog"
          className="footer-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    live: { className: "badge-live", label: "live" },
    connecting: { className: "badge-connecting", label: "connecting" },
    disconnected: { className: "badge-disconnected", label: "disconnected" },
  }[status];

  return (
    <span className={`badge ${config.className}`}>
      {status === "live" && <span className="pulse-dot" />}
      {config.label}
    </span>
  );
}

// Mount
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
