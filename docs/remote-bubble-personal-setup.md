# Remote Bubble — Personal Network Setup Guide

This guide covers how to make your remote server reachable from your laptop for [Remote Bubble Execution](remote-bubble-execution.md). This is infrastructure setup outside of Pairflow — choose whatever fits your situation.

---

## The requirement

Pairflow needs one thing: your laptop can run `ssh <hostname>` and reach the remote server. How you achieve that is up to you.

---

## Option 1: Same LAN (simplest)

If your laptop and server are on the same network (home WiFi, office LAN):

```bash
# Find the server's IP
remote$ hostname -I
# → 192.168.1.50

# SSH config on laptop
# ~/.ssh/config
Host myserver
  HostName 192.168.1.50
  User myuser
  IdentityFile ~/.ssh/id_ed25519
```

**Limitation:** Only works when you're on the same network. If you take your laptop to a café, you lose access.

---

## Option 2: Tailscale (recommended for personal use)

[Tailscale](https://tailscale.com) creates a private mesh network between your devices using WireGuard. Your server gets a stable hostname that works from anywhere — home, office, café, mobile hotspot.

### Setup

```bash
# On the remote server (Linux)
remote$ curl -fsSL https://tailscale.com/install.sh | sh
remote$ sudo tailscale up

# On the laptop (macOS)
laptop$ brew install tailscale
# or install from App Store / https://tailscale.com/download
laptop$ tailscale up
```

Both devices authenticate with the same Tailscale account (Google, GitHub, Microsoft, etc.).

### SSH config

```bash
# ~/.ssh/config
Host myserver
  HostName myserver           # Tailscale MagicDNS name
  User myuser
  IdentityFile ~/.ssh/id_ed25519
```

With MagicDNS enabled (default), you can use the machine name directly. Alternatively, use the Tailscale IP (100.x.y.z).

### Pairflow config

```toml
# ~/.pairflow/config.toml
[remotes.myserver]
host = "myserver"             # same as SSH config Host
repo_base = "~/repos"
default_port_forwards = [3000]
```

### Why Tailscale works well for this

- **Peer-to-peer:** Traffic goes directly between devices (low latency, important for interactive tmux)
- **Always reachable:** Works across any network, NAT, firewall
- **Zero exposed ports:** The server has no public ports — only Tailscale peers can reach it
- **Auto-reconnect:** Survives network changes (WiFi → mobile, sleep → wake)
- **Free tier:** 100 devices, 3 users — more than enough for personal use

---

## Option 3: WireGuard (manual)

Same technology as Tailscale, but self-managed. More control, more configuration.

```bash
# On the remote server
remote$ sudo apt install wireguard
remote$ wg genkey | tee server_private.key | wg pubkey > server_public.key

# Configure /etc/wireguard/wg0.conf
# (see WireGuard documentation for full setup)

# On the laptop
laptop$ brew install wireguard-tools
# Configure matching peer config
```

**When to choose this over Tailscale:** When you want full control over the VPN infrastructure, don't want any third-party coordination server, or have specific network topology requirements.

---

## Option 4: Cloudflare Tunnel

[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) creates outbound-only connections from your server to Cloudflare's edge. Good for exposing HTTP services publicly, but adds complexity for SSH.

### SSH via Cloudflare Tunnel

```bash
# On the remote server
remote$ curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
remote$ chmod +x cloudflared
remote$ cloudflared tunnel login
remote$ cloudflared tunnel create myserver
remote$ cloudflared tunnel route dns myserver ssh.mydomain.com

# Configure tunnel to forward SSH
# ~/.cloudflared/config.yml
tunnel: <tunnel-id>
credentials-file: /home/myuser/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: ssh.mydomain.com
    service: ssh://localhost:22
  - service: http_status:404

remote$ cloudflared tunnel run myserver
```

```bash
# On the laptop — SSH ProxyCommand
# ~/.ssh/config
Host myserver
  HostName ssh.mydomain.com
  User myuser
  ProxyCommand cloudflared access ssh --hostname %h
  IdentityFile ~/.ssh/id_ed25519
```

### Comparison with Tailscale for this use case

| Aspect | Tailscale | Cloudflare Tunnel |
|--------|-----------|-------------------|
| SSH setup | Native, zero config | Needs ProxyCommand + cloudflared |
| Port forwarding | Native `ssh -L` | Each port needs tunnel config |
| Latency | Direct peer-to-peer | Routes through Cloudflare edge |
| Needs a domain | No | Yes |
| Best for | Private device-to-device | Exposing services publicly |

**Recommendation:** For the Pairflow use case (private SSH to your own server with port forwarding), Tailscale is simpler. Consider Cloudflare Tunnel if you already use Cloudflare, need public URLs, or want team-wide access with SSO policies.

---

## Option 5: SSH over the internet (port forwarding on router)

If your server has a public IP or you can forward port 22 on your router:

```bash
# Router config: forward external port 2222 → server:22

# Dynamic DNS (if no static IP)
# Use a service like duckdns.org, noip.com, etc.

# ~/.ssh/config
Host myserver
  HostName myserver.duckdns.org
  Port 2222
  User myuser
  IdentityFile ~/.ssh/id_ed25519
```

**Security considerations:**
- Always use key-based authentication (disable password login)
- Consider fail2ban or similar intrusion prevention
- Use a non-standard port to reduce noise
- This directly exposes your server to the internet — understand the risks

---

## Verifying your setup

Regardless of which option you chose, verify it works:

```bash
# Basic connectivity
laptop$ ssh myserver "echo ok"
# → ok

# Pairflow-specific check
laptop$ ssh myserver "pairflow --version"
# → pairflow x.y.z

laptop$ ssh myserver "claude auth status"
# → { "loggedIn": true, "subscriptionType": "max", ... }

# Port forwarding test
laptop$ ssh -L 8888:localhost:8888 myserver "python3 -m http.server 8888"
# → open http://localhost:8888 in browser → should see directory listing
```

Once these work, Pairflow remote bubbles will work — no Pairflow-specific network configuration is needed.
