/**
 * Page Transitions Manager
 * Handles transitions between pages using the loading screen with stars and progress bar
 */

class PageTransitionManager {
    constructor() {
        this.isAnimating = false;
        this.warpDuration = 1000; // ms to wait before navigating
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

        // 1. Create the transition overlay (loading screen style)
        const overlay = this.createTransitionOverlay();

        // 2. Summon Mascot to left side
        if (window.mascotBuddy) {
            window.mascotBuddy.enterWarpMode();
        }

        // 3. Animate the progress bar
        this.animateProgress(overlay);

        // 4. Wait for animation, then navigate
        setTimeout(() => {
            // Save state that we are transitioning
            sessionStorage.setItem('isWarping', 'true');
            window.location.href = url;
        }, this.warpDuration);
    }

    createTransitionOverlay() {
        // Remove existing if present
        const existing = document.getElementById('transition-overlay');
        if (existing) existing.remove();

        // Generate random stars - fewer on mobile for performance
        const isMobile = window.innerWidth <= 480;
        const starCount = isMobile ? 40 : 100;
        let starsHTML = '';
        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const size = 1 + Math.random() * 2;
            const duration = 2 + Math.random() * 3;
            const delay = Math.random() * 4;
            starsHTML += `<div class="random-star" style="
                left: ${x}%;
                top: ${y}%;
                width: ${size}px;
                height: ${size}px;
                animation-duration: ${duration}s;
                animation-delay: -${delay}s;
            "></div>`;
        }

        const overlay = document.createElement('div');
        overlay.id = 'transition-overlay';
        overlay.className = 'loading-screen';
        overlay.innerHTML = `
            <!-- Random Stars -->
            <div class="stars-container">${starsHTML}</div>
            
            <div class="loading-content">
                <div class="loading-title">Warping...</div>
                <div class="loading-bar-container">
                    <div class="loading-bar-track">
                        <div class="loading-bar-fill" id="transition-bar-fill"></div>
                    </div>
                    <div class="loading-mascot" id="transition-mascot">
                        <div class="loading-mascot-body">
                            <div class="loading-mascot-antenna">
                                <div class="loading-antenna-ball"></div>
                            </div>
                            <div class="loading-mascot-head">
                                <div class="loading-mascot-eye left"></div>
                                <div class="loading-mascot-eye right"></div>
                                <div class="loading-mascot-mouth"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="loading-message">Hold on tight!</div>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    animateProgress(overlay) {
        const barFill = overlay.querySelector('#transition-bar-fill');
        const mascot = overlay.querySelector('#transition-mascot');

        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            if (progress > 95) {
                clearInterval(interval);
                progress = 95;
            }

            if (barFill) barFill.style.width = `${progress}%`;
            if (mascot) mascot.style.left = `calc(${progress}% - 20px)`;
        }, 50);
    }

    checkArrival() {
        // Check if we arrived via warp
        const isWarping = sessionStorage.getItem('isWarping');

        if (isWarping) {
            console.log('✨ Arrived from warp!');
            // The loading-screen.js handles the arrival if we came from a warp
            // Just clear the flag
            sessionStorage.removeItem('isWarping');

            // Exit mascot from warp mode after page loads
            if (window.mascotBuddy && window.mascotBuddy.element) {
                window.mascotBuddy.exitWarpMode(true);
            } else {
                // Wait for mascot to initialize
                const checkMascot = setInterval(() => {
                    if (window.mascotBuddy && window.mascotBuddy.element) {
                        window.mascotBuddy.exitWarpMode(true);
                        clearInterval(checkMascot);
                    }
                }, 100);

                // Clean up after 3 seconds if mascot never loads
                setTimeout(() => clearInterval(checkMascot), 3000);
            }
        }
    }
}

// Initialize
const pageTransitions = new PageTransitionManager();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pageTransitions.init());
} else {
    pageTransitions.init();
}
