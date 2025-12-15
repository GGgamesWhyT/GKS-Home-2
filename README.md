# GKS Home Dashboard

A personal home dashboard with integrations for Proxmox, Jellyfin, Jellyseerr, and TVDB.

## Features

- 📊 **Proxmox Stats** - Real-time CPU, RAM, disk usage and VM counts
- 🎬 **Jellyfin Recent** - Recently added movies and shows with posters
- 📋 **Jellyseerr Requests** - Media request status tracking
- 🌙 **Dark/Light Mode** - Theme toggle with persistence
- 🔔 **Notifications** - Alerts for new content
- ↔️ **Draggable Widgets** - Customizable layout

## Quick Start

### 1. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 2. Run with Docker

```bash
docker-compose up -d
```

### 3. Access Dashboard

Open `http://localhost:3000` in your browser.

## API Credentials

### Proxmox
1. Go to Datacenter → Permissions → API Tokens
2. Create a new token with appropriate permissions
3. Copy the Token ID and Secret

### Jellyfin
1. Go to Dashboard → API Keys
2. Create a new API key
3. Get your User ID from Dashboard → Users

### Jellyseerr
1. Go to Settings → General
2. Copy the API Key

### TVDB (Optional)
1. Register at thetvdb.com
2. Apply for a v4 API key

## Development

```bash
cd server
npm install
npm start
```

## License

MIT
