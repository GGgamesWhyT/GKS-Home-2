/**
 * GKS Game Servers Page
 * Displays game server information with live Pyrodactyl API data
 */

class ServersPage {
    constructor() {
        this.container = document.getElementById('servers-grid');
        this.refreshInterval = 60000; // 60 seconds
        this.intervalId = null;

        // Game type detection patterns and their display info
        this.gameTypes = {
            stoneblock: {
                name: 'Minecraft',
                variant: 'StoneBlock 4',
                gradient: 'linear-gradient(135deg, #3b5998 0%, #232323 50%, #1a472a 100%)',
                icon: '⛏️',
                modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/ftb-stoneblock-4',
                modpackLabel: 'CurseForge',
                guideUrl: '/guides/stoneblock4.html'
            },
            cobblemon: {
                name: 'Minecraft',
                variant: 'Cobblemon',
                gradient: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #2c3e50 100%)',
                icon: '🎮',
                modpackUrl: '#', // Placeholder - update with actual mrpack URL
                modpackLabel: 'Modpack',
                guideUrl: '/guides/cobblemon.html'
            },
            satisfactory: {
                name: 'Satisfactory',
                variant: '',
                gradient: 'linear-gradient(135deg, #ff8c00 0%, #1a1a2e 50%, #16213e 100%)',
                icon: '🏭'
            },
            minecraft: {
                name: 'Minecraft',
                variant: '',
                gradient: 'linear-gradient(135deg, #5d8a3e 0%, #3b5323 50%, #2d1f0f 100%)',
                icon: '⛏️'
            },
            default: {
                name: 'Game Server',
                variant: '',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #2d1f4f 100%)',
                icon: '🎮'
            }
        };
    }

    async init() {
        // Initialize theme
        this.initTheme();

        // Initialize mascot
        this.initMascot();

        // Load servers
        await this.loadServers();

        // Start auto-refresh
        this.intervalId = setInterval(() => this.loadServers(), this.refreshInterval);
    }

