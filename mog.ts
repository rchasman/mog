#!/usr/bin/env bun
/**
 * mog - Watch your AI agents work
 *
 * Stream any terminal session to a public URL.
 * Built for AI agent sandboxes, Claude Code demos, and remote supervision.
 *
 * Usage:
 *   mog <command>              Share a command
 *   mog --attach <pid>         Attach to running process (coming soon)
 *   mog --replay <file>        Replay a recorded session
 *
 * Examples:
 *   mog claude                 Watch Claude Code work
 *   mog "cd sandbox && bash"   Share an agent's sandbox shell
 *   mog --record htop          Record session for later replay
 */

import { existsSync, mkdirSync, appendFileSync } from "fs";
import { homedir } from "os";

const args = process.argv.slice(2);

// Help
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
\x1b[1;33mmog\x1b[0m - Watch your AI agents work

Stream any terminal session to a public URL.
Perfect for AI agent sandboxes, Claude Code demos, and remote supervision.

\x1b[1mUsage:\x1b[0m
  mog <command> [args...]     Share a command's terminal
  mog --replay <file>         Replay a recorded session

\x1b[1mExamples:\x1b[0m
  mog claude                  Watch Claude Code work
  mog bash                    Share a shell session
  mog bun run dev             Share a dev server

\x1b[1mOptions:\x1b[0m
  --public          No token required (default: token required)
  --interactive, -i Allow viewers to type (default: read-only)
  --consensus [N]   Viewers vote on commands (N=fixed, omit=auto-scale)
  --record, -R      Record session to ~/.mog/<timestamp>.cast
  --port PORT       Use specific port (default: random 7000-8000)
  --no-tunnel       Skip cloudflare tunnel (localhost only)
  --raw             Use raw ttyd (no web UI wrapper)

\x1b[1mAgent Sandbox Integration:\x1b[0m
  # Watch an AgentFS sandbox
  mog agentfs exec my-agent.db bash

  # Share Claude Code session
  mog claude

  # Remote agent supervision
  mog ssh agent@server "cd /workspace && bash"
`);
  process.exit(0);
}

// Parse flags
const isPublic = args.includes("--public");
const interactive = args.includes("--interactive") || args.includes("-i");
const readonly = !interactive;
const record = args.includes("--record") || args.includes("-R");
const noTunnel = args.includes("--no-tunnel");
const rawMode = args.includes("--raw");
const consensusIndex = args.findIndex((a) => a === "--consensus");
const consensusArg = consensusIndex !== -1 ? args[consensusIndex + 1] : undefined;
// -1 = auto-scaling, 0 = disabled, N = fixed threshold
const consensusMode = consensusIndex !== -1;
const consensusFixed = consensusArg && !isNaN(parseInt(consensusArg)) ? parseInt(consensusArg) : null;

// Auto-scaling: majority rule, but only kicks in at 3+ viewers
const getRequiredVotes = (viewerCount: number): number => {
  if (!consensusMode) return 0;
  if (consensusFixed !== null) return consensusFixed;
  // < 3 viewers: direct execution (no consensus needed)
  if (viewerCount < 3) return 1;
  // 3+ viewers: need majority
  return Math.ceil((viewerCount + 1) / 2);
};
const portIndex = args.findIndex((a) => a === "--port");
const portArg = portIndex !== -1 ? args[portIndex + 1] : undefined;
const port = portArg ? parseInt(portArg) : 7000 + Math.floor(Math.random() * 1000);
const ttydPort = port + 1; // ttyd runs on adjacent port

// Generate token (unless public)
const token = isPublic ? null : crypto.randomUUID().slice(0, 8);

// Handle --replay
const replayIndex = args.findIndex((a) => a === "--replay");
if (replayIndex !== -1) {
  const replayFile = args[replayIndex + 1];
  if (!replayFile || !existsSync(replayFile)) {
    console.error("\x1b[31mReplay file not found\x1b[0m");
    process.exit(1);
  }
  console.log(`\x1b[90mReplaying ${replayFile}...\x1b[0m`);
  const player = Bun.spawn(["asciinema", "play", replayFile], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await player.exited;
  process.exit(0);
}

// Remove flags from command
const flagsToRemove = [
  "--public",
  "--interactive",
  "-i",
  "--consensus",
  "--record",
  "-R",
  "--no-tunnel",
  "--port",
  "--replay",
  "--raw",
];
const cmd = args.filter(
  (a, i) =>
    !flagsToRemove.includes(a) &&
    (portIndex === -1 || i !== portIndex + 1) &&
    (replayIndex === -1 || i !== replayIndex + 1) &&
    (consensusIndex === -1 || i !== consensusIndex + 1)
);

if (cmd.length === 0) {
  console.error("\x1b[31mNo command specified\x1b[0m");
  process.exit(1);
}

// Recording setup
let recordFile: string | null = null;
if (record) {
  const mogDir = `${homedir()}/.mog`;
  if (!existsSync(mogDir)) mkdirSync(mogDir, { recursive: true });
  recordFile = `${mogDir}/${Date.now()}.cast`;
  const header = {
    version: 2,
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
    timestamp: Math.floor(Date.now() / 1000),
    command: cmd.join(" "),
  };
  appendFileSync(recordFile, JSON.stringify(header) + "\n");
}

// Start ttyd (on internal port if using web UI, or main port if raw)
const actualTtydPort = rawMode ? port : ttydPort;
const ttydArgs = [
  "-p",
  String(actualTtydPort),
  "-t",
  "fontSize=14",
  "-t",
  "fontFamily='JetBrains Mono', 'Fira Code', monospace",
  "-t",
  "theme={'background':'#0d1117','foreground':'#c9d1d9','cursor':'#58a6ff','selectionBackground':'#3b5070'}",
];
if (readonly) ttydArgs.push("-R");
ttydArgs.push(...cmd);

const ttyd = Bun.spawn(["ttyd", ...ttydArgs], {
  stdout: "pipe",
  stderr: "pipe",
});

// Wait for ttyd to start
await Bun.sleep(500);

// Session config for web UI
let publicUrl = `http://localhost:${port}`;
const sessionConfig = {
  terminalUrl: `http://localhost:${ttydPort}`,
  publicUrl,
  command: cmd.join(" "),
  readonly: consensusMode ? true : readonly, // Consensus mode forces read-only display
  recording: record,
  token,
  consensus: consensusFixed ?? (consensusMode ? -1 : 0), // -1 = auto-scaling
};

// Consensus mode state
type Proposal = { id: string; command: string; votes: Set<string>; proposer: string };
const proposals: Map<string, Proposal> = new Map();
const viewers: Set<unknown> = new Set();

const broadcastState = () => {
  const required = getRequiredVotes(viewers.size);
  const state = {
    type: "state",
    proposals: [...proposals.values()].map((p) => ({
      id: p.id,
      command: p.command,
      votes: p.votes.size,
      proposer: p.proposer,
    })),
    viewers: viewers.size,
    required, // Dynamic based on viewer count
    auto: consensusFixed === null && consensusMode, // Is auto-scaling?
  };
  const msg = JSON.stringify(state);
  viewers.forEach((ws) => {
    try { (ws as { send: (m: string) => void }).send(msg); } catch {}
  });
};

const executeCommand = async (command: string) => {
  // Connect to ttyd WebSocket and send the command
  const ws = new WebSocket(`ws://localhost:${ttydPort}/ws`);
  ws.onopen = () => {
    // ttyd protocol: first byte is message type, 0 = input
    const encoder = new TextEncoder();
    const input = encoder.encode(command + "\n");
    const msg = new Uint8Array(input.length + 1);
    msg[0] = 0; // input type
    msg.set(input, 1);
    ws.send(msg);
    setTimeout(() => ws.close(), 100);
  };
};

// Start web UI server (unless raw mode)
let server: ReturnType<typeof Bun.serve> | null = null;
if (!rawMode) {
  server = Bun.serve({
    port,
    async fetch(req, server) {
      const url = new URL(req.url);

      // Token check
      if (token) {
        const reqToken = url.searchParams.get("token");
        if (reqToken !== token) {
          return new Response("Access denied. Token required.", { status: 403 });
        }
      }

      // WebSocket upgrade for consensus mode
      if (url.pathname === "/ws" && consensusMode) {
        const viewerId = crypto.randomUUID().slice(0, 8);
        const upgraded = server.upgrade(req, { data: { viewerId } });
        if (upgraded) return undefined;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // Routes
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(Bun.file(new URL("./web/index.html", import.meta.url)));
      }
      if (url.pathname === "/config.js") {
        return new Response(
          `window.__MOG_CONFIG__ = ${JSON.stringify(sessionConfig)};`,
          { headers: { "Content-Type": "application/javascript" } }
        );
      }
      if (url.pathname === "/app.ts" || url.pathname === "/app.js") {
        return new Response(Bun.file(new URL("./web/app.ts", import.meta.url)));
      }
      if (url.pathname === "/styles.css") {
        return new Response(Bun.file(new URL("./web/styles.css", import.meta.url)));
      }

      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      open(ws) {
        const viewerId = (ws.data as { viewerId: string }).viewerId;
        viewers.add(ws);
        console.log(`\x1b[90m→\x1b[0m \x1b[32m+viewer\x1b[0m ${viewerId} \x1b[90m(${viewers.size} watching)\x1b[0m`);
        broadcastState();
      },
      message(ws, message) {
        if (!consensusMode) return;

        try {
          const data = JSON.parse(String(message));
          const viewerId = (ws.data as { viewerId: string }).viewerId;

          if (data.type === "propose") {
            const id = crypto.randomUUID().slice(0, 8);
            proposals.set(id, {
              id,
              command: data.command,
              votes: new Set([viewerId]), // Proposer auto-votes
              proposer: viewerId,
            });
            const required = getRequiredVotes(viewers.size);
            console.log(`\x1b[90m→\x1b[0m \x1b[33mpropose\x1b[0m \x1b[90m$\x1b[0m ${data.command} \x1b[90m(1/${required} by ${viewerId})\x1b[0m`);
            broadcastState();
          }

          if (data.type === "vote") {
            const proposal = proposals.get(data.id);
            if (proposal) {
              proposal.votes.add(viewerId);
              const required = getRequiredVotes(viewers.size);
              console.log(`\x1b[90m→\x1b[0m \x1b[36mvote\x1b[0m \x1b[90m$\x1b[0m ${proposal.command} \x1b[90m(${proposal.votes.size}/${required} by ${viewerId})\x1b[0m`);

              // Check consensus (dynamic based on viewer count)
              if (proposal.votes.size >= required) {
                console.log(`\x1b[90m→\x1b[0m \x1b[32mexec\x1b[0m \x1b[90m$\x1b[0m ${proposal.command}`);
                executeCommand(proposal.command);
                proposals.delete(data.id);
                // Broadcast execution
                const msg = JSON.stringify({ type: "executed", command: proposal.command });
                viewers.forEach((v) => { try { (v as { send: (m: string) => void }).send(msg); } catch {} });
              }
              broadcastState();
            }
          }
        } catch {}
      },
      close(ws) {
        const viewerId = (ws.data as { viewerId: string }).viewerId;
        viewers.delete(ws);
        console.log(`\x1b[90m→\x1b[0m \x1b[31m-viewer\x1b[0m ${viewerId} \x1b[90m(${viewers.size} watching)\x1b[0m`);
        broadcastState();
      },
    },
  });
}

// Start cloudflare tunnel
let tunnel: ReturnType<typeof Bun.spawn> | null = null;
if (!noTunnel) {
  tunnel = Bun.spawn(
    ["cloudflared", "tunnel", "--url", `http://localhost:${port}`],
    { stdout: "pipe", stderr: "pipe" }
  );

  const decoder = new TextDecoder();
  const readTunnelUrl = async () => {
    const stderr = tunnel!.stderr;
    if (!stderr || typeof stderr === "number") return;
    const reader = stderr.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const match = text.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
      if (match) {
        publicUrl = match[0];
        sessionConfig.publicUrl = publicUrl;
        reader.releaseLock();
        break;
      }
    }
  };

  await Promise.race([
    readTunnelUrl(),
    Bun.sleep(15000).then(() => {
      if (!publicUrl.includes("trycloudflare")) {
        console.error("\x1b[33mTunnel timed out, using localhost\x1b[0m");
      }
    }),
  ]);
}

// Build shareable URL
const shareUrl = token ? `${publicUrl}?token=${token}` : publicUrl;

// Visual toggle display
const on = (label: string) => `\x1b[32m●\x1b[0m ${label}`;
const off = (label: string) => `\x1b[90m○ ${label}\x1b[0m`;

const toggles = [
  token ? on("token") : off("token"),
  isPublic ? on("public") : off("public"),
  interactive ? on("interactive") : off("interactive"),
  consensusMode
    ? on(`consensus${consensusFixed !== null ? ` (${consensusFixed})` : " (auto)"}`)
    : off("consensus"),
  record ? on("recording") : off("recording"),
];

// Print the URL
console.log();
console.log(`\x1b[90m┌${"─".repeat(shareUrl.length + 4)}┐\x1b[0m`);
console.log(`\x1b[90m│\x1b[0m  \x1b[1;36m${shareUrl}\x1b[0m  \x1b[90m│\x1b[0m`);
console.log(`\x1b[90m└${"─".repeat(shareUrl.length + 4)}┘\x1b[0m`);
console.log();
console.log(`\x1b[90m$\x1b[0m ${cmd.join(" ")}`);
console.log();
console.log(toggles.join("  "));
console.log();
if (recordFile) console.log(`\x1b[90mRecording to:\x1b[0m ${recordFile}`);
console.log(`\x1b[90mCtrl+C to stop\x1b[0m`);
console.log();

// Copy to clipboard (macOS)
try {
  const pbcopy = Bun.spawn(["pbcopy"], {
    stdin: new Response(shareUrl).body,
  });
  await pbcopy.exited;
  console.log(`\x1b[32m✓ URL copied to clipboard\x1b[0m`);
} catch {
  // Ignore clipboard errors
}

console.log();

// Cleanup
const cleanup = () => {
  ttyd.kill();
  tunnel?.kill();
  server?.stop();
  if (recordFile) {
    console.log(`\n\x1b[90mSession saved to: ${recordFile}\x1b[0m`);
  }
};

process.on("SIGINT", () => {
  console.log("\n\x1b[90mStopping...\x1b[0m");
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", cleanup);

await ttyd.exited;
cleanup();
