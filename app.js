/**
 * GKS Home Dashboard - Main Application
 * Simplified grid-based widget layout with DOM reordering
 */

class Dashboard {
    constructor() {
        this.widgets = new Map();
        this.refreshTimers = new Map();
        this.editMode = false;
        this.dragging = null;
        this.resizing = null;
    }

    async init() {
        await loadConfig();
        this.initTheme();
        this.initEditMode();
        this.restoreWidgetLayout();
        this.setExternalLinks();
        this.setGreeting();
        await this.initWidgets();
        this.startRefreshTimers();
        window.dashboard = this;
        console.log('GKS Home Dashboard initialized');
    }

    // ===== Greeting =====
    setGreeting() {
        this.updateGreeting();
        // Update time every second
        setInterval(() => this.updateTime(), 1000);
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Welcome';
        let emoji = '👋';

        if (hour >= 5 && hour < 12) {
            greeting = 'Good morning';
            emoji = '☀️';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good afternoon';
            emoji = '🌤️';
        } else if (hour >= 17 && hour < 21) {
            greeting = 'Good evening';
            emoji = '🌅';
        } else {
            greeting = 'Good night';
            emoji = '🌙';
        }

        const greetingEl = document.getElementById('greeting');
        if (greetingEl) {
            greetingEl.textContent = `${emoji} ${greeting}`;
        }
        this.updateTime();
    }

