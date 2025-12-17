/**
 * Portainer Widget - Displays Docker container status
 */

class PortainerWidget {
    constructor() {
        this.containerId = 'portainer-content';
        this.container = document.getElementById(this.containerId);
    }

    // Ensure we have a fresh container reference
    getContainer() {
        if (!this.container || !document.contains(this.container)) {
            this.container = document.getElementById(this.containerId);
        }
        return this.container;
    }

    async load() {
        try {
            const data = await API.fetch('/portainer/containers');
            this.render(data);
        } catch (error) {
            // Only show error if container exists and was never loaded
            const container = this.getContainer();
            if (container && !container.classList.contains('loaded')) {
                this.renderError();
            }
            // On refresh, keep existing content visible if API fails
        }
    }

    render(data) {
        const container = this.getContainer();
        if (!container) return; // Safety check

        // Check if this is a refresh (not first load)
        const isRefresh = container.classList.contains('loaded');

        // If no data and this is a refresh, keep existing content
        if (!data || !data.containers || data.containers.length === 0) {
            if (isRefresh) return; // Keep existing content on refresh
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

        container.innerHTML = html;

        // Prevent animation replay on refresh
        if (!isRefresh) {
            container.classList.add('loaded');
        } else {
            // Disable animations on refresh to prevent visual glitches
            container.querySelectorAll('.container-item, .container-stat').forEach(el => {
                el.style.animation = 'none';
            });
        }

        // Notify mascot about container status
        if (window.mascotBuddy) {
            window.mascotBuddy.setContainerStatus(stopped, running);
        }
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
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
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
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <p>No containers found</p>
            </div>
        `;
    }
}

// Export
window.PortainerWidget = PortainerWidget;
