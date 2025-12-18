/**
 * MascotBuddy - Dynamic Mascot Companion System
 * A free-roaming, personality-filled robot mascot that follows you around the page
 */

class MascotBuddy {
    constructor() {
        // Initial position
        // Check if we are arriving from a warp
        const isWarping = sessionStorage.getItem('isWarping');
        if (isWarping) {
            // We'll let the CSS class handle the initial position in init()
            // But we need a valid logical position so it doesn't jump when we exit warp
            // User requested "Left Middle" for arrival
            this.position = {
                x: 20,
                y: window.innerHeight / 2
            };
        } else {
            // Default bottom right
            this.position = {
                x: window.innerWidth - 100,
                y: window.innerHeight - 100
            };
        }

        this.targetPosition = { ...this.position };
        this.velocity = { x: 0, y: 0 };

        // State
        this.mood = 'happy'; // happy, sad, worried, surprised, sleepy, curious
        this.isBeingDragged = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.offlineServers = [];
        this.stoppedContainers = 0;  // Track stopped containers
        this.patrolIndex = 0;
        this.patrolDirection = 1;

        // Animation state
        this.idleTimer = null;
        this.particleTimer = null;
        this.patrolTimer = null;
        this.isAnimating = false;
        this.lastIdleAnimation = 0;

        // Elements (will be set in init)
        this.element = null;
        this.pupilLeft = null;
        this.pupilRight = null;
        this.particles = [];

        // Settings
        this.moveSpeed = 0.08;
        this.particleInterval = 150;
        this.idleAnimationInterval = 15000; // 15-30 seconds
        this.patrolSpeed = 10000; // Time to stay at each target (10 seconds)

        // Bind methods
        this.update = this.update.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
    }

    init() {
        // Create mascot element if it doesn't exist
        this.createMascotElement();

        // Get element references
        this.element = document.getElementById('mascot-buddy');
        this.pupilLeft = document.getElementById('mascot-pupil-left');
        this.pupilRight = document.getElementById('mascot-pupil-right');
        this.particlesContainer = document.getElementById('mascot-particles');

        if (!this.element) {
            console.warn('Mascot element not found');
            return;
        }

        // Restore position from session
        this.restorePosition();

        // Apply initial position
        // If warping, apply the center class immediately
        if (sessionStorage.getItem('isWarping')) {
            this.element.classList.add('warp-mode', 'warp-center');
            // Safety fallback: Force absolute styling in case CSS fails/delays
            this.element.style.left = '20px';
            this.element.style.top = '50%';
            this.element.style.transform = 'translateY(-50%)';
            this.isWarping = true;
        } else {
            this.applyPosition();
        }

        // Setup event listeners
        this.setupEventListeners();

        // Check time of day for sleepy mode
        this.checkTimeOfDay();

        // Check for seasonal outfit
        this.checkSeason();

        // Check theme for sunglasses
        this.checkTheme();

        // Start animation loop
        this.startAnimationLoop();

        // Start idle animation timer
        this.startIdleTimer();

        // Start particle system
        this.startParticleSystem();

        console.log('🤖 MascotBuddy initialized!');
    }

