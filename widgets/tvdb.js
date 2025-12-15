/**
 * TVDB Integration - Enriches media with TVDB metadata
 * Used by Jellyfin widget to get additional show information
 */

class TVDBService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hour cache
    }

    /**
     * Get series info by TVDB ID
     * @param {number} tvdbId - The TVDB series ID
     * @returns {Promise<Object>} Series data
     */
    async getSeries(tvdbId) {
        const cacheKey = `series_${tvdbId}`;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const data = await API.fetch(`/tvdb/series/${tvdbId}`);
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.warn(`Failed to fetch TVDB data for series ${tvdbId}:`, error);
            return null;
        }
    }

    /**
     * Get episode info
     * @param {number} tvdbId - The TVDB series ID
     * @param {number} season - Season number
     * @param {number} episode - Episode number
     * @returns {Promise<Object>} Episode data
     */
    async getEpisode(tvdbId, season, episode) {
        const cacheKey = `episode_${tvdbId}_${season}_${episode}`;

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const data = await API.fetch(`/tvdb/series/${tvdbId}/episodes?season=${season}&episode=${episode}`);
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.warn(`Failed to fetch TVDB episode data:`, error);
            return null;
        }
    }

    /**
     * Search for a series by name
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async search(query) {
        try {
            const data = await API.fetch(`/tvdb/search?query=${encodeURIComponent(query)}`);
            return data.results || [];
        } catch (error) {
            console.warn(`TVDB search failed for "${query}":`, error);
            return [];
        }
    }

    /**
     * Get artwork for a series
     * @param {number} tvdbId - The TVDB series ID
     * @param {string} type - Artwork type (poster, banner, fanart, etc.)
     * @returns {Promise<Array>} Artwork URLs
     */
    async getArtwork(tvdbId, type = 'poster') {
        try {
            const data = await API.fetch(`/tvdb/series/${tvdbId}/artworks?type=${type}`);
            return data.artworks || [];
        } catch (error) {
            console.warn(`Failed to fetch TVDB artwork:`, error);
            return [];
        }
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Create singleton instance
window.TVDBService = new TVDBService();
