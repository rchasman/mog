type Config = {
  terminalUrl: string;
  publicUrl: string;
  command: string;
  readonly: boolean;
  recording: boolean;
};

const init = async (): Promise<void> => {
  const root = document.getElementById("root")!;

  // Fetch config from server
  let config: Config = {
    terminalUrl: `http://localhost:7001`,
    publicUrl: window.location.href,
    command: "unknown",
    readonly: true,
    recording: false,
  };

  try {
    const res = await fetch("/config.js");
    const text = await res.text();
    const match = text.match(/window\.__MOG_CONFIG__\s*=\s*(\{[\s\S]*\});?/);
    if (match?.[1]) {
      config = JSON.parse(match[1]);
    }
  } catch {}

  // Render
  root.innerHTML = `
    <div class="app">
      <header class="header">
        <div class="header-left">
          <div class="logo">
            <span class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span class="logo-text">mog</span>
          </div>
          <div class="divider"></div>
          <div class="url-container">
            <span class="url-text">${config.publicUrl}</span>
            <button class="copy-btn" id="copy-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>
      </header>

      <div class="status-bar">
        <div class="status-item">
          <span class="status-label">Status</span>
          <span class="badge badge-live" id="status-badge">
            <span class="pulse-dot"></span>
            live
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Command</span>
          <span class="command">${config.command}</span>
        </div>
        ${config.readonly ? '' : '<div class="status-item"><span class="badge badge-neutral">interactive</span></div>'}
        ${config.recording ? '<div class="status-item"><span class="badge badge-recording"><span class="pulse-dot"></span>recording</span></div>' : ''}
      </div>

      <div class="terminal-container">
        <iframe
          class="terminal-iframe"
          src="${config.terminalUrl}"
          title="Terminal"
        ></iframe>
      </div>

      <footer class="footer">
        <span class="footer-text">A primitive for watching terminals</span>
        <a href="https://github.com/rchasman/mog" class="footer-link" target="_blank">GitHub</a>
      </footer>
    </div>
  `;

  // Copy button handler
  const copyBtn = document.getElementById("copy-btn")!;
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(config.publicUrl);
    copyBtn.classList.add("copied");
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>Copied</span>
    `;
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>Copy</span>
      `;
    }, 1500);
  });
};

init();
