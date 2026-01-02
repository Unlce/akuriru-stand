/**
 * Cropper.js Integration - Completely Rewritten
 * Fixed all modal blocking issues
 */

class ProfessionalCropper {
    constructor() {
        this.cropper = null;
        this.modal = null;
        this.onComplete = null;
        this.currentRotation = 0;

        this.init();
    }

    init() {
        this.createModal();
        this.addStyles();
        this.attachEventListeners();
        console.log('[ProfessionalCropper] Initialized');
    }

    createModal() {
        // Remove any existing modal
        const existing = document.getElementById('pro-cropper-modal');
        if (existing) existing.remove();

        this.modal = document.createElement('div');
        this.modal.id = 'pro-cropper-modal';
        this.modal.className = 'pro-cropper-modal';
        this.modal.style.display = 'none';

        this.modal.innerHTML = `
            <div class="pro-cropper-backdrop"></div>
            <div class="pro-cropper-container">
                <div class="pro-cropper-header">
                    <h2>✂️ プロ仕様切り抜きツール</h2>
                    <button class="pro-close-btn" type="button">✕</button>
                </div>

                <div class="pro-cropper-body">
                    <div class="pro-sidebar">
                        <div class="pro-section">
                            <h3>📐 縦横比</h3>
                            <div class="pro-ratio-grid">
                                <button class="pro-ratio-btn active" data-ratio="free" type="button">
                                    <span class="icon">⬛</span>
                                    <span>自由</span>
                                </button>
                                <button class="pro-ratio-btn" data-ratio="1" type="button">
                                    <span class="icon">◼️</span>
                                    <span>1:1</span>
                                </button>
                                <button class="pro-ratio-btn" data-ratio="1.7777" type="button">
                                    <span class="icon">▬</span>
                                    <span>16:9</span>
                                </button>
                                <button class="pro-ratio-btn" data-ratio="0.75" type="button">
                                    <span class="icon">▯</span>
                                    <span>3:4</span>
                                </button>
                            </div>
                        </div>

                        <div class="pro-section">
                            <h3>🔄 回転</h3>
                            <div class="pro-rotation">
                                <label>
                                    <span class="pro-label">角度:</span>
                                    <span class="pro-value" id="pro-rotation-display">0°</span>
                                </label>
                                <input type="range" id="pro-rotation-slider" min="-180" max="180" value="0" step="1">
                                <div class="pro-rotation-btns">
                                    <button class="pro-rot-btn" data-angle="-90" type="button">⟲ -90°</button>
                                    <button class="pro-rot-btn" data-angle="90" type="button">⟳ +90°</button>
                                </div>
                            </div>
                        </div>

                        <div class="pro-section">
                            <h3>🔍 ズーム</h3>
                            <div class="pro-zoom">
                                <button class="pro-zoom-btn" data-action="out" type="button">−</button>
                                <button class="pro-zoom-btn" data-action="in" type="button">+</button>
                                <button class="pro-zoom-btn" data-action="reset" type="button">リセット</button>
                            </div>
                        </div>
                    </div>

                    <div class="pro-main">
                        <div class="pro-canvas-wrapper">
                            <img id="pro-crop-image" alt="Crop image">
                        </div>
                    </div>
                </div>

                <div class="pro-cropper-footer">
                    <button class="pro-btn pro-btn-cancel" type="button">キャンセル</button>
                    <button class="pro-btn pro-btn-apply" type="button">✓ 完了</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
    }

    addStyles() {
        if (document.getElementById('pro-cropper-styles')) return;

        const style = document.createElement('style');
        style.id = 'pro-cropper-styles';
        style.textContent = `
            .pro-cropper-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            .pro-cropper-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                z-index: 10;
            }

            .pro-cropper-container {
                position: relative;
                width: 95vw;
                max-width: 1400px;
                height: 90vh;
                background: #fff;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
                z-index: 20;
                pointer-events: all;
            }

            .pro-cropper-header {
                padding: 20px 28px;
                border-bottom: 2px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px 16px 0 0;
            }

            .pro-cropper-header h2 {
                margin: 0;
                font-size: 22px;
                font-weight: 700;
                color: #fff;
            }

            .pro-close-btn {
                width: 40px;
                height: 40px;
                border: none;
                background: rgba(255, 255, 255, 0.2);
                color: #fff;
                font-size: 24px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pro-close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }

            .pro-cropper-body {
                flex: 1;
                display: flex;
                overflow: hidden;
                min-height: 0;
            }

            .pro-sidebar {
                width: 280px;
                padding: 24px;
                background: #f8f9fa;
                border-right: 2px solid #e0e0e0;
                overflow-y: auto;
            }

            .pro-section {
                margin-bottom: 28px;
            }

            .pro-section h3 {
                margin: 0 0 16px 0;
                font-size: 14px;
                font-weight: 700;
                color: #667eea;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .pro-ratio-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }

            .pro-ratio-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 14px 8px;
                border: 2px solid #ddd;
                border-radius: 10px;
                background: #fff;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                font-weight: 600;
                color: #555;
            }

            .pro-ratio-btn .icon {
                font-size: 20px;
            }

            .pro-ratio-btn:hover {
                border-color: #667eea;
                background: #f5f3ff;
                transform: translateY(-2px);
            }

