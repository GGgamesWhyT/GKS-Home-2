/**
 * Proxmox Widget - Displays cluster and node statisticsdsxfdsf
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

        // Check if this is a refresh (not first load)
        const isRefresh = this.container.classList.contains('loaded');

        // Sort nodes in specific order: proxmox, proxmox2, proxmox3
        const nodeOrder = ['proxmox', 'proxmox2', 'proxmox3'];
        const sortedNodes = [...data.nodes].sort((a, b) => {
            const indexA = nodeOrder.indexOf(a.node.toLowerCase());
            const indexB = nodeOrder.indexOf(b.node.toLowerCase());
            // If node not in order list, put at end
            const orderA = indexA === -1 ? 999 : indexA;
            const orderB = indexB === -1 ? 999 : indexB;
            return orderA - orderB;
        });

        const html = `
            <div class="node-grid">
                ${sortedNodes.map(node => this.renderNode(node)).join('')}
            </div>
        `;

        this.container.innerHTML = html;

        // Prevent animation replay on refresh
        if (!isRefresh) {
            this.container.classList.add('loaded');
        } else {
            // Remove animation from gauges on refresh
            this.container.querySelectorAll('.gauge-ring, .node-card').forEach(el => {
                el.style.animation = 'none';
            });
        }
    }

    renderNode(node) {
        const cpuPercent = Math.round((node.cpu || 0) * 100);
        const memPercent = Math.round(((node.mem || 0) / (node.maxmem || 1)) * 100);
        const diskPercent = Math.round(((node.disk || 0) / (node.maxdisk || 1)) * 100);
        const isOnline = node.status === 'online';

        // Format memory as GB
        const memUsedGB = ((node.mem || 0) / 1073741824).toFixed(1);
        const memTotalGB = ((node.maxmem || 0) / 1073741824).toFixed(0);

        // Format disk as GB/TB
        const diskUsedGB = ((node.disk || 0) / 1073741824).toFixed(0);
        const diskTotalGB = ((node.maxdisk || 0) / 1073741824).toFixed(0);

        // Calculate uptime if available
        const uptime = node.uptime ? this.formatUptime(node.uptime) : '';

        return `
            <div class="node-card ${isOnline ? 'online' : 'offline'}">
                <div class="node-header">
                    <div class="node-info">
                        <span class="status-indicator ${isOnline ? '' : 'offline'}"></span>
                        <span class="node-name">${node.node || 'Unknown'}</span>
                    </div>
                    <div class="node-meta">
                        ${node.vmCount !== undefined ? `<span class="vm-badge">${node.vmCount} VMs</span>` : ''}
                        ${uptime ? `<span class="uptime-badge">⏱ ${uptime}</span>` : ''}
                    </div>
                </div>
                
                <div class="node-gauges">
                    <div class="gauge-item">
                        <div class="gauge-ring" style="--percent: ${cpuPercent}; --color: ${this.getColorForPercent(cpuPercent)}">
                            <div class="gauge-inner">
                                <span class="gauge-value">${cpuPercent}%</span>
                            </div>
                        </div>
                        <span class="gauge-label">CPU</span>
                    </div>
                    
                    <div class="gauge-item">
                        <div class="gauge-ring" style="--percent: ${memPercent}; --color: ${this.getColorForPercent(memPercent)}">
                            <div class="gauge-inner">
                                <span class="gauge-value">${memPercent}%</span>
                            </div>
                        </div>
                        <span class="gauge-label">RAM</span>
                        <span class="gauge-detail">${memUsedGB}/${memTotalGB}GB</span>
                    </div>
                    
                    <div class="gauge-item">
                        <div class="gauge-ring" style="--percent: ${diskPercent}; --color: ${this.getColorForPercent(diskPercent)}">
                            <div class="gauge-inner">
                                <span class="gauge-value">${diskPercent}%</span>
                            </div>
                        </div>
                        <span class="gauge-label">Disk</span>
                        <span class="gauge-detail">${diskUsedGB}/${diskTotalGB}GB</span>
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

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        if (days > 0) return `${days}d ${hours}h`;
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
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
