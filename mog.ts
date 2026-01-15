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
  --interactive, -i Allow viewers to type (requires --public)
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
const portIndex = args.findIndex((a) => a === "--port");
const portArg = portIndex !== -1 ? args[portIndex + 1] : undefined;
const port = portArg ? parseInt(portArg) : 7000 + Math.floor(Math.random() * 1000);
const ttydPort = port + 1; // ttyd runs on adjacent port

// Generate token (unless public)
const token = isPublic ? null : crypto.randomUUID().slice(0, 8);

// Interactive requires public (explicit danger)
if (interactive && !isPublic) {
  console.error("\x1b[31mError: --interactive requires --public\x1b[0m");
  console.error("\x1b[90mThis is a safety measure. Use: mog --public -i <command>\x1b[0m");
  process.exit(1);
}

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
    (replayIndex === -1 || i !== replayIndex + 1)
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
  readonly,
  recording: record,
  token,
};

// Start web UI server (unless raw mode)
let server: ReturnType<typeof Bun.serve> | null = null;
if (!rawMode) {
  server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      // Token check
      if (token) {
        const reqToken = url.searchParams.get("token");
        if (reqToken !== token) {
          return new Response("Access denied. Token required.", { status: 403 });
        }
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

// Print the URL
console.log();
console.log(`\x1b[90m┌${"─".repeat(shareUrl.length + 4)}┐\x1b[0m`);
console.log(`\x1b[90m│\x1b[0m  \x1b[1;36m${shareUrl}\x1b[0m  \x1b[90m│\x1b[0m`);
console.log(`\x1b[90m└${"─".repeat(shareUrl.length + 4)}┘\x1b[0m`);
console.log();
console.log(`\x1b[90mSharing:\x1b[0m ${cmd.join(" ")}`);
if (token) console.log(`\x1b[90mAccess:\x1b[0m token required`);
if (isPublic) console.log(`\x1b[90mAccess:\x1b[0m public ${interactive ? "(interactive)" : "(read-only)"}`);
if (recordFile) console.log(`\x1b[90mRecording:\x1b[0m ${recordFile}`);
console.log(`\x1b[90mPress Ctrl+C to stop\x1b[0m`);
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
