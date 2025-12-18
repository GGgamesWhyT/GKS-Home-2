/**
 * GKS Index Page - Dashboard Overview
 * Mini-widgets with live data and toggle functionality
 */

class IndexDashboard {
    constructor() {
        this.widgetVisibility = this.loadVisibilitySettings();
        this.refreshInterval = null;
    }

    async init() {
        this.setupSettingsPanel();
        this.applyWidgetVisibility();
        await this.loadAllWidgetData();
        this.startAutoRefresh();
        this.updateMascotStatus();
        console.log('Index Dashboard initialized');
    }

    // ===== Widget Data Loading =====

    async loadAllWidgetData() {
        await Promise.all([
            this.loadProxmoxSummary(),
            this.loadContainersSummary(),
            this.loadServersSummary()
        ]);
    }

    async loadProxmoxSummary() {
        const widget = document.querySelector('.mini-widget.proxmox-mini');
        const statsEl = widget?.querySelector('.mini-widget-stats');
        if (!statsEl) return;

        try {
            const response = await fetch(`${CONFIG.apiBaseUrl}/proxmox/status`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();

            const nodes = data.nodes || [];
            const online = nodes.filter(n => n.status === 'online').length;
            const offline = nodes.length - online;

            statsEl.innerHTML = `
                <div class="mini-stat">
                    <span class="stat-dot online"></span>
                    <span class="mini-stat-value">${online}</span> Online
                </div>
                ${offline > 0 ? `
                <div class="mini-stat">
                    <span class="stat-dot offline"></span>
                    <span class="mini-stat-value">${offline}</span> Offline
                </div>
                ` : ''}
                <div class="mini-stat">
                    <span class="mini-stat-value">${nodes.length}</span> Nodes
                </div>
            `;

            this.proxmoxStatus = { online, offline, total: nodes.length };

            // Toggle offline class for mascot patrol
            if (offline > 0) widget.classList.add('offline');
            else widget.classList.remove('offline');

        } catch (error) {
            console.warn('Could not load Proxmox summary:', error);
            statsEl.innerHTML = `
                <div class="mini-stat">
                    <span class="stat-dot warning"></span>
                    Unable to connect
                </div>
            `;
            this.proxmoxStatus = { error: true };
            widget.classList.add('offline'); // Treat error as offline target
        }
    }

    async loadContainersSummary() {
        const widget = document.querySelector('.mini-widget.containers-mini');
        const statsEl = widget?.querySelector('.mini-widget-stats');
        if (!statsEl) return;

        try {
            const response = await fetch(`${CONFIG.apiBaseUrl}/portainer/containers`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            const containers = data.containers || [];

            const running = containers.filter(c => c.State === 'running').length;
            const stopped = containers.length - running;

            statsEl.innerHTML = `
                <div class="mini-stat">
                    <span class="stat-dot online"></span>
                    <span class="mini-stat-value">${running}</span> Running
                </div>
                ${stopped > 0 ? `
                <div class="mini-stat">
                    <span class="stat-dot offline"></span>
                    <span class="mini-stat-value">${stopped}</span> Stopped
                </div>
                ` : ''}
            `;

            this.containerStatus = { running, stopped, total: containers.length };

            // Toggle offline class for mascot patrol
            if (stopped > 0) widget.classList.add('offline');
            else widget.classList.remove('offline');

        } catch (error) {
            console.warn('Could not load Containers summary:', error);
            statsEl.innerHTML = `
                <div class="mini-stat">
                    <span class="stat-dot warning"></span>
                    Unable to connect
                </div>
            `;
            this.containerStatus = { error: true };
            widget.classList.add('offline');
        }
    }

    async loadServersSummary() {
        const widget = document.querySelector('.mini-widget.servers-mini');
        const statsEl = widget?.querySelector('.mini-widget-stats');
        if (!statsEl) return;

        try {
            const response = await fetch(`${CONFIG.apiBaseUrl}/pyrodactyl/servers`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();

            const servers = data.servers || [];
            const online = servers.filter(s => s.status === 'running').length;
            const offline = servers.filter(s => s.status === 'offline').length;
            const starting = servers.filter(s => s.status === 'starting').length;

            statsEl.innerHTML = `
                <div class="mini-stat">
                    <span class="stat-dot online"></span>
                    <span class="mini-stat-value">${online}</span> Online
                </div>
                ${offline > 0 ? `
                <div class="mini-stat">
                    <span class="stat-dot offline"></span>
                    <span class="mini-stat-value">${offline}</span> Offline
                </div>
                ` : ''}
                ${starting > 0 ? `
                <div class="mini-stat">
                    <span class="stat-dot warning"></span>
                    <span class="mini-stat-value">${starting}</span> Starting
                </div>
                ` : ''}
            `;

            this.serverStatus = { online, offline, starting, total: servers.length };

            // Toggle offline class for mascot patrol
            if (offline > 0) widget.classList.add('offline');
            else widget.classList.remove('offline');

        } catch (error) {
            console.warn('Could not load Servers summary:', error);
            statsEl.innerHTML = `
                <div class="mini-stat">
                    <span class="stat-dot warning"></span>
                    Unable to connect
                </div>
            `;
            this.serverStatus = { error: true };
            widget.classList.add('offline');
        }
    }

    // ===== Auto Refresh =====

    startAutoRefresh() {
        // Refresh data every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadAllWidgetData();
            this.updateMascotStatus();
        }, 30000);
    }

    // ===== Mascot Status =====

    updateMascotStatus() {
        if (!window.mascotBuddy) return;

        // Calculate counts
        const proxmoxOffline = (this.proxmoxStatus?.offline || 0) + (this.proxmoxStatus?.error ? 1 : 0);
        const serversOffline = (this.serverStatus?.offline || 0) + (this.serverStatus?.error ? 1 : 0);
        const containersStopped = (this.containerStatus?.stopped || 0) + (this.containerStatus?.error ? 1 : 0);

        // Update MascotBuddy state
        // We combine Proxmox and Game Servers offline counts into the 'servers' bucket for the mascot
        // This triggers the patrol logic which looks for .mini-widget.offline
        const totalServerIssues = proxmoxOffline + serversOffline;

        // Create dummy array for servers matching the count
        const dummyServers = Array(totalServerIssues).fill({ status: 'offline' });

        window.mascotBuddy.setOfflineServers(dummyServers);
        window.mascotBuddy.setContainerStatus(containersStopped, this.containerStatus?.running || 0);
    }

    // ===== Widget Visibility Settings =====

    loadVisibilitySettings() {
        const saved = localStorage.getItem('gks-widget-visibility');
        return saved ? JSON.parse(saved) : {
            proxmox: true,
            containers: true,
            servers: true
        };
    }

    saveVisibilitySettings() {
        localStorage.setItem('gks-widget-visibility', JSON.stringify(this.widgetVisibility));
    }

    applyWidgetVisibility() {
        Object.entries(this.widgetVisibility).forEach(([widget, visible]) => {
            const el = document.querySelector(`[data-widget="${widget}"]`);
            if (el) {
                el.classList.toggle('hidden', !visible);
            }
            // Update toggle switch
            const toggle = document.querySelector(`[data-toggle="${widget}"]`);
            if (toggle) {
                toggle.classList.toggle('active', visible);
            }
        });
    }

    toggleWidget(widgetName, visible) {
        const widget = document.querySelector(`[data-widget="${widgetName}"]`);
        if (!widget) return;

        if (visible) {
            widget.classList.remove('hidden');
            widget.classList.add('showing');
            setTimeout(() => widget.classList.remove('showing'), 300);
        } else {
            widget.classList.add('hiding');
            setTimeout(() => {
                widget.classList.add('hidden');
                widget.classList.remove('hiding');
            }, 300);
        }

        this.widgetVisibility[widgetName] = visible;
        this.saveVisibilitySettings();
    }

    // ===== Settings Panel =====

    setupSettingsPanel() {
        const settingsBtn = document.getElementById('widget-settings-btn');
        const panel = document.getElementById('widget-settings-panel');
        const overlay = document.getElementById('widget-settings-overlay');
        const closeBtn = document.getElementById('settings-close-btn');

        if (!settingsBtn || !panel) return;

        // Open panel
        settingsBtn.addEventListener('click', () => {
            panel.classList.add('active');
            overlay?.classList.add('active');
        });

        // Close panel
        const closePanel = () => {
            panel.classList.remove('active');
            overlay?.classList.remove('active');
        };

        closeBtn?.addEventListener('click', closePanel);
        overlay?.addEventListener('click', closePanel);

        // Toggle switches
        document.querySelectorAll('.toggle-switch[data-toggle]').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const widgetName = toggle.dataset.toggle;
                const newState = !toggle.classList.contains('active');
                toggle.classList.toggle('active', newState);
                this.toggleWidget(widgetName, newState);
            });
        });
    }
}