    initMascot() {
        this.mascot = document.getElementById('servers-mascot');
        this.pupilLeft = document.getElementById('servers-pupil-left');
        this.pupilRight = document.getElementById('servers-pupil-right');

        if (!this.mascot || !this.pupilLeft || !this.pupilRight) return;

        // Eye tracking with throttling for performance
        let lastMoveTime = 0;
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastMoveTime < 16) return; // ~60fps limit
            lastMoveTime = now;
            this.updateMascotEyes(e);
        });

        // Click reactions
        this.mascot.addEventListener('click', () => this.mascotReact('happy'));
        this.mascot.addEventListener('dblclick', () => this.mascotReact('bounce'));
    }

    updateMascotEyes(e) {
        if (!this.mascot || !this.pupilLeft || !this.pupilRight) return;

        const mascotRect = this.mascot.getBoundingClientRect();
        const mascotCenterX = mascotRect.left + mascotRect.width / 2;
        const mascotCenterY = mascotRect.top + mascotRect.height / 2;

        const deltaX = e.clientX - mascotCenterX;
        const deltaY = e.clientY - mascotCenterY;

        const maxMove = 3;
        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        const normalizedX = distance > 0 ? (deltaX / distance) * Math.min(distance / 50, 1) * maxMove : 0;
        const normalizedY = distance > 0 ? (deltaY / distance) * Math.min(distance / 50, 1) * maxMove : 0;

        this.pupilLeft.style.transform = `translate(${normalizedX}px, ${normalizedY}px)`;
        this.pupilRight.style.transform = `translate(${normalizedX}px, ${normalizedY}px)`;
    }

    mascotReact(type) {
        if (!this.mascot) return;

        if (type === 'happy') {
            this.mascot.classList.add('happy');
            setTimeout(() => this.mascot.classList.remove('happy'), 2000);
        } else if (type === 'bounce') {
            // If sad, double-clicking cheers him up temporarily!
            if (this.mascot.classList.contains('sad')) {
                this.mascot.classList.remove('sad');
                this.mascot.classList.add('happy');
                this.mascot.style.animation = 'mascotBounce 0.5s ease';
                setTimeout(() => {
                    this.mascot.style.animation = '';
                    this.mascot.classList.remove('happy');
                    // Check if still has problems, go back to sad
                    if (this.hasOfflineServer) {
                        setTimeout(() => this.mascot.classList.add('sad'), 500);
                    }
                }, 2000);
            } else {
                this.mascot.style.animation = 'mascotBounce 0.5s ease';
                setTimeout(() => this.mascot.style.animation = '', 500);
            }
        }
    }

    updateMascotMood(servers) {
        // Get offline and starting servers
        const offlineServers = servers.filter(server => {
            const status = (server.status || '').toLowerCase();
            return status !== 'running' && status !== 'online' && status !== 'started' && status !== 'starting';
        });

        const hasStartingServer = servers.some(server => {
            const status = (server.status || '').toLowerCase();
            return status === 'starting' || status === 'start';
        });

        // Update global mascot buddy
        if (window.mascotBuddy) {
            window.mascotBuddy.setOfflineServers(offlineServers);

            // Set worried if servers are starting but none offline
            if (offlineServers.length === 0 && hasStartingServer) {
                window.mascotBuddy.setMood('worried');
            }
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem('gks-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('gks-theme', newTheme);
            });
        }
    }

    async loadServers() {
        try {
            const response = await fetch('/api/pyrodactyl/servers');
            if (!response.ok) throw new Error('Failed to fetch servers');

            const data = await response.json();
            const servers = data.servers || [];
            this.render(servers);
            this.updateMascotMood(servers);
        } catch (error) {
            console.error('Error loading servers:', error);
            this.renderError();
        }
    }

    detectGameType(server) {
        const name = (server.name || '').toLowerCase();
        const description = (server.description || '').toLowerCase();
        const combined = name + ' ' + description;

        if (combined.includes('stoneblock')) return this.gameTypes.stoneblock;
        if (combined.includes('cobblemon')) return this.gameTypes.cobblemon;
        if (combined.includes('satisfactory')) return this.gameTypes.satisfactory;
        if (combined.includes('minecraft')) return this.gameTypes.minecraft;

        return this.gameTypes.default;
    }

    render(servers) {
        if (!servers || servers.length === 0) {
            this.renderEmpty();
            return;
        }

        // Check if this is a refresh (not first load)
        const isRefresh = this.container.classList.contains('loaded');

        const html = servers.map(server => this.renderServerCard(server)).join('');
        this.container.innerHTML = html;

        // Mark as loaded to prevent animations on refresh
        if (!isRefresh) {
            this.container.classList.add('loaded');
        } else {
            // Remove animation from cards on refresh
            this.container.querySelectorAll('.server-showcase-card').forEach(card => {
                card.style.animation = 'none';
                card.style.opacity = '1';
            });
        }
    }

    renderServerCard(server) {
        const gameType = this.detectGameType(server);

        // Status
        const status = (server.status || '').toLowerCase();
        const isOnline = status === 'running' || status === 'online' || status === 'started';
        const isStarting = status === 'starting' || status === 'start';
        const statusClass = isOnline ? 'online' : (isStarting ? 'starting' : 'offline');
        const statusText = isOnline ? 'Online' : (isStarting ? 'Starting...' : 'Offline');

        // Connection info
        const connectionInfo = server.allocation
            ? `${server.allocation.ip}:${server.allocation.port}`
            : 'Not available';

        // Resource percentages
        const cpuPercent = Math.min(100, Math.round(server.resources?.cpu || 0));
        const memLimit = server.limits?.memory || 0;
        const memUsed = server.resources?.memory || 0;
        const memPercent = memLimit > 0 ? Math.min(100, Math.round((memUsed / memLimit) * 100)) : 0;

        // Format memory display
        const memUsedMB = (memUsed / 1048576).toFixed(0);
        const memTotalMB = (memLimit / 1048576).toFixed(0);
        const memDisplay = memLimit > 0
            ? (memTotalMB >= 1024
                ? `${(memUsedMB / 1024).toFixed(1)}/${(memTotalMB / 1024).toFixed(1)} GB`
                : `${memUsedMB}/${memTotalMB} MB`)
            : `${memUsedMB >= 1024 ? (memUsedMB / 1024).toFixed(1) + ' GB' : memUsedMB + ' MB'}`;

        // Game display
        const gameDisplay = gameType.variant
            ? `${gameType.name} • ${gameType.variant}`
            : gameType.name;

        // Build action buttons (modpack + guide)
        let actionButtons = '';

        if (gameType.modpackUrl || gameType.guideUrl) {
            actionButtons = '<div class="server-actions">';

            // Modpack download button
            if (gameType.modpackUrl) {
                const modpackLabel = gameType.modpackLabel || 'Modpack';
                actionButtons += `
                    <a href="${gameType.modpackUrl}" class="modpack-btn" target="_blank" rel="noopener">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        ${modpackLabel}
                    </a>`;
            }

            // Guide button
            if (gameType.guideUrl) {
                actionButtons += `
                    <a href="${gameType.guideUrl}" class="guide-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Setup Guide
                    </a>`;
            }

            actionButtons += '</div>';
        }

        return `
            <div class="server-showcase-card ${statusClass}">
                <div class="server-banner" style="background: ${gameType.gradient}">
                    <span class="game-icon">${gameType.icon}</span>
                    <div class="server-status-overlay">
                        <span class="status-indicator ${statusClass}"></span>
                        <span class="status-text">${statusText}</span>
                    </div>
                </div>
                
                <div class="server-showcase-content">
                    <div class="server-showcase-header">
                        <h2 class="server-showcase-name">${server.name || 'Unknown Server'}</h2>
                        <span class="server-game-type">${gameDisplay}</span>
                    </div>
                    
                    <div class="server-connection-box">
                        <span class="connection-label">Server Address</span>
                        <code class="connection-address-large" onclick="serversPage.copyAddress('${connectionInfo}')" title="Click to copy">
                            ${connectionInfo}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </code>
                    </div>

                    <div class="server-stats-row">
                        <div class="server-stat">
                            <span class="stat-label">CPU</span>
                            <div class="stat-bar">
                                <div class="stat-fill" style="width: ${cpuPercent}%; background: ${this.getColorForPercent(cpuPercent)}"></div>
                            </div>
                            <span class="stat-value">${cpuPercent}%</span>
                        </div>
                        <div class="server-stat">
                            <span class="stat-label">RAM</span>
                            <div class="stat-bar">
                                <div class="stat-fill" style="width: ${memPercent}%; background: ${this.getColorForPercent(memPercent)}"></div>
                            </div>
                            <span class="stat-value">${memDisplay}</span>
                        </div>
                    </div>

                    ${actionButtons}
                </div>
            </div>
        `;
    }

    getColorForPercent(percent) {
        if (percent < 50) return 'var(--status-online)';
        if (percent < 80) return 'var(--status-warning)';
        return 'var(--status-offline)';
    }

    copyAddress(address) {
        navigator.clipboard.writeText(address).then(() => {
            this.showNotification('Address copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy address', 'error');
        });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success'
                ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
            }
            </svg>
            <span>${message}</span>
        `;
        container.appendChild(notification);

        setTimeout(() => notification.remove(), 5000);
    }

    renderError() {
        this.container.innerHTML = `
            <div class="servers-error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Unable to load servers</h3>
                <p>Please check that Pyrodactyl is configured correctly</p>
                <button class="retry-btn" onclick="serversPage.loadServers()">Try Again</button>
            </div>
        `;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="servers-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
                    <line x1="12" y1="22" x2="12" y2="15.5"></line>
                    <polyline points="22 8.5 12 15.5 2 8.5"></polyline>
                </svg>
                <h3>No servers found</h3>
                <p>Game servers will appear here once configured in Pyrodactyl</p>
            </div>
        `;
    }
}

// Initialize page
const serversPage = new ServersPage();
document.addEventListener('DOMContentLoaded', () => serversPage.init());
