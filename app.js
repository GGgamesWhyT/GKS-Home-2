/**
 * GKS Home Dashboard - Main Application
 */

class Dashboard {
    constructor() {
        this.widgets = new Map();
        this.refreshTimers = new Map();
        this.draggedWidget = null;
        this.editMode = false;
        this.resizing = null;
    }

    async init() {
        // Load configuration from backend
        await loadConfig();

        // Initialize theme
        this.initTheme();

        // Initialize navigation
        this.initNavigation();

        // Initialize edit mode
        this.initEditMode();

        // Restore widget positions and sizes
        this.restoreWidgetPositions();
        this.restoreWidgetSizes();

        // Set external links
        this.setExternalLinks();

        // Initialize all widgets
        await this.initWidgets();

        // Start refresh timers
        this.startRefreshTimers();

        // Settings handlers
        this.initSettings();

        // Make dashboard globally available
        window.dashboard = this;

        console.log('GKS Home Dashboard initialized');
    }

    // ===== Theme Management =====
    initTheme() {
        const savedTheme = localStorage.getItem(CONFIG.storage.theme) || 'dark';
        this.setTheme(savedTheme);

        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            localStorage.setItem(CONFIG.storage.theme, newTheme);
        });

        // Theme select in settings
        const themeSelect = document.getElementById('theme-select');
        themeSelect.value = savedTheme;
        themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            if (theme === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.setTheme(prefersDark ? 'dark' : 'light');
            } else {
                this.setTheme(theme);
            }
            localStorage.setItem(CONFIG.storage.theme, theme);
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // ===== Navigation =====
    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;

                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                document.getElementById('dashboard').classList.toggle('hidden', section !== 'dashboard');
                document.getElementById('settings').classList.toggle('hidden', section !== 'settings');
            });
        });
    }

    // ===== Edit Mode =====
    initEditMode() {
        const editToggle = document.getElementById('edit-toggle');
        if (!editToggle) return;

        editToggle.addEventListener('click', () => {
            this.toggleEditMode();
        });

        // Initialize resize handles and drag functionality
        this.initWidgetControls();
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        document.body.classList.toggle('edit-mode', this.editMode);

        const editToggle = document.getElementById('edit-toggle');
        if (editToggle) {
            editToggle.classList.toggle('active', this.editMode);
            editToggle.title = this.editMode ? 'Exit Edit Mode' : 'Edit Dashboard';
        }

        // Update widget draggable state
        const widgets = document.querySelectorAll('.widget');
        widgets.forEach(widget => {
            widget.setAttribute('draggable', this.editMode ? 'true' : 'false');
        });

        if (this.editMode) {
            NotificationManager.info('Edit mode: Drag to move, resize from corners');
        } else {
            // Save positions and sizes when exiting edit mode
            this.saveWidgetPositions();
            this.saveWidgetSizes();
            NotificationManager.success('Layout saved');
        }
    }

    initWidgetControls() {
        const widgets = document.querySelectorAll('.widget');

        widgets.forEach(widget => {
            // Add resize handle
            if (!widget.querySelector('.resize-handle')) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                resizeHandle.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 10H20V8H22V10ZM18 14H16V12H18V14ZM14 18H12V16H14V18ZM10 22H8V20H10V22Z"/>
                    </svg>
                `;
                widget.appendChild(resizeHandle);

                // Resize functionality
                this.initResize(widget, resizeHandle);
            }

            // Drag and drop
            widget.addEventListener('dragstart', (e) => {
                if (!this.editMode) {
                    e.preventDefault();
                    return;
                }
                this.draggedWidget = widget;
                widget.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            widget.addEventListener('dragend', () => {
                widget.classList.remove('dragging');
                this.draggedWidget = null;
                if (this.editMode) {
                    this.saveWidgetPositions();
                }
            });

            widget.addEventListener('dragover', (e) => {
                if (!this.editMode) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                if (this.draggedWidget && this.draggedWidget !== widget) {
                    widget.classList.add('drag-over');
                }
            });

            widget.addEventListener('dragleave', () => {
                widget.classList.remove('drag-over');
            });

            widget.addEventListener('drop', (e) => {
                if (!this.editMode) return;
                e.preventDefault();
                widget.classList.remove('drag-over');

                if (this.draggedWidget && this.draggedWidget !== widget) {
                    const parent = widget.parentNode;
                    const draggedIndex = [...parent.children].indexOf(this.draggedWidget);
                    const targetIndex = [...parent.children].indexOf(widget);

                    if (draggedIndex < targetIndex) {
                        parent.insertBefore(this.draggedWidget, widget.nextSibling);
                    } else {
                        parent.insertBefore(this.draggedWidget, widget);
                    }
                }
            });
        });

        // Set initial draggable state
        widgets.forEach(widget => {
            widget.setAttribute('draggable', 'false');
        });
    }

    initResize(widget, handle) {
        let startX, startY, startWidth, startHeight;

        const onMouseDown = (e) => {
            if (!this.editMode) return;
            e.preventDefault();
            e.stopPropagation();

            this.resizing = widget;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = widget.offsetWidth;
            startHeight = widget.offsetHeight;

            widget.classList.add('resizing');
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!this.resizing) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newWidth = Math.max(300, startWidth + deltaX);
            const newHeight = Math.max(150, startHeight + deltaY);

            widget.style.width = `${newWidth}px`;
            widget.style.height = `${newHeight}px`;
            widget.style.minHeight = `${newHeight}px`;
        };

        const onMouseUp = () => {
            if (this.resizing) {
                this.resizing.classList.remove('resizing');
                this.resizing = null;
                this.saveWidgetSizes();
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);

        // Touch support
        handle.addEventListener('touchstart', (e) => {
            if (!this.editMode) return;
            const touch = e.touches[0];
            onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => { }, stopPropagation: () => { } });
        });
    }

    // ===== External Links =====
    setExternalLinks() {
        const links = {
            'proxmox-link': CONFIG.externalLinks.proxmox,
            'jellyfin-link': CONFIG.externalLinks.jellyfin,
            'jellyseerr-link': CONFIG.externalLinks.jellyseerr,
        };

        Object.entries(links).forEach(([id, url]) => {
            const link = document.getElementById(id);
            if (link && url) {
                link.href = url;
            } else if (link) {
                link.style.display = 'none';
            }
        });
    }

    // ===== Widget Initialization =====
    async initWidgets() {
        // Initialize each widget
        if (typeof ProxmoxWidget !== 'undefined') {
            this.widgets.set('proxmox', new ProxmoxWidget());
            await this.widgets.get('proxmox').load();
        }

        if (typeof JellyfinWidget !== 'undefined') {
            this.widgets.set('jellyfin', new JellyfinWidget());
            await this.widgets.get('jellyfin').load();
        }

        if (typeof JellyseerrWidget !== 'undefined') {
            this.widgets.set('jellyseerr', new JellyseerrWidget());
            await this.widgets.get('jellyseerr').load();
        }
    }

    // ===== Refresh Timers =====
    startRefreshTimers() {
        // Proxmox - every 30 seconds
        this.refreshTimers.set('proxmox', setInterval(async () => {
            const widget = this.widgets.get('proxmox');
            if (widget) {
                this.showRefreshIndicator('proxmox');
                await widget.load();
                this.hideRefreshIndicator('proxmox');
            }
        }, CONFIG.refreshIntervals.proxmox));

        // Jellyfin - every 5 minutes
        this.refreshTimers.set('jellyfin', setInterval(async () => {
            const widget = this.widgets.get('jellyfin');
            if (widget) {
                this.showRefreshIndicator('jellyfin');
                await widget.load();
                this.hideRefreshIndicator('jellyfin');
            }
        }, CONFIG.refreshIntervals.jellyfin));

        // Jellyseerr - every 5 minutes
        this.refreshTimers.set('jellyseerr', setInterval(async () => {
            const widget = this.widgets.get('jellyseerr');
            if (widget) {
                this.showRefreshIndicator('jellyseerr');
                await widget.load();
                this.hideRefreshIndicator('jellyseerr');
            }
        }, CONFIG.refreshIntervals.jellyseerr));
    }

    showRefreshIndicator(widgetName) {
        const widget = document.getElementById(`${widgetName}-widget`);
        if (widget) {
            const indicator = widget.querySelector('.refresh-indicator');
            if (indicator) indicator.classList.add('active');
        }
    }

    hideRefreshIndicator(widgetName) {
        const widget = document.getElementById(`${widgetName}-widget`);
        if (widget) {
            const indicator = widget.querySelector('.refresh-indicator');
            if (indicator) indicator.classList.remove('active');
        }
    }

    // ===== Save/Restore Widget Layout =====
    saveWidgetPositions() {
        const grid = document.querySelector('.dashboard-grid');
        const positions = [...grid.children].map(widget => widget.dataset.widget);
        localStorage.setItem(CONFIG.storage.widgetPositions, JSON.stringify(positions));
    }

    restoreWidgetPositions() {
        const saved = localStorage.getItem(CONFIG.storage.widgetPositions);
        if (!saved) return;

        try {
            const positions = JSON.parse(saved);
            const grid = document.querySelector('.dashboard-grid');
            const widgets = [...grid.children];

            positions.forEach(widgetName => {
                const widget = widgets.find(w => w.dataset.widget === widgetName);
                if (widget) {
                    grid.appendChild(widget);
                }
            });
        } catch (e) {
            console.warn('Could not restore widget positions');
        }
    }

    saveWidgetSizes() {
        const widgets = document.querySelectorAll('.widget');
        const sizes = {};

        widgets.forEach(widget => {
            const name = widget.dataset.widget;
            if (widget.style.width || widget.style.height) {
                sizes[name] = {
                    width: widget.style.width,
                    height: widget.style.height,
                };
            }
        });

        localStorage.setItem(CONFIG.storage.widgetSizes, JSON.stringify(sizes));
    }

    restoreWidgetSizes() {
        const saved = localStorage.getItem(CONFIG.storage.widgetSizes);
        if (!saved) return;

        try {
            const sizes = JSON.parse(saved);
            Object.entries(sizes).forEach(([name, size]) => {
                const widget = document.querySelector(`[data-widget="${name}"]`);
                if (widget && size) {
                    if (size.width) widget.style.width = size.width;
                    if (size.height) {
                        widget.style.height = size.height;
                        widget.style.minHeight = size.height;
                    }
                }
            });
        } catch (e) {
            console.warn('Could not restore widget sizes');
        }
    }

    // ===== Settings =====
    initSettings() {
        const resetBtn = document.getElementById('reset-layout');
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem(CONFIG.storage.widgetPositions);
            localStorage.removeItem(CONFIG.storage.widgetSizes);
            location.reload();
        });
    }
}

// ===== Notification System =====
class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${this.getIcon(type)}
            </svg>
            <span>${message}</span>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    static getIcon(type) {
        switch (type) {
            case 'success':
                return '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
            case 'error':
                return '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
            case 'warning':
                return '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
            default:
                return '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
        }
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static warning(message) {
        this.show(message, 'warning');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

// ===== API Helper =====
class API {
    static async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API fetch error for ${endpoint}:`, error);
            throw error;
        }
    }
}

// Export utilities
window.NotificationManager = NotificationManager;
window.API = API;

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
    dashboard.init();
});
