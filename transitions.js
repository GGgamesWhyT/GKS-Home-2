/**
 * Page Transitions Manager
 * Handles the "Blast Off" warp speed effect between pages
 */

class PageTransitionManager {
    constructor() {
        this.isAnimating = false;
        this.warpDuration = 800; // ms to wait before navigating
    }

    init() {
        // Intercept all internal links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            // Check if it's an internal link
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') {
                return;
            }

            // Prevent default and start transition
            e.preventDefault();
            this.startTransition(href);
        });

        // Check if we just arrived from a warp
        this.checkArrival();
    }

    async startTransition(url) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        console.log('🚀 Preparing for warp speed...');

        // 1. Create/Get Overlay
        const overlay = this.getOverlay();

        // 2. Summon Mascot to center
        if (window.mascotBuddy) {
            window.mascotBuddy.enterWarpMode();
        }

        // 3. Start Warp Effect
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            document.body.classList.add('warping');
        });

        // 4. Wait for acceleration, then navigate
        setTimeout(() => {
            // Save state that we are warping
            sessionStorage.setItem('isWarping', 'true');
            window.location.href = url;
        }, this.warpDuration);
    }

    checkArrival() {
        // Check if we arrived via warp
        const isWarping = sessionStorage.getItem('isWarping');

        if (isWarping) {
            console.log('✨ Arrived from warp!');

            // Immediately show overlay (active) to cover loading
            const overlay = this.getOverlay();
            overlay.classList.add('active', 'arrival');

            // Ensure mascot is in warp mode initially (so he doesn't jump)
            if (window.mascotBuddy) {
                // We need to wait for mascot to init, or force it if it's ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.finishArrival());
                } else {
                    this.finishArrival();
                }
            } else {
                this.finishArrival();
            }

            sessionStorage.removeItem('isWarping');
        }
    }

    finishArrival() {
        const overlay = this.getOverlay();

        // 1. Force mascot to center (as if he just arrived)
        // 1. Force mascot to center (as if he just arrived)
        if (window.mascotBuddy) {
            // Ensure element exists before calling exit
            if (window.mascotBuddy.element) {
                window.mascotBuddy.exitWarpMode(true);
            } else {
                // Retry in a moment if mascot scripts loaded but element not created
                setTimeout(() => {
                    if (window.mascotBuddy.element) window.mascotBuddy.exitWarpMode(true);
                }, 50);
            }
        }

        // 2. Fade out overlay
        // Wait for the "slow down" animation (warpArrive) to play out a bit
        setTimeout(() => {
            overlay.classList.remove('active', 'arrival');
            document.body.classList.remove('warping');
        }, 1200); // Increased from 100ms to allow 1s animation to show
    }

    getOverlay() {
        let overlay = document.getElementById('warp-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'warp-overlay';
            overlay.className = 'warp-overlay';
            overlay.innerHTML = `
                <div class="warp-stars"></div>
                <div class="warp-stars-2"></div>
                <div class="warp-stars-3"></div>
                <div class="warp-flash"></div>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }
}

// Initialize
const pageTransitions = new PageTransitionManager();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pageTransitions.init());
} else {
    pageTransitions.init();
}