    updateTime() {
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            const now = new Date();
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
            timeEl.textContent = `${date} • ${time}`;
        }
    }

    // ===== Theme Management =====
    initTheme() {
        const savedTheme = localStorage.getItem(CONFIG.storage.theme) || 'dark';
        this.setTheme(savedTheme);

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
            localStorage.setItem(CONFIG.storage.theme, next);
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // Navigation removed - now using direct links

    // ===== Edit Mode =====
    initEditMode() {
        const editToggle = document.getElementById('edit-toggle');
        if (!editToggle) return;

        editToggle.addEventListener('click', () => this.toggleEditMode());
        this.setupWidgetInteractions();
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        document.body.classList.toggle('edit-mode', this.editMode);
        document.getElementById('edit-toggle')?.classList.toggle('active', this.editMode);

        if (this.editMode) {
            NotificationManager.info('Edit mode: Drag widgets to reorder, corners to resize');
        } else {
            this.saveWidgetLayout();
            NotificationManager.success('Layout saved');
        }
    }

    setupWidgetInteractions() {
        const grid = document.querySelector('.dashboard-grid');

        document.querySelectorAll('.widget').forEach(widget => {
            // Add resize handle if not exists
            if (!widget.querySelector('.resize-handle')) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                handle.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"/></svg>';
                widget.appendChild(handle);

                // Resize handler
                handle.addEventListener('mousedown', (e) => this.startResize(e, widget));
            }

            // Drag handler (on widget header to avoid conflicts)
            widget.addEventListener('mousedown', (e) => {
                if (!this.editMode) return;
                if (e.target.closest('.resize-handle')) return;
                if (e.target.closest('a') || e.target.closest('button')) return;
                this.startDrag(e, widget);
            });
        });

        // Global mouse events
        document.addEventListener('mousemove', (e) => {
            if (this.dragging) this.onDrag(e);
            if (this.resizing) this.onResize(e);
        });

        document.addEventListener('mouseup', () => {
            if (this.dragging) this.endDrag();
            if (this.resizing) this.endResize();
        });
    }

    // ===== Drag & Drop (DOM Reorder) =====
    startDrag(e, widget) {
        e.preventDefault();

        const rect = widget.getBoundingClientRect();
        this.dragging = {
            widget,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            placeholder: null
        };

        // Create placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'widget-placeholder';
        placeholder.style.gridColumn = widget.style.gridColumn || 'span 2';
        placeholder.style.gridRow = widget.style.gridRow || 'span 2';
        widget.parentNode.insertBefore(placeholder, widget);
        this.dragging.placeholder = placeholder;

        // Make widget float
        widget.classList.add('dragging');
        widget.style.position = 'fixed';
        widget.style.width = rect.width + 'px';
        widget.style.height = rect.height + 'px';
        widget.style.zIndex = '1000';
        this.updateDragPosition(e);
    }

    onDrag(e) {
        if (!this.dragging) return;
        this.updateDragPosition(e);
        this.updateDropTarget(e);
    }

    updateDragPosition(e) {
        const { widget, offsetX, offsetY } = this.dragging;
        widget.style.left = (e.clientX - offsetX) + 'px';
        widget.style.top = (e.clientY - offsetY) + 'px';
    }

    updateDropTarget(e) {
        const grid = document.querySelector('.dashboard-grid');
        const widgets = [...grid.querySelectorAll('.widget:not(.dragging)')];

        // Clear all highlights
        widgets.forEach(w => w.classList.remove('drag-over', 'drag-before', 'drag-after'));

        // Find widget we're hovering over
        for (const target of widgets) {
            const rect = target.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {

                // Determine if before or after based on position
                const midX = rect.left + rect.width / 2;
                const midY = rect.top + rect.height / 2;
                const insertBefore = e.clientY < midY || (e.clientY >= midY && e.clientX < midX);

                target.classList.add('drag-over');
                target.classList.add(insertBefore ? 'drag-before' : 'drag-after');
                this.dragging.dropTarget = { widget: target, before: insertBefore };
                return;
            }
        }

        this.dragging.dropTarget = null;
    }

    endDrag() {
        if (!this.dragging) return;

        const { widget, placeholder, dropTarget } = this.dragging;
        const grid = document.querySelector('.dashboard-grid');

        // Remove placeholder
        placeholder?.remove();

        // Reset widget styles
        widget.classList.remove('dragging');
        widget.style.position = '';
        widget.style.width = '';
        widget.style.height = '';
        widget.style.left = '';
        widget.style.top = '';
        widget.style.zIndex = '';

        // Move widget in DOM
        if (dropTarget) {
            if (dropTarget.before) {
                grid.insertBefore(widget, dropTarget.widget);
            } else {
                grid.insertBefore(widget, dropTarget.widget.nextSibling);
            }
            dropTarget.widget.classList.remove('drag-over', 'drag-before', 'drag-after');
        }

        this.dragging = null;
        this.saveWidgetLayout();
    }

    // ===== Resize =====
    startResize(e, widget) {
        if (!this.editMode) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = widget.getBoundingClientRect();
        const gridRect = document.querySelector('.dashboard-grid').getBoundingClientRect();
        const colWidth = gridRect.width / 4; // 4 columns

        this.resizing = {
            widget,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: rect.width,
            startHeight: rect.height,
            colWidth,
            rowHeight: 150,
            startColSpan: parseInt(widget.dataset.colSpan) || 2,
            startRowSpan: parseInt(widget.dataset.rowSpan) || 2
        };

        widget.classList.add('resizing');
    }

    onResize(e) {
        if (!this.resizing) return;

        const { widget, startX, startY, startColSpan, startRowSpan, colWidth, rowHeight } = this.resizing;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Calculate new spans (minimum 1, maximum 4 for cols, 4 for rows)
        const newColSpan = Math.max(1, Math.min(4, startColSpan + Math.round(deltaX / colWidth)));
        const newRowSpan = Math.max(1, Math.min(4, startRowSpan + Math.round(deltaY / rowHeight)));

        widget.style.gridColumn = `span ${newColSpan}`;
        widget.style.gridRow = `span ${newRowSpan}`;
        widget.dataset.colSpan = newColSpan;
        widget.dataset.rowSpan = newRowSpan;
    }

    endResize() {
        if (!this.resizing) return;
        this.resizing.widget.classList.remove('resizing');
        this.resizing = null;
        this.saveWidgetLayout();
    }

    // ===== External Links =====
    setExternalLinks() {
        const links = {
            'proxmox-link': CONFIG.externalLinks.proxmox,
            'jellyfin-link': CONFIG.externalLinks.jellyfin,
            'jellyseerr-link': CONFIG.externalLinks.jellyseerr,
            'jellyfin-header-link': CONFIG.externalLinks.jellyfin,
            'jellyseerr-header-link': CONFIG.externalLinks.jellyseerr,
        };
        Object.entries(links).forEach(([id, url]) => {
            const link = document.getElementById(id);
            if (link && url) link.href = url;
            else if (link) link.style.display = 'none';
        });
    }

    // ===== Widget Initialization =====
    async initWidgets() {
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
        ['proxmox', 'jellyfin', 'jellyseerr'].forEach(name => {
            const interval = CONFIG.refreshIntervals[name];
            if (!interval) return;

            this.refreshTimers.set(name, setInterval(async () => {
                const widget = this.widgets.get(name);
                if (widget) {
                    this.showRefreshIndicator(name);
                    await widget.load();
                    this.hideRefreshIndicator(name);
                }
            }, interval));
        });
    }

    showRefreshIndicator(name) {
        document.getElementById(`${name}-widget`)?.querySelector('.refresh-indicator')?.classList.add('active');
    }

    hideRefreshIndicator(name) {
        document.getElementById(`${name}-widget`)?.querySelector('.refresh-indicator')?.classList.remove('active');
    }

    // ===== Save/Restore Layout =====
    saveWidgetLayout() {
        const grid = document.querySelector('.dashboard-grid');
        const layout = {
            order: [...grid.children].map(w => w.dataset.widget),
            sizes: {}
        };

        grid.querySelectorAll('.widget').forEach(widget => {
            layout.sizes[widget.dataset.widget] = {
                colSpan: widget.dataset.colSpan || '2',
                rowSpan: widget.dataset.rowSpan || '2'
            };
        });

        localStorage.setItem(CONFIG.storage.widgetLayout, JSON.stringify(layout));
    }

    restoreWidgetLayout() {
        const saved = localStorage.getItem(CONFIG.storage.widgetLayout);
        const grid = document.querySelector('.dashboard-grid');

        if (saved) {
            try {
                const layout = JSON.parse(saved);

                // Restore order
                if (layout.order) {
                    layout.order.forEach(name => {
                        const widget = document.querySelector(`[data-widget="${name}"]`);
                        if (widget) grid.appendChild(widget);
                    });
                }

                // Restore sizes
                if (layout.sizes) {
                    Object.entries(layout.sizes).forEach(([name, size]) => {
                        const widget = document.querySelector(`[data-widget="${name}"]`);
                        if (widget) {
                            widget.style.gridColumn = `span ${size.colSpan}`;
                            widget.style.gridRow = `span ${size.rowSpan}`;
                            widget.dataset.colSpan = size.colSpan;
                            widget.dataset.rowSpan = size.rowSpan;
                        }
                    });
                }
                return;
            } catch (e) {
                console.warn('Could not restore layout');
            }
        }

        // Set defaults
        document.querySelectorAll('.widget').forEach(widget => {
            widget.style.gridColumn = 'span 2';
            widget.style.gridRow = 'span 2';
            widget.dataset.colSpan = '2';
            widget.dataset.rowSpan = '2';
        });
    }

    // ===== Settings =====
    initSettings() {
        document.getElementById('reset-layout')?.addEventListener('click', () => {
            localStorage.removeItem(CONFIG.storage.widgetLayout);
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
        setTimeout(() => notification.remove(), duration);
    }

    static getIcon(type) {
        const icons = {
            success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
            error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
            warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
            info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
        };
        return icons[type] || icons.info;
    }

    static success(msg) { this.show(msg, 'success'); }
    static error(msg) { this.show(msg, 'error'); }
    static warning(msg) { this.show(msg, 'warning'); }
    static info(msg) { this.show(msg, 'info'); }
}

// ===== API Helper =====
class API {
    static async fetch(endpoint, options = {}) {
        const response = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
    }
}

window.NotificationManager = NotificationManager;
window.API = API;

document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new Dashboard();
    dashboard.init();
});
