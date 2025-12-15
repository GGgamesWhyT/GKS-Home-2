/**
 * Jellyseerr Widget - Displays media requests
 */

class JellyseerrWidget {
    constructor() {
        this.container = document.getElementById('jellyseerr-content');
        this.previousRequests = [];
    }

    async load() {
        try {
            const data = await API.fetch('/jellyseerr/requests');
            this.checkForNewRequests(data.requests || []);
            this.render(data);
        } catch (error) {
            this.renderError();
        }
    }

    checkForNewRequests(newRequests) {
        if (this.previousRequests.length > 0 && newRequests.length > 0) {
            const previousIds = new Set(this.previousRequests.map(r => r.id));
            const brandNewRequests = newRequests.filter(r => !previousIds.has(r.id));

            brandNewRequests.forEach(request => {
                const title = request.media?.title || 'Unknown';
                NotificationManager.info(`New request: ${title}`);
            });
        }
        this.previousRequests = newRequests;
    }

    render(data) {
        const requests = data.requests || [];

        if (requests.length === 0) {
            this.renderEmpty();
            return;
        }

        const html = `
            <div class="request-list">
                ${requests.slice(0, CONFIG.widgets.jellyseerr.maxItems).map(request => this.renderRequestItem(request)).join('')}
            </div>
        `;

        this.container.innerHTML = html;
    }

    renderRequestItem(request) {
        // Jellyseerr stores media info differently - check both request and media object
        const media = request.media || {};

        // Title can be in different places depending on media type
        let title = 'Unknown';
        if (media.title) {
            title = media.title;
        } else if (media.name) {
            title = media.name;
        } else if (request.type === 'movie' && media.externalTitle) {
            title = media.externalTitle;
        }

        // Poster path - Jellyseerr may store it differently
        let posterUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60"%3E%3Crect fill="%231a1a1d" width="40" height="60"/%3E%3C/svg%3E';
        if (media.posterPath) {
            posterUrl = `https://image.tmdb.org/t/p/w92${media.posterPath}`;
        }

        const status = this.getStatusLabel(request.status);
        const statusClass = this.getStatusClass(request.status);
        const requestedBy = request.requestedBy?.displayName || request.requestedBy?.email || request.requestedBy?.username || 'Unknown';

        // Build link to Jellyseerr request
        const mediaType = request.type === 'movie' ? 'movie' : 'tv';
        const tmdbId = media.tmdbId || request.media?.tmdbId;
        const jellyseerrUrl = CONFIG.externalLinks.jellyseerr && tmdbId
            ? `${CONFIG.externalLinks.jellyseerr}/${mediaType}/${tmdbId}`
            : '#';

        return `
            <a href="${jellyseerrUrl}" target="_blank" class="request-item">
                <div class="request-poster">
                    <img src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
                </div>
                <div class="request-info">
                    <div class="request-title">${title}</div>
                    <div class="request-user">Requested by ${requestedBy}</div>
                </div>
                <span class="request-status ${statusClass}">${status}</span>
            </a>
        `;
    }

    getStatusLabel(status) {
        const statusMap = {
            1: 'Pending',
            2: 'Approved',
            3: 'Declined',
            4: 'Available',
            5: 'Processing',
        };
        return statusMap[status] || 'Unknown';
    }

    getStatusClass(status) {
        const classMap = {
            1: 'pending',
            2: 'approved',
            3: 'declined',
            4: 'approved',
            5: 'pending',
        };
        return classMap[status] || 'pending';
    }

    renderError() {
        this.container.innerHTML = `
            <div class="error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p>Failed to load Jellyseerr data</p>
                <button class="retry-btn" onclick="window.dashboard?.widgets.get('jellyseerr')?.load()">Retry</button>
            </div>
        `;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="empty-state">
                <p>No media requests</p>
            </div>
        `;
    }
}

// Export
window.JellyseerrWidget = JellyseerrWidget;
