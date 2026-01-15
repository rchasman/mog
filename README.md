<p align="center">
  <img src="https://github.com/user-attachments/assets/placeholder.png" alt="mog demo" width="800">
</p>

<h1 align="center">mog</h1>

<p align="center">
  <strong>A primitive for watching terminals.</strong>
</p>

<p align="center">
  Stream any terminal session to a public URL in seconds.<br>
  One command. Instant URL. No server. No account.
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#usage">Usage</a> •
  <a href="#examples">Examples</a> •
  <a href="#how-it-works">How It Works</a>
</p>

---

## Why a Primitive?

mog does one thing: wrap any command in a shareable terminal.

What you build with it is up to you.

```bash
mog <anything>
# → https://random-words.trycloudflare.com
```

## Install

```bash
brew install ttyd cloudflared
git clone https://github.com/rchasman/mog && cd mog && bun link
```

## Usage

```bash
mog bash                     # Share a shell (read-only by default)
mog -i bash                  # Allow viewers to type
mog --record bun run dev     # Record for replay
```

```
┌──────────────────────────────────────────────────────────────┐
│  https://random-words-here.trycloudflare.com                 │
└──────────────────────────────────────────────────────────────┘
Sharing: claude
Press Ctrl+C to stop

✓ URL copied to clipboard
```

## Examples

mog is a primitive. Compose it with anything.

### Watch AI Agents Work
```bash
mog claude                              # Claude Code session
mog aider                               # Aider coding agent
mog goose session start                 # Block's Goose agent
mog agentfs exec sandbox.db bash        # Agent in isolated filesystem
```

### Live Dashboards
```bash
mog htop                                # System monitor
mog btop                                # Pretty resource monitor
mog watch -n1 kubectl get pods          # Kubernetes dashboard
mog tail -f /var/log/syslog             # Live log stream
```

### Collaborative Debugging
```bash
mog ssh prod-server                     # Share SSH session
mog docker exec -it api sh              # Inside a container
mog kubectl exec -it pod -- sh          # Inside a pod
mog gdb ./crash-dump                    # Debug session
```

### Build & Deploy Visibility
```bash
mog npm run build                       # Watch builds
mog docker build -t app .               # Container builds
mog terraform apply                     # Infrastructure changes
mog ansible-playbook deploy.yml         # Deployments
```

### Database Operations
```bash
mog psql -d production                  # Postgres session
mog mongosh                             # MongoDB shell
mog redis-cli monitor                   # Redis commands live
mog sqlite3 app.db                      # SQLite explorer
```

### Git & Code Review
```bash
mog tig                                 # Git history browser
mog lazygit                             # Git TUI
mog git log --oneline --graph           # Commit graph
mog diff-so-fancy < changes.diff        # Pretty diffs
```

### Pair Programming
```bash
mog vim                                 # Share vim session
mog nvim                                # Neovim
mog emacs -nw                           # Emacs in terminal
mog micro                               # Micro editor
```

### Network & Security
```bash
mog tcpdump -i any                      # Packet capture
mog nmap -sV target                     # Port scanning
mog wireshark -i eth0 -k                # Traffic analysis
mog mtr google.com                      # Network diagnostics
```

### Creative Uses
```bash
mog cmatrix                             # Matrix rain
mog asciiquarium                        # Fish tank
mog sl                                  # Steam locomotive
mog hollywood                           # Hacker movie mode
mog --record bash                       # Record & replay later
```

The pattern: `mog <command>` → instant public URL.

## Options

| Flag | Description |
|------|-------------|
| `--interactive, -i` | Allow viewers to type (default: read-only) |
| `--record, -R` | Save to `~/.mog/<timestamp>.cast` |
| `--replay <file>` | Replay recorded session |
| `--port <PORT>` | Specific port (default: random) |
| `--no-tunnel` | Localhost only |
| `--raw` | Skip web UI, raw ttyd |

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   Your      │────▶│    mog       │────▶│  Cloudflare Tunnel  │
│  Command    │     │  (ttyd+UI)   │     │  (public URL)       │
└─────────────┘     └──────────────┘     └─────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Viewers    │
                    │  (browser)   │
                    └──────────────┘
```

Built on:
- **[ttyd](https://github.com/tsl0922/ttyd)** — Terminal over WebSocket
- **[cloudflared](https://github.com/cloudflare/cloudflared)** — Instant tunnels

No server. No account. Just the primitive.

## License

MIT
