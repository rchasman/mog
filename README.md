<p align="center">
  <img src="https://github.com/user-attachments/assets/placeholder.png" alt="mog demo" width="800">
</p>

<h1 align="center">mog</h1>

<p align="center">
  <strong>Watch your AI agents work.</strong>
</p>

<p align="center">
  Stream any terminal session to a public URL in seconds.<br>
  Built for AI agent sandboxes, Claude Code demos, and remote supervision.
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#usage">Usage</a> •
  <a href="#why">Why</a> •
  <a href="#integrations">Integrations</a>
</p>

---

## Why

Existing agent observability tools show you traces and metrics.

**mog shows you the actual terminal** — watch your agent type, run commands, and edit files in real-time.

| Tool | What you see |
|------|--------------|
| LangSmith | "Agent made 5 tool calls, 2.3k tokens" |
| **mog** | *Agent typing `git diff`, running tests, fixing bugs* |

## Install

```bash
# Dependencies
brew install ttyd cloudflared

# Install mog
bun install -g mog
# or clone and link
git clone https://github.com/roeychasman/mog && cd mog && bun link
```

## Usage

```bash
# Watch Claude Code work
mog claude

# Share any command
mog bash
mog htop
mog bun run dev

# Options
mog --readonly claude    # Viewers can't type
mog --record bash        # Save session for replay
mog --no-tunnel bash     # Localhost only
```

Prints a public URL, copies to clipboard. Share with your team:

```
┌──────────────────────────────────────────────────────────────┐
│  https://random-words-here.trycloudflare.com                 │
└──────────────────────────────────────────────────────────────┘
Sharing: claude
Web UI: http://localhost:7123
Press Ctrl+C to stop

✓ URL copied to clipboard
```

## Options

| Flag | Description |
|------|-------------|
| `--readonly, -r` | Viewers cannot type (safe for demos) |
| `--record, -R` | Record session to `~/.mog/<timestamp>.cast` |
| `--replay <file>` | Replay a recorded session |
| `--port <PORT>` | Use specific port (default: random 7000-8000) |
| `--no-tunnel` | Skip public URL (localhost only) |
| `--raw` | Use raw ttyd without web UI wrapper |

## Integrations

### Claude Code
```bash
mog claude
# Stakeholders watch your coding agent work
```

### AgentFS Sandboxes
```bash
mog agentfs exec agent.db bash
# Watch agents in isolated filesystems
```

### Remote Agents
```bash
mog ssh agent@server "cd /workspace && bash"
# Debug why an agent is stuck
```

### Session Recording
```bash
mog --record claude
# Review what the agent did later
mog --replay ~/.mog/1234567890.cast
```

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   Your      │────▶│    mog       │────▶│  Cloudflare Tunnel  │
│  Terminal   │     │  (ttyd+UI)   │     │  (public URL)       │
└─────────────┘     └──────────────┘     └─────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Viewers    │
                    │  (browser)   │
                    └──────────────┘
```

- **[ttyd](https://github.com/tsl0922/ttyd)** — Battle-tested terminal-over-web
- **[cloudflared](https://github.com/cloudflare/cloudflared)** — Instant public tunnels, no account needed
- **Web UI** — Clean status display, copy URL button, connection state

No server to deploy. No accounts. Just run the command.

## Development

```bash
git clone https://github.com/roeychasman/mog
cd mog
bun install
bun ./mog.ts --no-tunnel bash
```

## License

MIT
