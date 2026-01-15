type Config = {
  terminalUrl: string;
  publicUrl: string;
  command: string;
  readonly: boolean;
  recording: boolean;
};

const init = async (): Promise<void> => {
  const root = document.getElementById("root")!;

  // Initialize theme
  const savedTheme = localStorage.getItem("mog-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <rect x="10" y="10" width="4" height="4" fill="currentColor" stroke="none" />
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
        <div class="header-controls">
          <button class="icon-btn" id="theme-toggle" title="Toggle theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
          <button class="icon-btn" id="minimize-toggle" title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
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

  // Theme toggle handler
  const themeToggle = document.getElementById("theme-toggle")!;
  const updateThemeIcon = (theme: string) => {
    themeToggle.innerHTML =
      theme === "light"
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="12" cy="12" r="5" />
             <line x1="12" y1="1" x2="12" y2="3" />
             <line x1="12" y1="21" x2="12" y2="23" />
             <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
             <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
             <line x1="1" y1="12" x2="3" y2="12" />
             <line x1="21" y1="12" x2="23" y2="12" />
             <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
             <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
           </svg>`;
  };

  updateThemeIcon(savedTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("mog-theme", newTheme);
    updateThemeIcon(newTheme);
  });

  // Minimize toggle handler
  const minimizeToggle = document.getElementById("minimize-toggle")!;
  const app = document.querySelector(".app")!;
  let isMinimized = false;

  minimizeToggle.addEventListener("click", () => {
    isMinimized = !isMinimized;
    app.classList.toggle("minimized", isMinimized);
    minimizeToggle.innerHTML = isMinimized
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M6 9l6 6 6-6" />
         </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M18 15l-6-6-6 6" />
         </svg>`;
    minimizeToggle.title = isMinimized ? "Expand" : "Minimize";
  });
};

init();