// ===== Greeting & Time =====

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Welcome';
    let emoji = '👋';

    if (hour >= 5 && hour < 12) {
        greeting = 'Good morning';
        emoji = '☀️';
    } else if (hour >= 12 && hour < 17) {
        greeting = 'Good afternoon';
        emoji = '🌤️';
    } else if (hour >= 17 && hour < 21) {
        greeting = 'Good evening';
        emoji = '🌅';
    } else {
        greeting = 'Good night';
        emoji = '🌙';
    }

    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        greetingEl.textContent = `${emoji} ${greeting}`;
    }
}

function updateTime() {
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
        timeEl.textContent = `${date} • ${time}`;
    }
}

// ===== Theme Toggle =====

function initTheme() {
    const savedTheme = localStorage.getItem('gks-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('gks-theme', next);
    });
}

// ===== Burger Menu =====

function initBurgerMenu() {
    const burgerBtn = document.getElementById('burger-menu');
    const mobileNav = document.getElementById('mobile-nav');

    if (!burgerBtn || !mobileNav) return;

    burgerBtn.addEventListener('click', () => {
        burgerBtn.classList.toggle('active');
        mobileNav.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.burger-menu') && !e.target.closest('.mobile-nav')) {
            burgerBtn.classList.remove('active');
            mobileNav.classList.remove('active');
        }
    });
}

// ===== Initialize =====

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    initTheme();
    initBurgerMenu();
    updateGreeting();
    updateTime();
    setInterval(updateTime, 1000);

    const dashboard = new IndexDashboard();
    await dashboard.init();
    window.indexDashboard = dashboard;
});
