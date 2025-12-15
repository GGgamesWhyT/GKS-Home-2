/**
 * Proxmox Widget - Displays cluster and node statistics
 */

class ProxmoxWidget {
    constructor() {
        this.container = document.getElementById('proxmox-content');
    }

    async load() {
        try {
            const data = await API.fetch('/proxmox/status');
            this.render(data);
        } catch (error) {
            this.renderError();
        }
    }

    render(data) {
        if (!data || !data.nodes || data.nodes.length === 0) {
            this.renderEmpty();
            return;
        }

        const html = `
            <div class="node-grid">
                ${data.nodes.map(node => this.renderNode(node)).join('')}
            </div>
        `;

        this.container.innerHTML = html;
    }

    renderNode(node) {
        const cpuPercent = Math.round((node.cpu || 0) * 100);
        const memPercent = Math.round(((node.mem || 0) / (node.maxmem || 1)) * 100);
        const diskPercent = Math.round(((node.disk || 0) / (node.maxdisk || 1)) * 100);
        const isOnline = node.status === 'online';

        return `
            <div class="node-card">
                <div class="node-header">
                    <span class="node-name">
                        <span class="status-dot ${isOnline ? '' : 'offline'}"></span>
                        ${node.node || 'Unknown'}
                    </span>
                    <span class="node-status">${node.status || 'unknown'}</span>
                </div>
                <div class="node-stats">
                    <div class="stat">
                        <div class="stat-label">CPU</div>
                        <div class="stat-value">${cpuPercent}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${cpuPercent}%"></div>
                        </div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">RAM</div>
                        <div class="stat-value">${memPercent}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${memPercent}%"></div>
                        </div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Disk</div>
                        <div class="stat-value">${diskPercent}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${diskPercent}%"></div>
                        </div>
                    </div>
                </div>
                ${node.vmCount !== undefined ? `
                    <div class="node-vms">
                        <small>${node.vmCount} VMs running</small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p>Failed to load Proxmox data</p>
                <button class="retry-btn" onclick="window.dashboard?.widgets.get('proxmox')?.load()">Retry</button>
            </div>
        `;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="empty-state">
                <p>No Proxmox nodes found</p>
            </div>
        `;
    }
}

// Export
window.ProxmoxWidget = ProxmoxWidget;
