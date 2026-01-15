type Config = {
  terminalUrl: string;
  publicUrl: string;
  command: string;
  readonly: boolean;
  recording: boolean;
  token: string | null;
  consensus: number;
};

type Proposal = {
  id: string;
  command: string;
  votes: number;
  proposer: string;
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
    token: null,
    consensus: 0,
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
          <a href="https://github.com/rchasman/mog" class="icon-btn" target="_blank" title="GitHub">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          </a>
          <button class="icon-btn" id="theme-toggle" title="Toggle theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
          <button class="icon-btn" id="minimize-toggle" title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        ${config.readonly && !config.consensus ? '' : '<div class="status-item"><span class="badge badge-neutral">interactive</span></div>'}
        ${config.recording ? '<div class="status-item"><span class="badge badge-recording"><span class="pulse-dot"></span>recording</span></div>' : ''}
        ${config.consensus !== 0 ? `<div class="status-item"><span class="badge badge-info" id="votes-needed">${config.consensus === -1 ? 'auto' : config.consensus} votes</span></div>` : ''}
        ${config.consensus ? '<div class="status-item"><span class="badge badge-neutral" id="viewer-count">0 watching</span></div>' : ''}
      </div>

      <div class="main-container">
        <div class="terminal-container">
          <iframe
            class="terminal-iframe"
            src="${config.terminalUrl}"
            title="Terminal"
          ></iframe>
        </div>
        ${config.consensus ? `
        <div class="consensus-panel">
          <div class="consensus-header">
            <span class="consensus-title">Command Queue</span>
          </div>
          <div class="proposals-list" id="proposals-list">
            <div class="empty-state">No pending commands</div>
          </div>
          <div class="propose-form">
            <input type="text" id="propose-input" placeholder="Type a command..." class="propose-input" />
            <button id="propose-btn" class="propose-btn">Propose</button>
          </div>
        </div>
        ` : ''}
      </div>
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

  // Consensus mode WebSocket
  if (config.consensus !== 0) {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws${window.location.search}`;
    const ws = new WebSocket(wsUrl);

    const proposalsList = document.getElementById("proposals-list")!;
    const proposeInput = document.getElementById("propose-input") as HTMLInputElement;
    const proposeBtn = document.getElementById("propose-btn")!;
    const viewerCount = document.getElementById("viewer-count")!;
    const votesNeeded = document.getElementById("votes-needed");

    let currentRequired = config.consensus === -1 ? 1 : config.consensus;

    const renderProposals = (proposals: Proposal[], required: number) => {
      if (proposals.length === 0) {
        proposalsList.innerHTML = '<div class="empty-state">No pending commands</div>';
        return;
      }
      proposalsList.innerHTML = proposals.map((p) => `
        <div class="proposal">
          <div class="proposal-command">$ ${p.command}</div>
          <div class="proposal-meta">
            <span class="proposal-votes">${p.votes}/${required} votes</span>
            <button class="vote-btn" data-id="${p.id}">+1 Vote</button>
          </div>
        </div>
      `).join("");

      // Add vote handlers
      proposalsList.querySelectorAll(".vote-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = (btn as HTMLElement).dataset.id;
          ws.send(JSON.stringify({ type: "vote", id }));
        });
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "state") {
        currentRequired = data.required;
        renderProposals(data.proposals, data.required);
        viewerCount.textContent = `${data.viewers} watching`;
        if (votesNeeded) {
          votesNeeded.textContent = data.auto ? `${data.required} votes (auto)` : `${data.required} votes`;
        }
      }
      if (data.type === "executed") {
        // Flash executed command
        const flash = document.createElement("div");
        flash.className = "executed-flash";
        flash.textContent = `Executed: ${data.command}`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 2000);
      }
    };

    const propose = () => {
      const command = proposeInput.value.trim();
      if (command) {
        ws.send(JSON.stringify({ type: "propose", command }));
        proposeInput.value = "";
      }
    };

    proposeBtn.addEventListener("click", propose);
    proposeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") propose();
    });
  }
};

init();
