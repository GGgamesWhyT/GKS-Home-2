/**
 * Jellyfin Widget - Displays recently added media
 */

class JellyfinWidget {
    constructor() {
        this.containerId = 'jellyfin-content';
        this.container = document.getElementById(this.containerId);
        this.previousItems = [];
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
            const data = await API.fetch('/jellyfin/latest');
            this.checkForNewContent(data.items || []);
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

    checkForNewContent(newItems) {
        if (this.previousItems.length > 0 && newItems.length > 0) {
            const previousIds = new Set(this.previousItems.map(item => item.Id));
            const brandNewItems = newItems.filter(item => !previousIds.has(item.Id));

            if (brandNewItems.length > 0) {
                const item = brandNewItems[0];
                NotificationManager.success(`New content added: ${item.Name}`);
            }
        }
        this.previousItems = newItems;
    }

    render(data) {
        const items = data.items || [];
        const container = this.getContainer();
        if (!container) return; // Safety check

        // Check if this is a refresh (not first load)
        const isRefresh = container.classList.contains('loaded');

        // If no items and this is a refresh, keep existing content
        if (items.length === 0) {
            if (isRefresh) return; // Keep existing content on refresh
            this.renderEmpty();
            return;
        }

        // Wrap in a container that enables horizontal scrolling
        const html = `<div class="media-scroll-container">${items.slice(0, CONFIG.widgets.jellyfin.maxItems).map(item => this.renderMediaCard(item)).join('')}</div>`;
        container.innerHTML = html;

        // Prevent animation replay on refresh
        if (!isRefresh) {
            container.classList.add('loaded');
        } else {
            // Disable animations on refresh to prevent visual glitches
            container.querySelectorAll('.media-card').forEach(el => {
                el.style.animation = 'none';
            });
        }
    }

    renderMediaCard(item) {
        const posterUrl = item.ImageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"%3E%3Crect fill="%231a1a1d" width="300" height="450"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
        const year = item.ProductionYear || '';
        const type = item.Type || '';
        const overview = item.Overview ? item.Overview.substring(0, 150) + (item.Overview.length > 150 ? '...' : '') : '';
        const rating = item.CommunityRating ? `⭐ ${item.CommunityRating.toFixed(1)}` : '';
        const runtime = item.RunTimeTicks ? this.formatRuntime(item.RunTimeTicks) : '';

        // Build link to Jellyfin item
        const jellyfinUrl = CONFIG.externalLinks.jellyfin
            ? `${CONFIG.externalLinks.jellyfin}/web/index.html#!/details?id=${item.Id}`
            : '#';

        return `
            <a href="${jellyfinUrl}" target="_blank" class="media-card">
                <div class="media-poster">
                    <img src="${posterUrl}" alt="${item.Name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 450%22%3E%3Crect fill=%22%231a1a1d%22 width=%22300%22 height=%22450%22/%3E%3Ctext fill=%22%23666%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    <div class="media-tooltip">
                        <div class="media-tooltip-title">${item.Name}</div>
                        ${rating || runtime ? `<div class="media-tooltip-meta">${rating} ${runtime}</div>` : ''}
                        ${overview ? `<div class="media-tooltip-overview">${overview}</div>` : '<div class="media-tooltip-overview">No description available</div>'}
                    </div>
                </div>
                <div class="media-title">${item.Name}</div>
                <div class="media-year">${year} ${type ? `· ${type}` : ''}</div>
            </a>
        `;
    }

    formatRuntime(ticks) {
        const minutes = Math.floor(ticks / 600000000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
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
                <p>Failed to load Jellyfin data</p>
                <button class="retry-btn" onclick="window.dashboard?.widgets.get('jellyfin')?.load()">Retry</button>
            </div>
        `;
    }

    renderEmpty() {
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <p>No recently added content</p>
            </div>
        `;
    }
}

// Export
window.JellyfinWidget = JellyfinWidget;
