/**
 * Portainer Widget - Displays Docker container status
 */

class PortainerWidget {
    constructor() {
        this.container = document.getElementById('portainer-content');
    }

    async load() {
        try {
            const data = await API.fetch('/portainer/containers');
            this.render(data);
        } catch (error) {
            this.renderError();
        }
    }

    render(data) {
        if (!data || !data.containers || data.containers.length === 0) {
            this.renderEmpty();
            return;
        }

        // Count containers by status
        const running = data.containers.filter(c => c.State === 'running').length;
        const stopped = data.containers.filter(c => c.State === 'exited' || c.State === 'dead').length;
        const other = data.containers.length - running - stopped;

        const html = `
            <div class="container-stats">
                <div class="container-stat running">
                    <span class="stat-number">${running}</span>
                    <span class="stat-label">Running</span>
                </div>
                <div class="container-stat stopped">
                    <span class="stat-number">${stopped}</span>
                    <span class="stat-label">Stopped</span>
                </div>
                <div class="container-stat total">
                    <span class="stat-number">${data.containers.length}</span>
                    <span class="stat-label">Total</span>
                </div>
            </div>
            <div class="container-list">
                ${data.containers.slice(0, 8).map(container => this.renderContainer(container)).join('')}
            </div>
            ${data.containers.length > 8 ? `
                <div class="container-more">
                    +${data.containers.length - 8} more containers
                </div>
            ` : ''}
        `;

        this.container.innerHTML = html;
    }

    renderContainer(container) {
        const state = container.State || 'unknown';
        const statusClass = state === 'running' ? 'running' :
            (state === 'paused' ? 'paused' : 'stopped');

        // Get container name (remove leading slash)
        const name = (container.Names?.[0] || container.Name || 'Unknown').replace(/^\//, '');

        // Get image name (short version)
        const image = (container.Image || 'unknown').split(':')[0].split('/').pop();

        // Format uptime/status
        const status = container.Status || state;

        return `
            <div class="container-item ${statusClass}">
                <div class="container-status-dot ${statusClass}"></div>
                <div class="container-details">
                    <span class="container-name">${name}</span>
                    <span class="container-image">${image}</span>
                </div>
                <span class="container-status-text">${status}</span>
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
                <p>Failed to load Portainer data</p>
                <button class="retry-btn" onclick="window.dashboard?.widgets.get('portainer')?.load()">Retry</button>
            </div>
        `;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="empty-state">
                <p>No containers found</p>
            </div>
        `;
    }
}

// Export
window.PortainerWidget = PortainerWidget;
