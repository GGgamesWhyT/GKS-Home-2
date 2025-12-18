/**
 * GKS Game Servers Page
 * Displays game server information with live Pyrodactyl API data
 * Uses v2 glassmorphism card design
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
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                icon: '⛏️',
                accentColor: '#667eea',
                modpackUrl: 'https://www.curseforge.com/minecraft/modpacks/ftb-stoneblock-4',
                modpackLabel: 'CurseForge',
                guideUrl: '/guides/stoneblock4.html'
            },
            cobblemon: {
                name: 'Minecraft',
                variant: 'Cobblemon',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                icon: '🎮',
                accentColor: '#f093fb',
                modpackUrl: '#',
                modpackLabel: 'Modpack',
                guideUrl: '/guides/cobblemon.html'
            },
            satisfactory: {
                name: 'Satisfactory',
                variant: '',
                gradient: 'linear-gradient(135deg, #ff9a56 0%, #ff6b35 100%)',
                icon: '🏭',
                accentColor: '#ff9a56'
            },
            minecraft: {
                name: 'Minecraft',
                variant: '',
                gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
                icon: '⛏️',
                accentColor: '#56ab2f'
            },
            default: {
                name: 'Game Server',
                variant: '',
                gradient: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
                icon: '🎮',
                accentColor: 'var(--accent-primary)'
            }
        };
    }

    async init() {
        this.initTheme();
        this.initBurgerMenu();
        this.initMascot();
        await this.loadServers();
        this.intervalId = setInterval(() => this.loadServers(), this.refreshInterval);
    }

    initBurgerMenu() {
        const burgerBtn = document.getElementById('burger-menu');
        const mobileNav = document.getElementById('mobile-nav');

        if (!burgerBtn || !mobileNav) return;

        burgerBtn.addEventListener('click', () => {
            burgerBtn.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.burger-menu') && !e.target.closest('.mobile-nav')) {
                burgerBtn.classList.remove('active');
                mobileNav.classList.remove('active');
            }
        });

        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                burgerBtn.classList.remove('active');
                mobileNav.classList.remove('active');
            });
        });
    }

    initMascot() {
        this.mascot = document.getElementById('servers-mascot');
        this.pupilLeft = document.getElementById('servers-pupil-left');
        this.pupilRight = document.getElementById('servers-pupil-right');

        if (!this.mascot || !this.pupilLeft || !this.pupilRight) return;

        let lastMoveTime = 0;
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastMoveTime < 16) return;
            lastMoveTime = now;
            this.updateMascotEyes(e);
        });

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
            if (this.mascot.classList.contains('sad')) {
                this.mascot.classList.remove('sad');
                this.mascot.classList.add('happy');
                this.mascot.style.animation = 'mascotBounce 0.5s ease';
                setTimeout(() => {
                    this.mascot.style.animation = '';
                    this.mascot.classList.remove('happy');
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
        const offlineServers = servers.filter(server => {
            const status = (server.status || '').toLowerCase();
            return status !== 'running' && status !== 'online' && status !== 'started' && status !== 'starting';
        });

        const hasStartingServer = servers.some(server => {
            const status = (server.status || '').toLowerCase();
            return status === 'starting' || status === 'start';
        });

        this.hasOfflineServer = offlineServers.length > 0;

        if (this.mascot) {
            this.mascot.classList.remove('sad', 'worried');
            if (offlineServers.length > 0) {
                this.mascot.classList.add('sad');
            } else if (hasStartingServer) {
                this.mascot.classList.add('worried');
            }
        }

        if (window.mascotBuddy) {
            window.mascotBuddy.setOfflineServers(offlineServers);
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
            if (!this.container.classList.contains('loaded')) {
                this.renderError();
            }
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

        const isRefresh = this.container.classList.contains('loaded');
        const html = `<div class="servers-grid-v2">${servers.map((server, index) => this.renderServerCard(server, index)).join('')}</div>`;
        this.container.innerHTML = html;

        this.bindEvents();

        if (!isRefresh) {
            this.container.classList.add('loaded');
        } else {
            this.container.querySelectorAll('.server-card-v2').forEach(card => {
                card.style.animation = 'none';
                card.style.opacity = '1';
                card.style.transform = 'none';
            });
        }
    }

    bindEvents() {
        // Copy button handlers
        this.container.querySelectorAll('.copy-btn-v2').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const address = btn.dataset.address;
                this.copyAddressV2(address, btn);
            });
        });

        // Expand button handlers
        this.container.querySelectorAll('.expand-btn-v2').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const card = btn.closest('.server-card-v2');
                const isExpanded = card.classList.toggle('expanded');
                btn.innerHTML = isExpanded ? this.getChevronUpIcon() : this.getChevronDownIcon();
            });
        });
    }

    renderServerCard(server, index) {
        const gameType = this.detectGameType(server);

        // Status
        const status = (server.status || '').toLowerCase();
        const isOnline = status === 'running' || status === 'online' || status === 'started';
        const isStarting = status === 'starting' || status === 'start';
        const statusClass = isOnline ? 'online' : (isStarting ? 'starting' : 'offline');
        const statusText = isOnline ? 'Online' : (isStarting ? 'Starting...' : 'Offline');

        // Resource percentages
        const cpuPercent = Math.min(100, Math.round(server.resources?.cpu || 0));
        const memLimit = server.limits?.memory || 0;
        const memUsed = server.resources?.memory || 0;
        const memPercent = memLimit > 0 ? Math.min(100, Math.round((memUsed / memLimit) * 100)) : 0;
        const diskLimit = server.limits?.disk || 0;
        const diskUsed = server.resources?.disk || 0;
        const diskPercent = diskLimit > 0 ? Math.min(100, Math.round((diskUsed / diskLimit) * 100)) : 0;

        // Format memory display
        const memUsedMB = (memUsed / 1048576).toFixed(0);
        const memTotalMB = (memLimit / 1048576).toFixed(0);
        const memDisplay = memLimit > 0
            ? (memTotalMB >= 1024 ? `${(memUsedMB / 1024).toFixed(1)}/${(memTotalMB / 1024).toFixed(1)}GB` : `${memUsedMB}/${memTotalMB}MB`)
            : `${memUsedMB >= 1024 ? (memUsedMB / 1024).toFixed(1) + 'GB' : memUsedMB + 'MB'}`;

        // Format disk display
        const diskUsedMB = (diskUsed / 1048576).toFixed(0);
        const diskTotalMB = (diskLimit / 1048576).toFixed(0);
        const diskDisplay = diskLimit > 0
            ? (diskTotalMB >= 1024 ? `${(diskUsedMB / 1024).toFixed(1)}/${(diskTotalMB / 1024).toFixed(1)}GB` : `${diskUsedMB}/${diskTotalMB}MB`)
            : `${diskUsedMB >= 1024 ? (diskUsedMB / 1024).toFixed(1) + 'GB' : diskUsedMB + 'MB'}`;

        // Connection info
        const connectionInfo = server.allocation ? `${server.allocation.ip}:${server.allocation.port}` : 'Not available';

        // Uptime
        const uptime = server.uptime ? this.formatUptime(server.uptime) : (isOnline ? 'Running' : '—');

        // Game display
        const gameDisplay = gameType.variant ? `${gameType.name} • ${gameType.variant}` : gameType.name;

        // Action buttons (modpack + guide)
        let actionButtons = '';
        if (gameType.modpackUrl || gameType.guideUrl) {
            actionButtons = '<div class="server-actions-v2">';
            if (gameType.modpackUrl) {
                actionButtons += `
                    <a href="${gameType.modpackUrl}" class="action-btn-v2 modpack" target="_blank" rel="noopener">
                        ${this.getDownloadIcon()}
                        <span>${gameType.modpackLabel || 'Modpack'}</span>
                    </a>`;
            }
            if (gameType.guideUrl) {
                actionButtons += `
                    <a href="${gameType.guideUrl}" class="action-btn-v2 guide">
                        ${this.getBookIcon()}
                        <span>Setup Guide</span>
                    </a>`;
            }
            actionButtons += '</div>';
        }

        const animDelay = index * 0.1;

        return `
            <div class="server-card-v2 server-card-page ${statusClass}" 
                 style="--anim-delay: ${animDelay}s; --accent: ${gameType.accentColor}">
                
                <!-- Header with gradient -->
                <div class="server-header-v2" style="background: ${gameType.gradient}">
                    <div class="server-header-content">
                        <div class="server-icon-v2">${gameType.icon}</div>
                        <div class="server-title-v2">
                            <h3 class="server-name-v2">${server.name || 'Unknown Server'}</h3>
                            <span class="game-badge-v2">${gameDisplay}</span>
                        </div>
                    </div>
                    <div class="server-status-v2">
                        <span class="status-dot-v2 ${statusClass}"></span>
                        <span class="status-text-v2">${statusText}</span>
                    </div>
                </div>

                <!-- Main content -->
                <div class="server-body-v2">
                    <!-- Uptime badge -->
                    <div class="uptime-row-v2">
                        <span class="uptime-icon-v2">⏱</span>
                        <span class="uptime-text-v2">${uptime}</span>
                    </div>

                    <!-- Connection box -->
                    <div class="connection-box-v2">
                        <span class="connection-label-v2">Server Address</span>
                        <div class="connection-row-v2">
                            <code class="connection-address-v2">${connectionInfo}</code>
                            <button class="copy-btn-v2" data-address="${connectionInfo}" title="Copy to clipboard">
                                ${this.getCopyIcon()}
                            </button>
                        </div>
                    </div>

                    <!-- Gauges -->
                    <div class="gauges-row-v2">
                        <div class="gauge-v2">
                            <div class="gauge-header-v2">
                                <span class="gauge-label-v2">CPU</span>
                                <span class="gauge-value-v2">${cpuPercent}%</span>
                            </div>
                            <div class="gauge-bar-v2" style="--percent: ${cpuPercent}; --gauge-color: ${this.getColorForPercent(cpuPercent)}"></div>
                        </div>
                        <div class="gauge-v2">
                            <div class="gauge-header-v2">
                                <span class="gauge-label-v2">RAM</span>
                                <span class="gauge-value-v2">${memPercent}%</span>
                            </div>
                            <div class="gauge-bar-v2" style="--percent: ${memPercent}; --gauge-color: ${this.getColorForPercent(memPercent)}"></div>
                            <span class="gauge-detail-v2">${memDisplay}</span>
                        </div>
                        <div class="gauge-v2">
                            <div class="gauge-header-v2">
                                <span class="gauge-label-v2">Disk</span>
                                <span class="gauge-value-v2">${diskLimit > 0 ? diskPercent + '%' : '∞'}</span>
                            </div>
                            <div class="gauge-bar-v2" style="--percent: ${diskPercent}; --gauge-color: ${diskLimit > 0 ? this.getColorForPercent(diskPercent) : 'var(--text-muted)'}"></div>
                            <span class="gauge-detail-v2">${diskDisplay}</span>
                        </div>
                    </div>

                    <!-- Action buttons -->
                    ${actionButtons}

                    <!-- Expand button -->
                    <button class="expand-btn-v2" title="Show details">
                        ${this.getChevronDownIcon()}
                    </button>

                    <!-- Expandable details panel -->
                    <div class="server-details-v2">
                        <div class="details-grid-v2">
                            <div class="detail-item-v2">
                                <span class="detail-label-v2">Network TX</span>
                                <span class="detail-value-v2">${this.formatBytes(server.resources?.network_tx_bytes || 0)}</span>
                            </div>
                            <div class="detail-item-v2">
                                <span class="detail-label-v2">Network RX</span>
                                <span class="detail-value-v2">${this.formatBytes(server.resources?.network_rx_bytes || 0)}</span>
                            </div>
                            <div class="detail-item-v2">
                                <span class="detail-label-v2">Raw Status</span>
                                <span class="detail-value-v2">${server.status || 'Unknown'}</span>
                            </div>
                            <div class="detail-item-v2">
                                <span class="detail-label-v2">UUID</span>
                                <span class="detail-value-v2 uuid">${server.uuid ? server.uuid.substring(0, 8) + '...' : '—'}</span>
                            </div>
                        </div>
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
        if (!seconds || seconds <= 0) return '—';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    copyAddressV2(address, button) {
        navigator.clipboard.writeText(address).then(() => {
            button.classList.add('copied');
            button.innerHTML = this.getCheckIcon();
            this.showNotification('Address copied!', 'success');
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = this.getCopyIcon();
            }, 2000);
        }).catch(() => {
            this.showNotification('Failed to copy', 'error');
        });
    }

    // Icon helpers
    getCopyIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>`;
    }

    getCheckIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
    }

    getChevronDownIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>`;
    }

    getChevronUpIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
        </svg>`;
    }

    getDownloadIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>`;
    }

    getBookIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>`;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success'
                ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
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
