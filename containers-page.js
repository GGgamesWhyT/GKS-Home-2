/**
 * GKS Containers Page
 * Displays Docker container information with live Portainer API data
 * Uses glassmorphism card design with status indicators
 */

class ContainersPage {
    constructor() {
        this.statsContainer = document.getElementById('containers-stats');
        this.gridContainer = document.getElementById('containers-grid');
        this.refreshInterval = 30000; // 30 seconds
        this.intervalId = null;
    }

    async init() {
        this.initTheme();
        this.initBurgerMenu();
        await this.loadContainers();
        this.intervalId = setInterval(() => this.loadContainers(), this.refreshInterval);
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

    async loadContainers() {
        try {
            const response = await fetch('/api/portainer/containers');
            if (!response.ok) throw new Error('Failed to fetch containers');

            const data = await response.json();
            const containers = data.containers || [];
            this.renderStats(containers);
            this.renderGrid(containers);
        } catch (error) {
            console.error('Error loading containers:', error);
            if (!this.gridContainer.classList.contains('loaded')) {
                this.renderError();
            }
        }
    }

    renderStats(containers) {
        const running = containers.filter(c => c.State === 'running').length;
        const stopped = containers.filter(c => c.State === 'exited' || c.State === 'dead').length;
        const paused = containers.filter(c => c.State === 'paused').length;
        const other = containers.length - running - stopped - paused;

        this.statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card running">
                    <div class="stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </div>
                    <div class="stat-info">
                        <span class="stat-number">${running}</span>
                        <span class="stat-label">Running</span>
                    </div>
                </div>
                <div class="stat-card stopped">
                    <div class="stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="6" y="6" width="12" height="12"></rect>
                        </svg>
                    </div>
                    <div class="stat-info">
                        <span class="stat-number">${stopped}</span>
                        <span class="stat-label">Stopped</span>
                    </div>
                </div>
                <div class="stat-card total">
                    <div class="stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 12H2"></path>
                            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                        </svg>
                    </div>
                    <div class="stat-info">
                        <span class="stat-number">${containers.length}</span>
                        <span class="stat-label">Total</span>
                    </div>
                </div>
            </div>
        `;

        // Notify mascot about container status
        if (window.mascotBuddy) {
            window.mascotBuddy.setContainerStatus(stopped, running);
        }
    }

    renderGrid(containers) {
        if (!containers || containers.length === 0) {
            this.renderEmpty();
            return;
        }

        const isRefresh = this.gridContainer.classList.contains('loaded');

        // Sort: running first, then by name
        const sortedContainers = [...containers].sort((a, b) => {
            if (a.State === 'running' && b.State !== 'running') return -1;
            if (a.State !== 'running' && b.State === 'running') return 1;
            const nameA = (a.Names?.[0] || a.Name || '').toLowerCase();
            const nameB = (b.Names?.[0] || b.Name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const html = `
            <div class="containers-cards-grid">
                ${sortedContainers.map((container, index) => this.renderContainerCard(container, index)).join('')}
            </div>
        `;

        this.gridContainer.innerHTML = html;

        if (!isRefresh) {
            this.gridContainer.classList.add('loaded');
        } else {
            this.gridContainer.querySelectorAll('.container-card').forEach(card => {
                card.style.animation = 'none';
                card.style.opacity = '1';
            });
        }
    }

    renderContainerCard(container, index) {
        const state = container.State || 'unknown';
        const statusClass = state === 'running' ? 'running' :
            (state === 'paused' ? 'paused' : 'stopped');

        // Get container name (remove leading slash)
        const name = (container.Names?.[0] || container.Name || 'Unknown').replace(/^\//, '');

        // Check if name is long (more than 25 characters)
        const isLongName = name.length > 25;
        const cardId = `card-${index}`;

        // Get image name (short version)
        const image = (container.Image || 'unknown').split(':')[0].split('/').pop();
        const imageTag = (container.Image || '').split(':')[1] || 'latest';

        // Format status
        const status = container.Status || state;

        // Get ports
        const ports = container.Ports || [];
        const portString = ports
            .filter(p => p.PublicPort)
            .map(p => `${p.PublicPort}:${p.PrivatePort}`)
            .slice(0, 3)
            .join(', ');

        const animDelay = index * 0.05;

        return `
            <div class="container-card ${statusClass}" style="--anim-delay: ${animDelay}s" id="${cardId}">
                <div class="card-header">
                    <div class="container-info">
                        <div class="status-dot ${statusClass}"></div>
                        <div class="name-wrapper ${isLongName ? 'truncated' : ''}">
                            <h3 class="container-name">${name}</h3>
                            ${isLongName ? `
                                <button class="expand-name-btn" onclick="containersPage.toggleName('${cardId}')" title="Show full name">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="status-badge ${statusClass}">
                        ${state.charAt(0).toUpperCase() + state.slice(1)}
                    </div>
                </div>

                <div class="card-body">
                    <div class="info-row">
                        <span class="info-label">Image</span>
                        <span class="info-value">${image}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Tag</span>
                        <span class="info-value tag">${imageTag}</span>
                    </div>
                    ${portString ? `
                        <div class="info-row">
                            <span class="info-label">Ports</span>
                            <span class="info-value ports">${portString}</span>
                        </div>
                    ` : ''}
                    <div class="info-row status-row">
                        <span class="info-label">Status</span>
                        <span class="info-value status">${status}</span>
                    </div>
                </div>
            </div>
        `;
    }

    toggleName(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;
        const wrapper = card.querySelector('.name-wrapper');
        if (wrapper) {
            wrapper.classList.toggle('expanded');
            wrapper.classList.toggle('truncated');
        }
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
        this.gridContainer.innerHTML = `
            <div class="containers-error-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Unable to load container data</h3>
                <p>Please check that Portainer is configured correctly</p>
                <button class="retry-btn" onclick="containersPage.loadContainers()">Try Again</button>
            </div>
        `;
    }

    renderEmpty() {
        this.gridContainer.innerHTML = `
            <div class="containers-empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 12H2"></path>
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                </svg>
                <h3>No containers found</h3>
                <p>Docker containers will appear here once detected</p>
            </div>
        `;
    }
}

// Initialize page
const containersPage = new ContainersPage();
document.addEventListener('DOMContentLoaded', () => containersPage.init());
