<p align="center">
  <img src="https://github.com/user-attachments/assets/placeholder.png" alt="mog demo" width="800">
</p>

<h1 align="center">mog</h1>

<p align="center">
  <strong>Interactive terminal streaming.</strong>
</p>

<p align="center">
  Share any terminal to a public URL. Watch or take control.<br>
  One command. Instant URL. No server. No account.
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#security-model">Security</a> •
  <a href="#examples">Examples</a> •
  <a href="#how-it-works">How It Works</a>
</p>

---

## Security Model

**Token** (default) — Only people you share the URL with can access.
```bash
mog bash                      # → https://...?token=a1b2c3d4
mog -i bash                   # → same, but interactive
```

**Public** — No token. Anyone who finds the URL can access.
```bash
mog --public bash             # → https://...
mog --public -i bash          # → same, but interactive
```

---

## Install

```bash
brew install ttyd cloudflared
git clone https://github.com/rchasman/mog && cd mog && bun link
```

## Usage

```bash
mog <command>                 # Watch mode (read-only)
mog -i <command>              # Interactive mode (viewers can type)
```

```
┌──────────────────────────────────────────────────────────────┐
│  https://random-words-here.trycloudflare.com                 │
└──────────────────────────────────────────────────────────────┘
Sharing: bash
Mode: interactive (viewers can type)
Press Ctrl+C to stop

✓ URL copied to clipboard
```

---

## Examples

### 🔴 Watch Mode — Safe Sharing

Perfect for demos, monitoring, and showing work.

```bash
# AI Agents
mog claude                              # Watch Claude Code work
mog aider                               # Aider coding agent
mog agentfs exec sandbox.db bash        # Agent in sandboxed filesystem

# Live Dashboards
mog htop                                # System monitor
mog watch -n1 kubectl get pods          # Kubernetes status
mog tail -f /var/log/app.log            # Live logs

# Build Visibility
mog npm run build                       # Watch builds
mog docker build -t app .               # Container builds
mog terraform apply                     # Infrastructure changes
```

### 🟢 Interactive Mode — Collaborative Control

Share control with anyone who has the URL.

```bash
# Pair Programming
mog -i vim main.rs                      # Co-edit in vim
mog -i nvim                             # Neovim session
mog -i emacs -nw                        # Emacs collaboration

# Remote Assistance
mog -i bash                             # Hand over your shell
mog -i ssh prod-server                  # Shared SSH session
mog -i docker exec -it api sh           # Inside a container together

# Teaching & Onboarding
mog -i psql -d mydb                     # Walk through SQL together
mog -i git rebase -i HEAD~5             # Teach git interactively
mog -i kubectl debug pod -- sh          # Debug together

# Mob Programming
mog -i bash                             # Whole team, one terminal
# Everyone types. Everyone sees. True mob programming.
```

### 🎬 Record & Replay

```bash
mog --record claude                     # Record an agent session
mog --replay ~/.mog/1234567890.cast     # Play it back later
```

---

## The Primitive

mog does one thing: wrap any command in a shareable, optionally interactive terminal.

```
mog <command>        → watch
mog -i <command>     → interact
```

What you build with it is up to you:
- **Agent observability** — Watch AI work in sandboxes
- **Live support** — Hand control to someone who can help
- **Pair/mob programming** — Real-time collaboration
- **Demos** — Safe read-only sharing
- **Teaching** — Interactive walkthroughs

---

## Options

| Flag | Description |
|------|-------------|
| `--public` | No token required (default: token required) |
| `-i, --interactive` | Viewers can type (default: read-only) |
| `--consensus N` | Viewers vote on commands, N votes to execute |
| `-R, --record` | Save to `~/.mog/<timestamp>.cast` |
| `--replay <file>` | Replay recorded session |
| `--port <PORT>` | Specific port (default: random) |
| `--no-tunnel` | Localhost only |
| `--raw` | Skip web UI, raw ttyd |

## Consensus Mode

Democratic terminal. Viewers propose commands, vote to execute.

```bash
mog --consensus 2 bash    # 2 votes needed
mog --consensus 3 psql    # 3 votes for database access
```

Like Twitch Plays Pokemon, but for shells.

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   Your      │────▶│    mog       │────▶│  Cloudflare Tunnel  │
│  Command    │     │  (ttyd+UI)   │     │  (public URL)       │
└─────────────┘     └──────────────┘     └─────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Viewers    │◀─── Watch or type (if -i)
                    │  (browser)   │
                    └──────────────┘
```

Built on:
- **[ttyd](https://github.com/tsl0922/ttyd)** — Terminal over WebSocket
- **[cloudflared](https://github.com/cloudflare/cloudflared)** — Instant tunnels

No server. No account. Just the primitive.

## License

MIT
