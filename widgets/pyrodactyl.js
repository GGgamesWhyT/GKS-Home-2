/**
 * Pyrodactyl Widget - Displays game server stats and connection info
 * Clean Dashboard Design v2.0
 */

class PyrodactylWidget {
    constructor() {
        this.containerId = 'pyrodactyl-content';
        this.container = document.getElementById(this.containerId);
        this.expandedCards = new Set(); // Track expanded cards

        // Game type detection patterns and their display info
        this.gameTypes = {
            stoneblock: {
                name: 'Minecraft',
                variant: 'StoneBlock 4',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                icon: '⛏️',
                accentColor: '#667eea'
            },
            cobblemon: {
                name: 'Minecraft',
                variant: 'Cobblemon',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                icon: '🎮',
                accentColor: '#f093fb'
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

    // Ensure we have a fresh container reference
    getContainer() {
        if (!this.container || !document.contains(this.container)) {
            this.container = document.getElementById(this.containerId);
        }
        return this.container;
    }

    async load() {
        try {
            const data = await API.fetch('/pyrodactyl/servers');
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
        if (!data || !data.servers || data.servers.length === 0) {
            if (isRefresh) return; // Keep existing content on refresh
            this.renderEmpty();
            return;
        }

        // Update mascot buddy with server status
        this.updateMascotStatus(data.servers);

        const html = `
            <div class="server-grid-v2">
                ${data.servers.map((server, index) => this.renderServer(server, index)).join('')}
            </div>
        `;

        container.innerHTML = html;

        // Bind event listeners for copy and expand
        this.bindEvents(container);

        // Prevent animation replay on refresh
        if (!isRefresh) {
            container.classList.add('loaded');
        } else {
            // Disable card animations on refresh
            container.querySelectorAll('.server-card-v2').forEach(el => {
                el.style.animation = 'none';
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        }
    }

    bindEvents(container) {
        // Copy button handlers
        container.querySelectorAll('.copy-btn-v2').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const address = btn.dataset.address;
                this.copyAddress(address, btn);
            });
        });

        // Expand button handlers
        container.querySelectorAll('.expand-btn-v2').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.server-card-v2');
                const details = card.querySelector('.server-details-v2');
                const isExpanded = card.classList.toggle('expanded');
                btn.innerHTML = isExpanded ? this.getChevronUpIcon() : this.getChevronDownIcon();
            });
        });
    }

    updateMascotStatus(servers) {
        if (!window.mascotBuddy) return;

        // Get offline and starting servers
        const offlineServers = servers.filter(server => {
            const status = (server.status || '').toLowerCase();
            return status !== 'running' && status !== 'online' && status !== 'started' && status !== 'starting';
        });

        const hasStartingServer = servers.some(server => {
            const status = (server.status || '').toLowerCase();
            return status === 'starting' || status === 'start';
        });

        // Update mascot buddy
        window.mascotBuddy.setOfflineServers(offlineServers);

        // Set worried if servers are starting but none offline
        if (offlineServers.length === 0 && hasStartingServer) {
            window.mascotBuddy.setMood('worried');
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

    renderServer(server, index) {
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
            ? (memTotalMB >= 1024
                ? `${(memUsedMB / 1024).toFixed(1)}/${(memTotalMB / 1024).toFixed(1)}GB`
                : `${memUsedMB}/${memTotalMB}MB`)
            : `${memUsedMB >= 1024 ? (memUsedMB / 1024).toFixed(1) + 'GB' : memUsedMB + 'MB'}`;

        // Format disk display
        const diskUsedMB = (diskUsed / 1048576).toFixed(0);
        const diskTotalMB = (diskLimit / 1048576).toFixed(0);
        const diskDisplay = diskLimit > 0
            ? (diskTotalMB >= 1024
                ? `${(diskUsedMB / 1024).toFixed(1)}/${(diskTotalMB / 1024).toFixed(1)}GB`
                : `${diskUsedMB}/${diskTotalMB}MB`)
            : `${diskUsedMB >= 1024 ? (diskUsedMB / 1024).toFixed(1) + 'GB' : diskUsedMB + 'MB'}`;

        // Connection info
        const connectionInfo = server.allocation
            ? `${server.allocation.ip}:${server.allocation.port}`
            : 'Not available';

        // Uptime calculation (if available from API, otherwise estimate from status)
        const uptime = server.uptime ? this.formatUptime(server.uptime) : (isOnline ? 'Running' : '—');

        // Game display
        const gameDisplay = gameType.variant ? `${gameType.name} • ${gameType.variant}` : gameType.name;

        // Animation delay
        const animDelay = index * 0.1;

        return `
            <div class="server-card-v2 ${statusClass}" 
                 onclick="window.location.href='/servers'" 
                 style="cursor: pointer; --anim-delay: ${animDelay}s; --accent: ${gameType.accentColor}"
                 title="View all servers">
                
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
                    <div class="connection-box-v2" onclick="event.stopPropagation()">
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

                    <!-- Expand button -->
                    <button class="expand-btn-v2" onclick="event.stopPropagation()" title="Show details">
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
                                <span class="detail-label-v2">Status</span>
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

    copyAddress(address, button) {
        navigator.clipboard.writeText(address).then(() => {
            // Visual feedback
            button.classList.add('copied');
            button.innerHTML = this.getCheckIcon();

            // Show notification
            if (window.dashboard) {
                window.dashboard.showNotification('Address copied!', 'success');
            }

            // Reset after 2 seconds
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = this.getCopyIcon();
            }, 2000);
        }).catch(() => {
            if (window.dashboard) {
                window.dashboard.showNotification('Failed to copy', 'error');
            }
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
                <p>Failed to load Pyrodactyl data</p>
                <button class="retry-btn" onclick="window.dashboard?.widgets.get('pyrodactyl')?.load()">Retry</button>
            </div>
        `;
    }

    renderEmpty() {
        const container = this.getContainer();
        if (!container) return;
        container.innerHTML = `
            <div class="empty-state">
                <p>No game servers found</p>
            </div>
        `;
    }
}

// Export
window.PyrodactylWidget = PyrodactylWidget;
