/**
 * GKS Home Dashboard - Configuration
 * All API endpoints are proxied through the backend to hide API keys
 */

const CONFIG = {
    // API Base URL (the backend proxy)
    apiBaseUrl: '/api',

    // Refresh intervals (in milliseconds)
    refreshIntervals: {
        proxmox: 30000,      // 30 seconds
        jellyfin: 300000,    // 5 minutes
        jellyseerr: 300000,  // 5 minutes
    },

    // External links (for click-through)
    externalLinks: {
        proxmox: '',      // Will be set from env via backend
        jellyfin: '',     // Will be set from env via backend
        jellyseerr: '',   // Will be set from env via backend
    },

    // Widget display settings
    widgets: {
        jellyfin: {
            maxItems: 10,
        },
        jellyseerr: {
            maxItems: 5,
        },
    },

    // Local storage keys
    storage: {
        theme: 'gks-theme',
        widgetPositions: 'gks-widget-positions',
        widgetSizes: 'gks-widget-sizes',
        notificationsSeen: 'gks-notifications-seen',
    },
};

/**
 * Fetch configuration from backend (external URLs, etc.)
 */
async function loadConfig() {
    try {
        const response = await fetch(`${CONFIG.apiBaseUrl}/config`);
        if (response.ok) {
            const data = await response.json();
            CONFIG.externalLinks = {
                ...CONFIG.externalLinks,
                ...data.externalLinks,
            };
        }
    } catch (error) {
        console.warn('Could not load config from backend, using defaults');
    }
}

// Export for use in other modules
window.CONFIG = CONFIG;
window.loadConfig = loadConfig;
