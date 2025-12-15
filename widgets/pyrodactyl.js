/**
 * Pyrodactyl Widget - Displays game server stats and connection info
 * Uses Pterodactyl-compatible Client API
 */

class PyrodactylWidget {
    constructor() {
        this.container = document.getElementById('pyrodactyl-content');
    }

    async load() {
        try {
            const data = await API.fetch('/pyrodactyl/servers');
            this.render(data);
        } catch (error) {
            this.renderError();
        }
    }

    render(data) {
        if (!data || !data.servers || data.servers.length === 0) {
            this.renderEmpty();
            return;
        }

        const html = `
            <div class="server-grid">
                ${data.servers.map(server => this.renderServer(server)).join('')}
            </div>
        `;

        this.container.innerHTML = html;
    }

    renderServer(server) {
        // Check various forms of "online" status
        const status = (server.status || '').toLowerCase();
        const isOnline = status === 'running' || status === 'online' || status === 'started';
        const isStarting = status === 'starting' || status === 'start';
        const statusClass = isOnline ? 'online' : (isStarting ? 'starting' : 'offline');
        const statusText = isOnline ? 'Online' : (isStarting ? 'Starting' : 'Offline');

        // Resource percentages - handle unlimited (0) limits
        const cpuPercent = Math.min(100, Math.round(server.resources?.cpu || 0));

        // Memory: if limit is 0 or missing, show usage as percentage of a reasonable max
        const memLimit = server.limits?.memory || 0;
        const memUsed = server.resources?.memory || 0;
        const memPercent = memLimit > 0
            ? Math.min(100, Math.round((memUsed / memLimit) * 100))
            : 0;

        // Disk: if limit is 0 (unlimited), just show used amount, not percentage
        const diskLimit = server.limits?.disk || 0;
        const diskUsed = server.resources?.disk || 0;
        const diskPercent = diskLimit > 0
            ? Math.min(100, Math.round((diskUsed / diskLimit) * 100))
            : 0; // Show 0% for unlimited

        // Format memory as MB/GB
        const memUsedMB = (memUsed / 1048576).toFixed(0);
        const memTotalMB = (memLimit / 1048576).toFixed(0);
        const memDisplay = memLimit > 0
            ? (memTotalMB >= 1024
                ? `${(memUsedMB / 1024).toFixed(1)}/${(memTotalMB / 1024).toFixed(1)}GB`
                : `${memUsedMB}/${memTotalMB}MB`)
            : `${memTotalMB >= 1024 ? (memUsedMB / 1024).toFixed(1) + 'GB' : memUsedMB + 'MB'}`;

        // Format disk as MB/GB - handle unlimited
        const diskUsedMB = (diskUsed / 1048576).toFixed(0);
        const diskTotalMB = (diskLimit / 1048576).toFixed(0);
        const diskDisplay = diskLimit > 0
            ? (diskTotalMB >= 1024
                ? `${(diskUsedMB / 1024).toFixed(1)}/${(diskTotalMB / 1024).toFixed(1)}GB`
                : `${diskUsedMB}/${diskTotalMB}MB`)
            : `${diskUsedMB >= 1024 ? (diskUsedMB / 1024).toFixed(1) + 'GB' : diskUsedMB + 'MB'} used`;

        // Connection info
        const connectionInfo = server.allocation
            ? `${server.allocation.ip}:${server.allocation.port}`
            : '';

        return `
            <div class="server-card ${statusClass}">
                <div class="server-header">
                    <div class="server-info">
                        <span class="status-indicator ${statusClass}"></span>
                        <span class="server-name">${server.name || 'Unknown Server'}</span>
                    </div>
                    <div class="server-meta">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                ${connectionInfo ? `
                <div class="connection-info">
                    <span class="connection-label">Connect:</span>
                    <code class="connection-address" onclick="navigator.clipboard.writeText('${connectionInfo}').then(() => window.dashboard?.showNotification('Address copied!', 'success'))" title="Click to copy">
                        ${connectionInfo}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </code>
                </div>
                ` : ''}
                
                <div class="server-gauges">
                    <div class="gauge-item">
                        <div class="gauge-ring animated" style="--percent: ${cpuPercent}; --color: ${this.getColorForPercent(cpuPercent)}">
                            <div class="gauge-inner">
                                <span class="gauge-value">${cpuPercent}%</span>
                            </div>
                        </div>
                        <span class="gauge-label">CPU</span>
                    </div>
                    
                    <div class="gauge-item">
                        <div class="gauge-ring animated" style="--percent: ${memPercent}; --color: ${this.getColorForPercent(memPercent)}; animation-delay: 0.1s">
                            <div class="gauge-inner">
                                <span class="gauge-value">${memPercent}%</span>
                            </div>
                        </div>
                        <span class="gauge-label">RAM</span>
                        <span class="gauge-detail">${memDisplay}</span>
                    </div>
                    
                    <div class="gauge-item">
                        <div class="gauge-ring animated" style="--percent: ${diskPercent}; --color: ${diskLimit > 0 ? this.getColorForPercent(diskPercent) : 'var(--text-muted)'}; animation-delay: 0.2s">
                            <div class="gauge-inner">
                                <span class="gauge-value">${diskLimit > 0 ? diskPercent + '%' : '∞'}</span>
                            </div>
                        </div>
                        <span class="gauge-label">Disk</span>
                        <span class="gauge-detail">${diskDisplay}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getColorForPercent(percent) {
        if (percent < 50) return 'var(--status-online)';
        if (percent < 80) return 'var(--status-warning)';
        return 'var(--status-offline)';
    }

    renderError() {
        this.container.innerHTML = `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p>Failed to load Pyrodactyl data</p>
                <button class="retry-btn" onclick="window.dashboard?.widgets.get('pyrodactyl')?.load()">Retry</button>
            </div>
        `;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="empty-state">
                <p>No game servers found</p>
            </div>
        `;
    }
}

// Export
window.PyrodactylWidget = PyrodactylWidget;
