/**
 * GKS Proxmox Cluster Page
 * Displays Proxmox node information with live API data
 * Uses v2 glassmorphism card design with circular gauges
 */

class ProxmoxPage {
    constructor() {
        this.container = document.getElementById('proxmox-grid');
        this.refreshInterval = 30000; // 30 seconds
        this.intervalId = null;
    }

    async init() {
        this.initTheme();
        this.initBurgerMenu();
        await this.loadNodes();
        this.intervalId = setInterval(() => this.loadNodes(), this.refreshInterval);
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

    async loadNodes() {
        try {
            const response = await fetch('/api/proxmox/status');
            if (!response.ok) throw new Error('Failed to fetch nodes');

            const data = await response.json();
            const nodes = data.nodes || [];
            this.render(nodes);
        } catch (error) {
            console.error('Error loading Proxmox nodes:', error);
            if (!this.container.classList.contains('loaded')) {
                this.renderError();
            }
        }
    }

    render(nodes) {
        if (!nodes || nodes.length === 0) {
            this.renderEmpty();
            return;
        }

        const isRefresh = this.container.classList.contains('loaded');

        // Sort nodes in specific order
        const nodeOrder = ['proxmox', 'proxmox2', 'proxmox3'];
        const sortedNodes = [...nodes].sort((a, b) => {
            const indexA = nodeOrder.indexOf(a.node.toLowerCase());
            const indexB = nodeOrder.indexOf(b.node.toLowerCase());
            const orderA = indexA === -1 ? 999 : indexA;
            const orderB = indexB === -1 ? 999 : indexB;
            return orderA - orderB;
        });

        const html = `<div class="proxmox-nodes-grid">${sortedNodes.map((node, index) => this.renderNodeCard(node, index)).join('')}</div>`;
        this.container.innerHTML = html;

        if (!isRefresh) {
            this.container.classList.add('loaded');
        } else {
            this.container.querySelectorAll('.px-node-card').forEach(card => {
                card.style.animation = 'none';
                card.style.opacity = '1';
            });
        }
    }

    renderNodeCard(node, index) {
        const cpuPercent = Math.round((node.cpu || 0) * 100);
        const memPercent = Math.round(((node.mem || 0) / (node.maxmem || 1)) * 100);
        const diskPercent = Math.round(((node.disk || 0) / (node.maxdisk || 1)) * 100);
        const isOnline = node.status === 'online';

        // Format memory
        const memUsedGB = ((node.mem || 0) / 1073741824).toFixed(1);
        const memTotalGB = ((node.maxmem || 0) / 1073741824).toFixed(0);

        // Format disk
        const diskUsedGB = ((node.disk || 0) / 1073741824).toFixed(0);
        const diskTotalGB = ((node.maxdisk || 0) / 1073741824).toFixed(0);
        const diskUsedTB = (diskUsedGB / 1024).toFixed(2);
        const diskTotalTB = (diskTotalGB / 1024).toFixed(1);

        // Uptime
        const uptime = node.uptime ? this.formatUptime(node.uptime) : (isOnline ? 'Running' : '—');

        const animDelay = index * 0.15;

        return `
            <div class="px-node-card ${isOnline ? 'online' : 'offline'}" style="--anim-delay: ${animDelay}s">
                <!-- Card Header -->
                <div class="px-card-header">
                    <div class="px-node-info">
                        <div class="px-status-dot ${isOnline ? 'online' : 'offline'}"></div>
                        <h3 class="px-node-name">${node.node || 'Unknown'}</h3>
                    </div>
                    <div class="px-status-badge ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>

                <!-- Meta badges -->
                <div class="px-meta-row">
                    ${node.vmCount !== undefined ? `
                        <div class="px-badge vm">
                            ${this.getVmIcon()}
                            <span>${node.vmCount} VMs</span>
                        </div>
                    ` : ''}
                    <div class="px-badge uptime">
                        ${this.getClockIcon()}
                        <span>${uptime}</span>
                    </div>
                </div>

                <!-- Gauges -->
                <div class="px-gauges">
                    <div class="px-gauge">
                        <div class="px-gauge-ring" style="--percent: ${cpuPercent}; --gauge-color: ${this.getColorForPercent(cpuPercent)}">
                            <div class="px-gauge-inner">
                                <span class="px-gauge-value">${cpuPercent}</span>
                                <span class="px-gauge-percent">%</span>
                            </div>
                        </div>
                        <span class="px-gauge-label">CPU</span>
                    </div>
                    
                    <div class="px-gauge">
                        <div class="px-gauge-ring" style="--percent: ${memPercent}; --gauge-color: ${this.getColorForPercent(memPercent)}">
                            <div class="px-gauge-inner">
                                <span class="px-gauge-value">${memPercent}</span>
                                <span class="px-gauge-percent">%</span>
                            </div>
                        </div>
                        <span class="px-gauge-label">RAM</span>
                        <span class="px-gauge-detail">${memUsedGB}/${memTotalGB}GB</span>
                    </div>
                    
                    <div class="px-gauge">
                        <div class="px-gauge-ring" style="--percent: ${diskPercent}; --gauge-color: ${this.getColorForPercent(diskPercent)}">
                            <div class="px-gauge-inner">
                                <span class="px-gauge-value">${diskPercent}</span>
                                <span class="px-gauge-percent">%</span>
                            </div>
                        </div>
                        <span class="px-gauge-label">Disk</span>
                        <span class="px-gauge-detail">${diskUsedTB}/${diskTotalTB}TB</span>
                    </div>
                </div>

                <!-- Expandable Details -->
                <button class="px-expand-btn" onclick="this.closest('.px-node-card').classList.toggle('expanded')">
                    ${this.getChevronIcon()}
                </button>

                <div class="px-details">
                    <div class="px-details-grid">
                        <div class="px-detail-item">
                            <span class="px-detail-label">CPU Cores</span>
                            <span class="px-detail-value">${node.cpus || '—'}</span>
                        </div>
                        <div class="px-detail-item">
                            <span class="px-detail-label">Total RAM</span>
                            <span class="px-detail-value">${memTotalGB} GB</span>
                        </div>
                        <div class="px-detail-item">
                            <span class="px-detail-label">Total Disk</span>
                            <span class="px-detail-value">${diskTotalTB} TB</span>
                        </div>
                        <div class="px-detail-item">
                            <span class="px-detail-label">Status</span>
                            <span class="px-detail-value">${node.status || 'Unknown'}</span>
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

    // Icon helpers
    getVmIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>`;
    }

    getClockIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>`;
    }

    getChevronIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
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
            <div class="proxmox-error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Unable to load Proxmox data</h3>
                <p>Please check that Proxmox is configured correctly</p>
                <button class="retry-btn" onclick="proxmoxPage.loadNodes()">Try Again</button>
            </div>
        `;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="proxmox-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <h3>No nodes found</h3>
                <p>Proxmox nodes will appear here once configured</p>
            </div>
        `;
    }
}

// Initialize page
const proxmoxPage = new ProxmoxPage();
document.addEventListener('DOMContentLoaded', () => proxmoxPage.init());