            .pro-ratio-btn.active {
                border-color: #667eea;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #fff;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .pro-rotation, .pro-zoom {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .pro-rotation label {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                color: #555;
            }

            .pro-value {
                font-weight: 700;
                color: #667eea;
            }

            #pro-rotation-slider {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #ddd;
                outline: none;
                -webkit-appearance: none;
            }

            #pro-rotation-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            }

            .pro-rotation-btns, .pro-zoom {
                display: flex;
                gap: 8px;
            }

            .pro-rot-btn, .pro-zoom-btn {
                flex: 1;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 8px;
                background: #fff;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.2s;
                color: #555;
            }

            .pro-rot-btn:hover, .pro-zoom-btn:hover {
                border-color: #667eea;
                background: #f5f3ff;
                color: #667eea;
            }

            .pro-main {
                flex: 1;
                padding: 24px;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 0;
            }

            .pro-canvas-wrapper {
                max-width: 100%;
                max-height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #pro-crop-image {
                max-width: 100%;
                max-height: 100%;
                display: block;
            }

            .pro-cropper-footer {
                padding: 20px 28px;
                border-top: 2px solid #e0e0e0;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                background: #fff;
                border-radius: 0 0 16px 16px;
            }

            .pro-btn {
                padding: 12px 32px;
                border: none;
                border-radius: 10px;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
            }

            .pro-btn-cancel {
                background: #e0e0e0;
                color: #555;
            }

            .pro-btn-cancel:hover {
                background: #ccc;
            }

            .pro-btn-apply {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #fff;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .pro-btn-apply:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            @media (max-width: 768px) {
                .pro-cropper-container {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                }

                .pro-cropper-body {
                    flex-direction: column;
                }

                .pro-sidebar {
                    width: 100%;
                    max-height: 35vh;
                    border-right: none;
                    border-bottom: 2px solid #e0e0e0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Close button
        this.modal.querySelector('.pro-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Cancel button
        this.modal.querySelector('.pro-btn-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        // Apply button
        this.modal.querySelector('.pro-btn-apply').addEventListener('click', (e) => {
            e.stopPropagation();
            this.apply();
        });

        // Aspect ratio buttons
        this.modal.querySelectorAll('.pro-ratio-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setAspectRatio(btn);
            });
        });

        // Rotation slider
        const rotationSlider = this.modal.querySelector('#pro-rotation-slider');
        rotationSlider.addEventListener('input', (e) => {
            e.stopPropagation();
            const angle = parseInt(e.target.value);
            this.setRotation(angle);
        });

        // Rotation buttons
        this.modal.querySelectorAll('.pro-rot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const angle = parseInt(btn.dataset.angle);
                this.rotate(angle);
            });
        });

        // Zoom buttons
        this.modal.querySelectorAll('.pro-zoom-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.zoom(action);
            });
        });

        // Backdrop click to close
        this.modal.querySelector('.pro-cropper-backdrop').addEventListener('click', () => {
            this.close();
        });

        // Prevent propagation on container
        this.modal.querySelector('.pro-cropper-container').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    open(imageSrc, onComplete) {
        this.onComplete = onComplete;
        this.currentRotation = 0;

        const img = this.modal.querySelector('#pro-crop-image');
        img.src = imageSrc;

        this.modal.style.display = 'flex';

        // Destroy existing cropper
        if (this.cropper) {
            this.cropper.destroy();
        }

        // Initialize new cropper
        img.onload = () => {
            this.cropper = new Cropper(img, {
                aspectRatio: NaN,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                ready: () => {
                    console.log('[ProfessionalCropper] Ready');
                }
            });
        };
    }

    close() {
        this.modal.style.display = 'none';
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
    }

    setAspectRatio(btn) {
        this.modal.querySelectorAll('.pro-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const ratio = btn.dataset.ratio;
        if (ratio === 'free') {
            this.cropper.setAspectRatio(NaN);
        } else {
            this.cropper.setAspectRatio(parseFloat(ratio));
        }
    }

    setRotation(angle) {
        this.currentRotation = angle;
        this.modal.querySelector('#pro-rotation-display').textContent = angle + '°';
        if (this.cropper) {
            this.cropper.rotateTo(angle);
        }
    }

    rotate(angle) {
        this.currentRotation += angle;
        const slider = this.modal.querySelector('#pro-rotation-slider');
        slider.value = this.currentRotation;
        this.setRotation(this.currentRotation);
    }

    zoom(action) {
        if (!this.cropper) return;

        if (action === 'in') {
            this.cropper.zoom(0.1);
        } else if (action === 'out') {
            this.cropper.zoom(-0.1);
        } else if (action === 'reset') {
            this.cropper.reset();
        }
    }

    apply() {
        if (!this.cropper) return;

        const canvas = this.cropper.getCroppedCanvas({
            maxWidth: 4096,
            maxHeight: 4096,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        canvas.toBlob((blob) => {
            const file = new File([blob], 'cropped.png', { type: 'image/png' });
            if (this.onComplete) {
                this.onComplete(file);
            }
            this.close();
        }, 'image/png', 0.95);
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    window.professionalCropper = new ProfessionalCropper();
    console.log('[ProfessionalCropper] Loaded');
});
