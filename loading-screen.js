/**
 * GKS Loading Screen
 * Shows a progress bar with the mascot zooping along while the page loads
 */

class LoadingScreen {
    constructor() {
        this.progress = 0;
        this.messages = [
            "Warming up the servers...",
            "Calibrating widgets...",
            "Fetching container status...",
            "Brewing some data...",
            "Polishing the dashboard...",
            "Almost there..."
        ];
        this.currentMessageIndex = 0;
        this.messageInterval = null;
        this.isComplete = false;
    }

    init() {
        // Don't show loading screen if we're arriving from a warp transition
        if (sessionStorage.getItem('isWarping')) {
            return;
        }

        this.createLoadingScreen();
        this.startMessageRotation();
        this.trackProgress();
    }

    createLoadingScreen() {
        // Generate random stars
        const starCount = 100;
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

        const html = `
            <div class="loading-screen" id="loading-screen">
                <!-- Random Stars -->
                <div class="stars-container">${starsHTML}</div>
                
                <div class="loading-content">
                    <div class="loading-title">GKS Home</div>
                    <div class="loading-bar-container">
                        <div class="loading-bar-track">
                            <div class="loading-bar-fill" id="loading-bar-fill"></div>
                        </div>
                        <div class="loading-mascot" id="loading-mascot">
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
                    <div class="loading-message" id="loading-message">${this.messages[0]}</div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', html);

        this.element = document.getElementById('loading-screen');
        this.barFill = document.getElementById('loading-bar-fill');
        this.mascot = document.getElementById('loading-mascot');
        this.messageEl = document.getElementById('loading-message');
    }

    startMessageRotation() {
        this.messageInterval = setInterval(() => {
            this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
            if (this.messageEl) {
                this.messageEl.style.opacity = '0';
                setTimeout(() => {
                    this.messageEl.textContent = this.messages[this.currentMessageIndex];
                    this.messageEl.style.opacity = '1';
                }, 200);
            }
        }, 2000);
    }

    trackProgress() {
        // Simulate progress based on page load events
        let baseProgress = 0;

        // DOM Content Loaded = 30%
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setProgress(30);
            });
        } else {
            baseProgress = 30;
        }

        // Window Load = 60%
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                this.setProgress(60);
            });
        } else {
            baseProgress = 60;
        }

        // Set initial progress
        this.setProgress(baseProgress);

        // Simulate remaining progress over time
        const simulateProgress = () => {
            if (this.isComplete) return;

            if (this.progress < 90) {
                this.setProgress(this.progress + Math.random() * 5);
                setTimeout(simulateProgress, 200 + Math.random() * 300);
            }
        };

        setTimeout(simulateProgress, 500);

        // Complete when everything is ready
        setTimeout(() => {
            this.complete();
        }, 2000); // Minimum 2 seconds to appreciate the animation
    }

    setProgress(value) {
        this.progress = Math.min(100, Math.max(0, value));

        if (this.barFill) {
            this.barFill.style.width = `${this.progress}%`;
        }

        if (this.mascot) {
            // Position mascot along the bar (accounting for mascot width)
            const mascotOffset = (this.progress / 100) * 100;
            this.mascot.style.left = `calc(${mascotOffset}% - 20px)`;
        }
    }

    complete() {
        if (this.isComplete) return;
        this.isComplete = true;

        clearInterval(this.messageInterval);

        // Complete the bar
        this.setProgress(100);

        if (this.messageEl) {
            this.messageEl.textContent = "Ready!";
        }

        // Fade out after a moment
        setTimeout(() => {
            if (this.element) {
                this.element.classList.add('fade-out');

                setTimeout(() => {
                    this.element.remove();
                }, 500);
            }
        }, 400);
    }
}

// Initialize loading screen immediately
const loadingScreen = new LoadingScreen();
loadingScreen.init();
