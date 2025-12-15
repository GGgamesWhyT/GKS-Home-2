# Portainer Stack Deployment Guide for GKS Home Dashboard

## Option 1: Deploy from Git Repository (Recommended)

If your code is in a Git repository (GitHub, GitLab, etc.):

1. **Push your code to Git** (if not already):
   ```bash
   git init
   git add .
   git commit -m "GKS Home Dashboard"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **In Portainer**:
   - Go to **Stacks** → **+ Add stack**
   - Select **Repository**
   - Enter your repository URL
   - Set repository reference: `main` (or your branch)
   - Set compose path: `docker-compose.yml`
   - Add environment variables (see below)
   - Click **Deploy the stack**

---

## Option 2: Deploy with Stack File (Copy/Paste)

Copy this stack configuration into Portainer:

```yaml
version: '3.8'

services:
  gks-home:
    build:
      context: https://github.com/YOUR_USERNAME/GKS-Home.git
    container_name: gks-home
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PROXMOX_HOST=https://your-proxmox-ip:8006
      - PROXMOX_TOKEN_ID=user@pam!tokenid
      - PROXMOX_TOKEN_SECRET=your-token-secret
      - JELLYFIN_URL=http://your-jellyfin-ip:8096
      - JELLYFIN_API_KEY=your-jellyfin-api-key
      - JELLYSEERR_URL=http://your-jellyseerr-ip:5055
      - JELLYSEERR_API_KEY=your-jellyseerr-api-key
      - EXTERNAL_PROXMOX_URL=https://your-proxmox-ip:8006
      - EXTERNAL_JELLYFIN_URL=http://your-jellyfin-ip:8096
      - EXTERNAL_JELLYSEERR_URL=http://your-jellyseerr-ip:5055
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

---

## Option 3: Build Image Locally, Push to Registry

1. **Build the Docker image**:
   ```bash
   cd /path/to/GKS-Home
   docker build -t your-registry/gks-home:latest .
   docker push your-registry/gks-home:latest
   ```

2. **Use this stack in Portainer**:
   ```yaml
   version: '3.8'

   services:
     gks-home:
       image: your-registry/gks-home:latest
       container_name: gks-home
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - PROXMOX_HOST=https://your-proxmox-ip:8006
         - PROXMOX_TOKEN_ID=user@pam!tokenid
         - PROXMOX_TOKEN_SECRET=your-token-secret
         - JELLYFIN_URL=http://your-jellyfin-ip:8096
         - JELLYFIN_API_KEY=your-jellyfin-api-key
         - JELLYSEERR_URL=http://your-jellyseerr-ip:5055
         - JELLYSEERR_API_KEY=your-jellyseerr-api-key
         - EXTERNAL_PROXMOX_URL=https://proxmox.yourdomain.com
         - EXTERNAL_JELLYFIN_URL=https://jellyfin.yourdomain.com
         - EXTERNAL_JELLYSEERR_URL=https://jellyseerr.yourdomain.com
       restart: unless-stopped
   ```

---

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PROXMOX_HOST` | Proxmox API URL | `https://192.168.1.100:8006` |
| `PROXMOX_TOKEN_ID` | API Token ID | `root@pam!dashboard` |
| `PROXMOX_TOKEN_SECRET` | API Token Secret | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `JELLYFIN_URL` | Jellyfin server URL | `http://192.168.1.101:8096` |
| `JELLYFIN_API_KEY` | Jellyfin API key | Get from Admin → API Keys |
| `JELLYSEERR_URL` | Jellyseerr URL | `http://192.168.1.102:5055` |
| `JELLYSEERR_API_KEY` | Jellyseerr API key | Get from Settings → General |
| `EXTERNAL_PROXMOX_URL` | Public Proxmox URL | For header links |
| `EXTERNAL_JELLYFIN_URL` | Public Jellyfin URL | For header links |
| `EXTERNAL_JELLYSEERR_URL` | Public Jellyseerr URL | For header links |

---

## Adding a Reverse Proxy (Optional)

If using Traefik or Nginx Proxy Manager, add labels:

```yaml
services:
  gks-home:
    # ... existing config ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.gks-home.rule=Host(`home.yourdomain.com`)"
      - "traefik.http.routers.gks-home.entrypoints=websecure"
      - "traefik.http.routers.gks-home.tls.certresolver=myresolver"
```

---

## Troubleshooting

- **Container won't start**: Check environment variables are set correctly
- **Can't connect to Proxmox**: Ensure `PROXMOX_TOKEN_ID` uses format `user@pam!tokenname`
- **API errors**: Check the container logs with `docker logs gks-home`
