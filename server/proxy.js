/**
 * GKS Home Dashboard - Backend Proxy Server
 * Handles API requests to Proxmox, Jellyfin, Jellyseerr, and TVDB
 * Keeps API keys server-side for security
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// HTTPS agent for self-signed certs (Proxmox)
const https = require('https');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// ===== Configuration Endpoint =====
app.get('/api/config', (req, res) => {
    res.json({
        externalLinks: {
            proxmox: process.env.EXTERNAL_PROXMOX_URL || process.env.PROXMOX_HOST || '',
            jellyfin: process.env.EXTERNAL_JELLYFIN_URL || process.env.JELLYFIN_URL || '',
            jellyseerr: process.env.EXTERNAL_JELLYSEERR_URL || process.env.JELLYSEERR_URL || '',
            pyrodactyl: process.env.EXTERNAL_PYRODACTYL_URL || process.env.PYRODACTYL_URL || '',
            portainer: process.env.EXTERNAL_PORTAINER_URL || process.env.PORTAINER_URL || '',
        }
    });
});

// ===== Proxmox API Routes =====
app.get('/api/proxmox/status', async (req, res) => {
    try {
        const baseUrl = process.env.PROXMOX_HOST;
        const tokenId = process.env.PROXMOX_TOKEN_ID;
        const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;

        if (!baseUrl || !tokenId || !tokenSecret) {
            console.error('Proxmox config missing:', { baseUrl: !!baseUrl, tokenId: !!tokenId, tokenSecret: !!tokenSecret });
            return res.status(500).json({ error: 'Proxmox not configured' });
        }

        // Format: PVEAPIToken=user@realm!tokenid=secret
        const authHeader = `PVEAPIToken=${tokenId}=${tokenSecret}`;
        console.log(`Proxmox auth header format: PVEAPIToken=${tokenId}=***`);

        // Get cluster resources
        const resourcesRes = await fetch(`${baseUrl}/api2/json/cluster/resources?type=node`, {
            headers: { 'Authorization': authHeader },
            agent: httpsAgent,
        });

        if (!resourcesRes.ok) {
            const errorText = await resourcesRes.text();
            console.error('Proxmox error response:', errorText);
            throw new Error(`Proxmox API error: ${resourcesRes.status}`);
        }

        const resourcesData = await resourcesRes.json();
        const nodes = resourcesData.data || [];

        // Get VM counts per node
        const vmsRes = await fetch(`${baseUrl}/api2/json/cluster/resources?type=vm`, {
            headers: { 'Authorization': authHeader },
            agent: httpsAgent,
        });

        const vmsData = await vmsRes.json();
        const vms = vmsData.data || [];

        // Count VMs per node
        const vmCounts = {};
        vms.forEach(vm => {
            if (vm.status === 'running') {
                vmCounts[vm.node] = (vmCounts[vm.node] || 0) + 1;
            }
        });

        // Enrich nodes with VM counts
        const enrichedNodes = nodes.map(node => ({
            ...node,
            vmCount: vmCounts[node.node] || 0,
        }));

        res.json({ nodes: enrichedNodes });
    } catch (error) {
        console.error('Proxmox error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== Jellyfin API Routes =====
app.get('/api/jellyfin/latest', async (req, res) => {
    try {
        const baseUrl = process.env.JELLYFIN_URL;
        const apiKey = process.env.JELLYFIN_API_KEY;
        const userId = process.env.JELLYFIN_USER_ID;

        if (!baseUrl || !apiKey || !userId) {
            return res.status(500).json({ error: 'Jellyfin not configured' });
        }

        console.log(`Fetching Jellyfin latest for user: ${userId}`);

        // Use httpsAgent if URL is HTTPS
        const fetchOptions = {
            headers: {
                'X-Emby-Token': apiKey,
            },
        };
        if (baseUrl.startsWith('https')) {
            fetchOptions.agent = httpsAgent;
        }

        // Get latest items - Only Movies and Series (not episodes) for cleaner display
        // Include Fields for Overview, CommunityRating, and RunTimeTicks
        const response = await fetch(
            `${baseUrl}/Users/${userId}/Items/Latest?Limit=20&IncludeItemTypes=Movie,Series&EnableImages=true&ImageTypeLimit=1&Fields=Overview,CommunityRating,RunTimeTicks`,
            fetchOptions
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Jellyfin error response:', errorText);
            throw new Error(`Jellyfin API error: ${response.status}`);
        }

        const items = await response.json();

        // Transform items with image URLs
        const transformedItems = items.map(item => ({
            Id: item.Id,
            Name: item.Name,
            Type: item.Type,
            ProductionYear: item.ProductionYear,
            Overview: item.Overview || '',
            RunTimeTicks: item.RunTimeTicks,
            CommunityRating: item.CommunityRating,
            ImageUrl: item.ImageTags?.Primary
                ? `${baseUrl}/Items/${item.Id}/Images/Primary?maxHeight=300&quality=90`
                : null,
        }));

        res.json({ items: transformedItems });
    } catch (error) {
        console.error('Jellyfin error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== Jellyseerr API Routes =====
app.get('/api/jellyseerr/requests', async (req, res) => {
    try {
        const baseUrl = process.env.JELLYSEERR_URL;
        const apiKey = process.env.JELLYSEERR_API_KEY;

        if (!baseUrl || !apiKey) {
            return res.status(500).json({ error: 'Jellyseerr not configured' });
        }

        // Use httpsAgent if URL is HTTPS
        const fetchOptions = {
            headers: {
                'X-Api-Key': apiKey,
            },
        };
        if (baseUrl.startsWith('https')) {
            fetchOptions.agent = httpsAgent;
        }

        const response = await fetch(
            `${baseUrl}/api/v1/request?take=10&sort=added&sortDirection=desc`,
            fetchOptions
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Jellyseerr error response:', errorText);
            throw new Error(`Jellyseerr API error: ${response.status}`);
        }

        const data = await response.json();

        // Debug: log the first request to see the structure
        if (data.results && data.results.length > 0) {
            console.log('Jellyseerr first request sample:', JSON.stringify(data.results[0], null, 2));
        }

        // Transform requests - fetch additional media info if needed
        const requests = await Promise.all((data.results || []).map(async (request) => {
            let media = request.media || {};

            // If media info is missing, try to fetch it
            if (!media.title && !media.name && media.tmdbId) {
                try {
                    const mediaType = request.type === 'movie' ? 'movie' : 'tv';
                    const mediaResponse = await fetch(
                        `${baseUrl}/api/v1/${mediaType}/${media.tmdbId}`,
                        fetchOptions
                    );
                    if (mediaResponse.ok) {
                        const mediaData = await mediaResponse.json();
                        media = { ...media, ...mediaData };
                    }
                } catch (e) {
                    console.warn('Failed to fetch additional media info');
                }
            }

            return {
                ...request,
                media: {
                    ...media,
                    posterPath: media.posterPath || null,
                },
            };
        }));

        res.json({
            requests,
            totalCount: data.pageInfo?.results || 0,
        });
    } catch (error) {
        console.error('Jellyseerr error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== TVDB API Routes =====
let tvdbToken = null;
let tvdbTokenExpiry = null;

async function getTVDBToken() {
    // Check if we have a valid token
    if (tvdbToken && tvdbTokenExpiry && Date.now() < tvdbTokenExpiry) {
        return tvdbToken;
    }

    const apiKey = process.env.TVDB_API_KEY;
    const pin = process.env.TVDB_PIN;

    if (!apiKey) {
        throw new Error('TVDB not configured');
    }

    const response = await fetch('https://api4.thetvdb.com/v4/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            apikey: apiKey,
            pin: pin || undefined,
        }),
    });

    if (!response.ok) {
        throw new Error(`TVDB login failed: ${response.status}`);
    }

    const data = await response.json();
    tvdbToken = data.data?.token;
    // Token is valid for 1 month, but refresh after 3 weeks
    tvdbTokenExpiry = Date.now() + (21 * 24 * 60 * 60 * 1000);

    return tvdbToken;
}

app.get('/api/tvdb/series/:id', async (req, res) => {
    try {
        const token = await getTVDBToken();
        const { id } = req.params;

        const response = await fetch(`https://api4.thetvdb.com/v4/series/${id}/extended`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`TVDB API error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data.data);
    } catch (error) {
        console.error('TVDB error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tvdb/series/:id/episodes', async (req, res) => {
    try {
        const token = await getTVDBToken();
        const { id } = req.params;
        const { season, episode } = req.query;

        let url = `https://api4.thetvdb.com/v4/series/${id}/episodes/default`;
        if (season) url += `?season=${season}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`TVDB API error: ${response.status}`);
        }

        const data = await response.json();

        // Filter by episode if specified
        let episodes = data.data?.episodes || [];
        if (episode) {
            episodes = episodes.filter(ep => ep.number === parseInt(episode));
        }

        res.json({ episodes });
    } catch (error) {
        console.error('TVDB error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tvdb/search', async (req, res) => {
    try {
        const token = await getTVDBToken();
        const { query } = req.query;

        const response = await fetch(`https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(query)}&type=series`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`TVDB API error: ${response.status}`);
        }

        const data = await response.json();
        res.json({ results: data.data || [] });
    } catch (error) {
        console.error('TVDB error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tvdb/series/:id/artworks', async (req, res) => {
    try {
        const token = await getTVDBToken();
        const { id } = req.params;
        const { type } = req.query;

        const response = await fetch(`https://api4.thetvdb.com/v4/series/${id}/artworks`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`TVDB API error: ${response.status}`);
        }

        const data = await response.json();
        let artworks = data.data?.artworks || [];

        // Filter by type if specified
        if (type) {
            const typeMap = {
                'poster': 2,
                'banner': 1,
                'fanart': 3,
                'background': 3,
            };
            const typeId = typeMap[type.toLowerCase()];
            if (typeId) {
                artworks = artworks.filter(art => art.type === typeId);
            }
        }

        res.json({ artworks });
    } catch (error) {
        console.error('TVDB error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== Pyrodactyl API Routes =====
app.get('/api/pyrodactyl/servers', async (req, res) => {
    try {
        const baseUrl = process.env.PYRODACTYL_URL;
        const apiKey = process.env.PYRODACTYL_API_KEY;

        if (!baseUrl || !apiKey) {
            return res.status(500).json({ error: 'Pyrodactyl not configured' });
        }

        // Use httpsAgent if URL is HTTPS
        const fetchOptions = {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        };
        if (baseUrl.startsWith('https')) {
            fetchOptions.agent = httpsAgent;
        }

        // Get list of servers
        const response = await fetch(`${baseUrl}/api/client`, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pyrodactyl error response:', errorText);
            throw new Error(`Pyrodactyl API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform servers with resource usage
        const servers = await Promise.all((data.data || []).map(async (server) => {
            const serverData = server.attributes || server;

            // Try to get resource usage
            let resourceAttrs = {};
            let allocation = null;

            try {
                const resourceRes = await fetch(
                    `${baseUrl}/api/client/servers/${serverData.identifier}/resources`,
                    fetchOptions
                );
                if (resourceRes.ok) {
                    const resourceData = await resourceRes.json();
                    // Pterodactyl returns: { attributes: { current_state: "running", resources: {...} } }
                    resourceAttrs = resourceData.attributes || {};
                    console.log(`Server ${serverData.name} resources:`, JSON.stringify(resourceAttrs, null, 2));
                }
            } catch (e) {
                console.warn(`Failed to fetch resources for server ${serverData.identifier}`);
            }

            // Get allocation (connection info)
            if (serverData.relationships?.allocations?.data?.[0]) {
                const alloc = serverData.relationships.allocations.data[0].attributes;
                allocation = {
                    ip: alloc.ip_alias || alloc.ip,
                    port: alloc.port,
                };
            }

            // Extract resources - they're nested inside attributes.resources
            const resources = resourceAttrs.resources || {};

            // Status is at attributes.current_state level
            const currentState = resourceAttrs.current_state || 'offline';

            return {
                identifier: serverData.identifier,
                name: serverData.name,
                description: serverData.description,
                status: currentState,
                resources: {
                    cpu: resources.cpu_absolute || 0,
                    memory: resources.memory_bytes || 0,
                    disk: resources.disk_bytes || 0,
                },
                limits: {
                    // Disk limit of 0 means unlimited - pass it through
                    memory: (serverData.limits?.memory || 0) * 1048576,
                    disk: (serverData.limits?.disk || 0) * 1048576,
                },
                allocation,
            };
        }));

        // Debug: Log what we're sending to frontend
        console.log('Pyrodactyl servers response:', JSON.stringify(servers, null, 2));

        res.json({ servers });
    } catch (error) {
        console.error('Pyrodactyl error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== Portainer API Routes =====
app.get('/api/portainer/containers', async (req, res) => {
    try {
        const baseUrl = process.env.PORTAINER_URL;
        const accessToken = process.env.PORTAINER_ACCESS_TOKEN;
        const endpointId = process.env.PORTAINER_ENDPOINT_ID || '1';

        if (!baseUrl || !accessToken) {
            return res.status(500).json({ error: 'Portainer not configured' });
        }

        // Use httpsAgent if URL is HTTPS
        const fetchOptions = {
            headers: {
                'X-API-Key': accessToken,
            },
        };
        if (baseUrl.startsWith('https')) {
            fetchOptions.agent = httpsAgent;
        }

        // Get containers via Portainer's Docker proxy
        const response = await fetch(
            `${baseUrl}/api/endpoints/${endpointId}/docker/containers/json?all=true`,
            fetchOptions
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Portainer error response:', errorText);
            throw new Error(`Portainer API error: ${response.status}`);
        }

        const containers = await response.json();

        res.json({ containers });
    } catch (error) {
        console.error('Portainer error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== Proxmox Page Route =====
app.get('/proxmox', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'proxmox.html'));
});

// ===== Servers Page Route =====
app.get('/servers', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'servers.html'));
});

// ===== Containers Page Route =====
app.get('/containers', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'containers.html'));
});

// ===== Guide Pages Routes =====
app.get('/guides/cobblemon.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'guides', 'cobblemon.html'));
});

app.get('/guides/stoneblock4.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'guides', 'stoneblock4.html'));
});

// ===== Catch-all for SPA =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║       GKS Home Dashboard Server           ║
╠═══════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}  ║
╚═══════════════════════════════════════════╝
    `);
});