    createMascotElement() {
        // Check if mascot already exists
        if (document.getElementById('mascot-buddy')) return;

        const mascotHTML = `
            <div class="mascot-buddy" id="mascot-buddy">
                <div class="mascot-particles" id="mascot-particles"></div>
                <div class="mascot-outfit" id="mascot-outfit"></div>
                <div class="mascot-body">
                    <!-- Santa Hat -->
                    <div class="santa-hat">
                        <div class="santa-hat-base">
                            <div class="santa-hat-tip"></div>
                        </div>
                    </div>
                    <div class="mascot-antenna">
                        <div class="antenna-ball"></div>
                    </div>
                    <div class="mascot-head">
                        <div class="mascot-eye left">
                            <div class="mascot-pupil" id="mascot-pupil-left"></div>
                            <div class="mascot-eyelid"></div>
                        </div>
                        <div class="mascot-eye right">
                            <div class="mascot-pupil" id="mascot-pupil-right"></div>
                            <div class="mascot-eyelid"></div>
                        </div>
                        <div class="mascot-sunglasses" id="mascot-sunglasses"></div>
                        <div class="mascot-mouth"></div>
                    </div>
                    <!-- Rocket Thrusters -->
                    <div class="mascot-thrusters">
                        <div class="thruster left"></div>
                        <div class="thruster right"></div>
                    </div>
                </div>
                <div class="mascot-tool" id="mascot-tool">
                    <span class="tool-icon">🔧</span>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', mascotHTML);
    }

    setupEventListeners() {
        // Mouse tracking for eyes
        document.addEventListener('mousemove', this.onMouseMove);

        // Drag events
        this.element.addEventListener('mousedown', this.onDragStart);
        document.addEventListener('mousemove', this.onDrag);
        document.addEventListener('mouseup', this.onDragEnd);

        // Touch events for mobile
        this.element.addEventListener('touchstart', this.onDragStart, { passive: false });
        document.addEventListener('touchmove', this.onDrag, { passive: false });
        document.addEventListener('touchend', this.onDragEnd);

        // Click reactions
        this.element.addEventListener('click', (e) => {
            if (!this.isDragging) this.onClick();
        });
        this.element.addEventListener('dblclick', () => this.onDoubleClick());

        // Scroll event for companion following
        window.addEventListener('scroll', () => this.updateTargetPosition());
        window.addEventListener('resize', () => this.updateTargetPosition());

        // Theme change observer
        const observer = new MutationObserver(() => this.checkTheme());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // ===== POSITION & MOVEMENT =====

    restorePosition() {
        const saved = sessionStorage.getItem('mascot-position');
        if (saved) {
            const pos = JSON.parse(saved);
            this.position = pos;
            this.targetPosition = { ...pos };
        }
    }

    savePosition() {
        sessionStorage.setItem('mascot-position', JSON.stringify(this.position));
    }

    applyPosition() {
        if (!this.element) return;
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
    }

    updateTargetPosition() {
        if (this.isBeingDragged) return;

        // If there are any offline items (servers OR containers), patrol between them
        if (this.offlineServers.length > 0 || this.stoppedContainers > 0) {
            this.updatePatrolTarget();
            return;
        }

        // Otherwise, follow scroll as companion (center of viewport)
        const viewportHeight = window.innerHeight;

        this.targetPosition = {
            x: 20,
            y: viewportHeight / 2  // Viewport-relative for fixed positioning
        };
    }

    updatePatrolTarget() {
        // Build list of all patrol targets
        const targets = [];

        // Add offline server cards (on servers page and index page)
        const serverCards = document.querySelectorAll('.server-card-v2.offline, .server-showcase-card.offline, .server-card.offline, .pyrodactyl-server.offline, .mini-widget.offline');
        serverCards.forEach(card => targets.push(card));

        // Add stopped container cards (on containers page)
        const stoppedContainerCards = document.querySelectorAll('.container-card.stopped');
        stoppedContainerCards.forEach(card => targets.push(card));

        // Add Portainer widget header if containers are stopped (on main dashboard)
        if (this.stoppedContainers > 0) {
            const portainerWidget = this.getPortainerWidgetHeader();
            if (portainerWidget) {
                targets.push(portainerWidget);
            }
        }

        if (targets.length === 0) return;

        const targetElement = targets[this.patrolIndex % targets.length];
        if (!targetElement) return;

        // getBoundingClientRect returns viewport-relative coordinates
        // which is perfect for position: fixed elements
        const rect = targetElement.getBoundingClientRect();

        this.targetPosition = {
            x: Math.max(10, rect.left - 60), // Position to the left, min 10px from edge
            y: rect.top + (rect.height / 2)   // Viewport-relative Y position
        };
    }

    checkVisibleTargets() {
        // Check if any offline targets are visible in the viewport
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Helper function to check if element is in viewport
        const isInViewport = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.top < viewportHeight && rect.bottom > 0 &&
                rect.left < viewportWidth && rect.right > 0;
        };

        // Check for offline server cards on servers page and index page
        const offlineCards = document.querySelectorAll('.server-card-v2.offline, .server-showcase-card.offline, .mini-widget.offline');
        for (const card of offlineCards) {
            if (isInViewport(card)) return true;
        }

        // Check for stopped container cards on containers page
        const stoppedCards = document.querySelectorAll('.container-card.stopped');
        for (const card of stoppedCards) {
            if (isInViewport(card)) return true;
        }

        // Check pyrodactyl widget on main dashboard
        if (this.offlineServers.length > 0) {
            const pyroWidget = document.getElementById('pyrodactyl-content');
            if (pyroWidget && isInViewport(pyroWidget)) return true;
        }

        // Check Portainer widget if containers are stopped (legacy fallback)
        if (this.stoppedContainers > 0) {
            const portainerWidget = document.getElementById('portainer-content');
            if (portainerWidget && isInViewport(portainerWidget)) return true;
        }

        return false;
    }

    getPortainerWidgetHeader() {
        // Firefox-compatible way to find Portainer widget header
        // First try direct ID selector
        let widget = document.querySelector('#portainer-widget .widget-header');
        if (widget) return widget;

        // Fallback: find the widget containing portainer-content
        const portainerContent = document.getElementById('portainer-content');
        if (portainerContent) {
            // Walk up to find the widget parent
            let parent = portainerContent.parentElement;
            while (parent && !parent.classList.contains('widget')) {
                parent = parent.parentElement;
            }
            if (parent) {
                return parent.querySelector('.widget-header');
            }
        }

        return null;
    }

    startPatrol() {
        if (this.patrolTimer) return;

        this.patrolTimer = setInterval(() => {
            // Count total targets (servers + portainer if containers down)
            const serverCount = this.offlineServers.length;
            const containerTarget = this.stoppedContainers > 0 ? 1 : 0;
            const totalTargets = serverCount + containerTarget;

            if (totalTargets <= 1) return;

            // Move to next target
            this.patrolIndex += this.patrolDirection;

            // Bounce at ends
            if (this.patrolIndex >= totalTargets - 1) {
                this.patrolDirection = -1;
            } else if (this.patrolIndex <= 0) {
                this.patrolDirection = 1;
            }

            this.updatePatrolTarget();
        }, this.patrolSpeed);
    }

    stopPatrol() {
        if (this.patrolTimer) {
            clearInterval(this.patrolTimer);
            this.patrolTimer = null;
        }
        this.patrolIndex = 0;
    }

    update() {
        if (this.isBeingDragged) return;

        // In warp mode, we override everything to center on screen
        if (this.isWarping) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Set target to Left Side (user preference: "fly to left, arrive on left")
            this.targetPosition.x = 20;
            this.targetPosition.y = viewportHeight / 2 - 50;
        } else {
            // NORMAL MODE LOGIC (Only run if NOT warping)

            // Check if any offline targets are visible on screen
            const hasVisibleTargets = this.checkVisibleTargets();

            // If patrolling but no targets visible, return to happy idle
            if ((this.offlineServers.length > 0 || this.stoppedContainers > 0) && !hasVisibleTargets) {
                // Targets scrolled off screen - go back to happy idle position
                this.targetPosition = {
                    x: 20,
                    y: window.innerHeight / 2
                };
                if (this.mood === 'sad') {
                    this.setMood('happy');
                }
            } else if (this.offlineServers.length > 0 || this.stoppedContainers > 0) {
                // Targets visible - patrol to them
                this.updatePatrolTarget();
                if (this.mood !== 'sad') {
                    this.setMood('sad');
                }
            } else {
                // Happy companion mode (no offline servers)
                // Always return to left side if nothing else to do
                this.targetPosition = {
                    x: 20,
                    y: window.innerHeight / 2
                };
            }
        }

        // Clamp target position to viewport bounds (mascot should never go off screen)
        const margin = 60; // Keep mascot slightly in from edges
        this.targetPosition.x = Math.max(10, Math.min(this.targetPosition.x, window.innerWidth - margin));
        this.targetPosition.y = Math.max(margin, Math.min(this.targetPosition.y, window.innerHeight - margin));

        // Smooth floating movement using lerp (no rubber-banding)
        // Move faster if in warp mode, but smooth enough to see (not instant)
        const lerpSpeed = this.isWarping ? 0.05 : 0.015;

        const dx = this.targetPosition.x - this.position.x;
        const dy = this.targetPosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only move if we're far enough from target
        if (distance > 1) {
            // Lerp toward target
            this.position.x += dx * lerpSpeed;
            this.position.y += dy * lerpSpeed;

            // Spawn particles while floating
            if (distance > 5 && Math.random() < 0.08) {
                this.spawnParticle();
            }
        }

        // Also clamp actual position to viewport
        this.position.x = Math.max(10, Math.min(this.position.x, window.innerWidth - margin));
        this.position.y = Math.max(margin, Math.min(this.position.y, window.innerHeight - margin));

        // Apply position to element
        this.applyPosition();

        // Save position occasionally
        if (Math.random() < 0.01) this.savePosition();
    }

    startAnimationLoop() {
        const animate = () => {
            this.update();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    // ===== EYES =====

    onMouseMove(e) {
        if (!this.pupilLeft || !this.pupilRight) return;

        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        const maxMove = 3;
        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        const normalizedX = distance > 0 ? (deltaX / distance) * Math.min(distance / 50, 1) * maxMove : 0;
        const normalizedY = distance > 0 ? (deltaY / distance) * Math.min(distance / 50, 1) * maxMove : 0;

        this.pupilLeft.style.transform = `translate(${normalizedX}px, ${normalizedY}px)`;
        this.pupilRight.style.transform = `translate(${normalizedX}px, ${normalizedY}px)`;

        // Check if near a widget for curious expression
        this.checkCuriosity(e);
    }

    checkCuriosity(e) {
        const widgets = document.querySelectorAll('.widget, .server-showcase-card');
        let nearWidget = false;

        widgets.forEach(widget => {
            const rect = widget.getBoundingClientRect();
            const mascotRect = this.element.getBoundingClientRect();

            // Check if mascot is near widget
            const distance = Math.sqrt(
                Math.pow(mascotRect.left - rect.left, 2) +
                Math.pow(mascotRect.top - rect.top, 2)
            );

            if (distance < 150 && !this.isAnimating && this.mood !== 'sad') {
                nearWidget = true;
            }
        });

        if (nearWidget && this.mood !== 'curious' && this.mood !== 'sad' && !this.isAnimating) {
            this.setMood('curious');
            setTimeout(() => {
                if (this.mood === 'curious') this.setMood('happy');
            }, 2000);
        }
    }

    // ===== DRAG & DROP =====

    onDragStart(e) {
        e.preventDefault();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = this.element.getBoundingClientRect();
        this.dragOffset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };

        this.isBeingDragged = true;
        this.isDragging = false;
        this.element.classList.add('dragging');
        this.setMood('surprised');
    }

    onDrag(e) {
        if (!this.isBeingDragged) return;

        e.preventDefault();
        this.isDragging = true;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        this.position = {
            x: clientX - this.dragOffset.x,
            y: clientY - this.dragOffset.y  // Viewport-relative for fixed positioning
        };

        this.applyPosition();

        // Spawn particles while dragging
        if (Math.random() < 0.3) this.spawnParticle();
    }

    onDragEnd() {
        if (!this.isBeingDragged) return;

        this.isBeingDragged = false;
        this.element.classList.remove('dragging');
        this.setMood('happy');

        // Spawn particles as it floats back
        for (let i = 0; i < 8; i++) {
            setTimeout(() => this.spawnParticle(), i * 50);
        }

        // Let the smooth lerp movement handle returning to position
        // No bouncy CSS animation needed
        setTimeout(() => {
            this.isDragging = false;
        }, 100);

        // Update target to scroll position
        this.updateTargetPosition();
    }

    // ===== MOOD & EXPRESSIONS =====

    setMood(mood) {
        this.mood = mood;

        // Remove all mood classes
        this.element.classList.remove('happy', 'sad', 'worried', 'surprised', 'sleepy', 'curious');

        // Add new mood class
        this.element.classList.add(mood);

        // Show/hide tool based on mood
        const tool = document.getElementById('mascot-tool');
        if (tool) {
            tool.style.display = mood === 'sad' ? 'block' : 'none';
        }
    }

    setOfflineServers(servers) {
        const hadOffline = this.offlineServers.length > 0 || this.stoppedContainers > 0;
        this.offlineServers = servers || [];

        this.updateOfflineState(hadOffline);
    }

    setContainerStatus(stopped, running) {
        const hadOffline = this.offlineServers.length > 0 || this.stoppedContainers > 0;
        this.stoppedContainers = stopped || 0;

        this.updateOfflineState(hadOffline);
    }

    updateOfflineState(hadOffline) {
        const hasOffline = this.offlineServers.length > 0 || this.stoppedContainers > 0;

        if (hasOffline) {
            this.setMood('sad');
            this.startPatrol();
        } else {
            if (hadOffline) {
                // Celebrate! Everything is back online
                this.playAnimation('bounce');
            }
            this.setMood('happy');
            this.stopPatrol();
            this.updateTargetPosition();
        }
    }

    checkTimeOfDay() {
        const hour = new Date().getHours();

        // Sleepy between 11pm and 5am
        if (hour >= 23 || hour < 5) {
            if (this.mood !== 'sad' && this.mood !== 'worried') {
                this.setMood('sleepy');
            }
        }
    }

    checkTheme() {
        const theme = document.documentElement.getAttribute('data-theme');
        const sunglasses = document.getElementById('mascot-sunglasses');

        if (sunglasses) {
            if (theme === 'light') {
                sunglasses.classList.add('visible');
            } else {
                sunglasses.classList.remove('visible');
            }
        }
    }

    checkSeason() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        // Remove all seasonal classes
        this.element.classList.remove('christmas', 'halloween', 'newyear');

        // Christmas: Dec 1-25
        if (month === 12 && day >= 1 && day <= 25) {
            this.element.classList.add('christmas');
        }
        // Halloween: Oct 15-31
        else if (month === 10 && day >= 15) {
            this.element.classList.add('halloween');
        }
        // New Year: Dec 31 - Jan 2
        else if ((month === 12 && day === 31) || (month === 1 && day <= 2)) {
            this.element.classList.add('newyear');
        }
    }

    // ===== WARP MODE =====

    enterWarpMode() {
        this.isWarping = true;
        this.element.classList.add('warp-mode'); // Don't add warp-center yet, let him fly there!

        // Remove any other animation classes immediately
        this.element.classList.remove('anim-bounce', 'anim-spin', 'anim-flip', 'anim-wave');
        this.isAnimating = false;

        this.setMood('surprised');

        // Stop patrol so logic doesn't interfere
        this.stopPatrol();
    }

    exitWarpMode(immediate = false) {
        this.isWarping = false;

        // Remove centering constraint
        this.element.classList.remove('warp-mode', 'warp-center');
        // Clear manual safety styles
        this.element.style.transform = '';

        this.setMood('happy');

        if (immediate) {
            // Force JS position to match the "Left Middle" where he arrives
            // so there is no jump when the class is removed
            this.position.x = 20;
            this.position.y = window.innerHeight / 2 - (this.element.offsetHeight / 2);
            this.applyPosition();
        }

        // Return to normal positioning (companion follow)
        this.updateTargetPosition();
    }

    // ===== ANIMATIONS =====

    startIdleTimer() {
        const doIdleAnimation = () => {
            const now = Date.now();
            if (now - this.lastIdleAnimation > this.idleAnimationInterval && !this.isAnimating && !this.isBeingDragged) {
                this.playRandomIdleAnimation();
                this.lastIdleAnimation = now;
            }

            // Random interval between 15-30 seconds
            const nextInterval = 15000 + Math.random() * 15000;
            this.idleTimer = setTimeout(doIdleAnimation, nextInterval);
        };

        doIdleAnimation();
    }

    playRandomIdleAnimation() {
        const animations = ['bounce', 'spin', 'flip', 'wave'];
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        this.playAnimation(randomAnimation);
    }

    playAnimation(name) {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.element.classList.add(`anim-${name}`);

        // Spawn extra particles during animations
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.spawnParticle(), i * 50);
        }

        setTimeout(() => {
            this.element.classList.remove(`anim-${name}`);
            this.isAnimating = false;
        }, 600);
    }

    onClick() {
        if (this.mood === 'sad') {
            // Clicking when sad temporarily cheers him up
            this.setMood('happy');
            this.playAnimation('bounce');
            setTimeout(() => {
                if (this.offlineServers.length > 0) {
                    this.setMood('sad');
                }
            }, 2000);
        } else {
            this.playAnimation('bounce');
        }
    }

    onDoubleClick() {
        this.playAnimation('flip');
    }

    // ===== PARTICLES =====

    startParticleSystem() {
        this.particleTimer = setInterval(() => {
            if (!this.isBeingDragged && Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.y) > 0.5) {
                this.spawnParticle();
            }
        }, this.particleInterval);
    }

    spawnParticle() {
        if (!this.particlesContainer) return;

        const particle = document.createElement('div');
        particle.className = 'mascot-particle';

        // Spawn from bottom of mascot (like exhaust/thruster)
        const offsetX = (Math.random() - 0.5) * 20;  // Slight horizontal spread

        particle.style.left = `${25 + offsetX}px`;
        particle.style.top = `55px`;  // Below the mascot head

        // Random color from accent palette
        const colors = ['var(--accent-primary)', 'var(--accent-secondary)', '#fff'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        this.particlesContainer.appendChild(particle);

        // Remove after animation
        setTimeout(() => particle.remove(), 1000);
    }

    // ===== CLEANUP =====

    destroy() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.particleTimer) clearInterval(this.particleTimer);
        if (this.patrolTimer) clearInterval(this.patrolTimer);

        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.onDragEnd);

        this.savePosition();
    }
}

// Create global instance
window.mascotBuddy = new MascotBuddy();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.mascotBuddy.init());
} else {
    window.mascotBuddy.init();
}
