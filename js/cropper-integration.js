/**
 * Cropper.js Integration - Canva-style Image Cropping
 * Provides professional image cropping with aspect ratio presets and rotation
 */

class CanvaCropper {
    constructor() {
        this.cropper = null;
        this.currentImage = null;
        this.modal = null;
        this.onComplete = null;
        this.currentAspectRatio = NaN; // NaN = free aspect
        this.currentRotation = 0;

        this.init();
    }

    init() {
        this.createModal();
        console.log('[CanvaCropper] Initialized');
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'cropper-modal';
        this.modal.style.display = 'none';

        this.modal.innerHTML = `
            <div class="cropper-modal-overlay"></div>
            <div class="cropper-modal-content">
                <div class="cropper-header">
                    <h2>切り抜き</h2>
                    <button class="cropper-close-btn">×</button>
                </div>

                <div class="cropper-body">
                    <div class="cropper-sidebar">
                        <!-- Aspect Ratio Section -->
                        <div class="cropper-section">
                            <h3>縦横比</h3>
                            <div class="aspect-ratio-buttons">
                                <button class="aspect-btn active" data-ratio="free">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <rect x="4" y="4" width="16" height="16" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
                                    </svg>
                                    <span>カスタム</span>
                                </button>
                                <button class="aspect-btn" data-ratio="1">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span>1:1</span>
                                </button>
                                <button class="aspect-btn" data-ratio="1.7777">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <rect x="3" y="7" width="18" height="10" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span>16:9</span>
                                </button>
                                <button class="aspect-btn" data-ratio="0.6666">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <rect x="8" y="3" width="8" height="18" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span>2:3</span>
                                </button>
                                <button class="aspect-btn" data-ratio="original">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span>オリジナル</span>
                                </button>
                            </div>
                        </div>

                        <!-- Rotation Section -->
                        <div class="cropper-section">
                            <h3>回転</h3>
                            <div class="rotation-controls">
                                <div class="rotation-slider-container">
                                    <label for="rotation-slider">
                                        <span id="rotation-value">0</span>°
                                    </label>
                                    <input type="range" id="rotation-slider" min="-180" max="180" value="0" step="1">
                                </div>
                                <div class="rotation-buttons">
                                    <button class="rotation-btn" data-angle="-90" title="左に90°回転">
                                        ↶ -90°
                                    </button>
                                    <button class="rotation-btn" data-angle="90" title="右に90°回転">
                                        ↷ +90°
                                    </button>
                                    <button class="rotation-btn" data-angle="reset" title="リセット">
                                        リセット
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Zoom Section -->
                        <div class="cropper-section">
                            <h3>ズーム</h3>
                            <div class="zoom-controls">
                                <button class="zoom-btn" data-action="zoom-out">−</button>
                                <input type="range" id="zoom-slider" min="0" max="1" value="0" step="0.01">
                                <button class="zoom-btn" data-action="zoom-in">+</button>
                            </div>
                        </div>
                    </div>

                    <div class="cropper-main">
                        <div class="cropper-container-wrapper">
                            <img id="cropper-image" src="" alt="Crop">
                        </div>
                    </div>
                </div>

                <div class="cropper-footer">
                    <button class="cropper-btn cropper-btn-secondary" id="cropper-cancel">キャンセル</button>
                    <button class="cropper-btn cropper-btn-primary" id="cropper-apply">完了</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.attachEventListeners();
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cropper-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .cropper-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
            }

            .cropper-modal-content {
                position: relative;
                background: #fff;
                border-radius: 12px;
                width: 90vw;
                max-width: 1200px;
                height: 85vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }

            .cropper-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .cropper-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #333;
            }

            .cropper-close-btn {
                background: none;
                border: none;
                font-size: 32px;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .cropper-close-btn:hover {
                background: #f0f0f0;
                color: #333;
            }

            .cropper-body {
                flex: 1;
                display: flex;
                overflow: hidden;
            }

            .cropper-sidebar {
                width: 280px;
                padding: 20px;
                border-right: 1px solid #e0e0e0;
                overflow-y: auto;
                background: #fafafa;
            }

            .cropper-section {
                margin-bottom: 24px;
            }

            .cropper-section h3 {
                font-size: 14px;
                font-weight: 600;
                color: #666;
                margin: 0 0 12px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .aspect-ratio-buttons {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }

            .aspect-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                padding: 12px 8px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                background: #fff;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 12px;
                color: #666;
            }

            .aspect-btn:hover {
                border-color: #a855f7;
                background: #f5f3ff;
            }

            .aspect-btn.active {
                border-color: #a855f7;
                background: #a855f7;
                color: #fff;
            }

            .aspect-btn svg {
                width: 28px;
                height: 28px;
            }

            .rotation-controls, .zoom-controls {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .rotation-slider-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .rotation-slider-container label {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
                color: #666;
            }

            #rotation-value {
                font-weight: 600;
                color: #a855f7;
            }

            #rotation-slider, #zoom-slider {
                width: 100%;
                height: 4px;
                border-radius: 2px;
                background: #e0e0e0;
                outline: none;
                -webkit-appearance: none;
            }

            #rotation-slider::-webkit-slider-thumb,
            #zoom-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #a855f7;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .rotation-buttons {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
            }

            .rotation-btn, .zoom-btn {
                padding: 8px 12px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                color: #666;
            }

            .rotation-btn:hover, .zoom-btn:hover {
                border-color: #a855f7;
                color: #a855f7;
                background: #f5f3ff;
            }

            .zoom-controls {
                flex-direction: row;
                align-items: center;
                gap: 8px;
            }

            .zoom-btn {
                width: 36px;
                height: 36px;
                font-size: 18px;
                font-weight: 600;
                flex-shrink: 0;
            }

            .cropper-main {
                flex: 1;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f5f5;
            }

            .cropper-container-wrapper {
                max-width: 100%;
                max-height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            #cropper-image {
                max-width: 100%;
                max-height: 100%;
                display: block;
            }

            .cropper-footer {
                padding: 20px 24px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .cropper-btn {
                padding: 10px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .cropper-btn-secondary {
                background: #f0f0f0;
                color: #666;
            }

            .cropper-btn-secondary:hover {
                background: #e0e0e0;
            }

            .cropper-btn-primary {
                background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
                color: #fff;
                box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
            }

            .cropper-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4);
            }

            @media (max-width: 768px) {
                .cropper-modal-content {
                    width: 100vw;
                    height: 100vh;
                    border-radius: 0;
                }

                .cropper-body {
                    flex-direction: column;
                }

                .cropper-sidebar {
                    width: 100%;
                    border-right: none;
                    border-bottom: 1px solid #e0e0e0;
                    max-height: 40vh;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Close button
        this.modal.querySelector('.cropper-close-btn').addEventListener('click', () => this.close());
        this.modal.querySelector('#cropper-cancel').addEventListener('click', () => this.close());

        // Apply button
        this.modal.querySelector('#cropper-apply').addEventListener('click', () => this.applyCrop());

        // Aspect ratio buttons
        this.modal.querySelectorAll('.aspect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setAspectRatio(e.currentTarget));
        });

        // Rotation slider
        const rotationSlider = this.modal.querySelector('#rotation-slider');
        rotationSlider.addEventListener('input', (e) => this.updateRotation(e.target.value));

        // Rotation buttons
        this.modal.querySelectorAll('.rotation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const angle = e.currentTarget.dataset.angle;
                if (angle === 'reset') {
                    this.resetRotation();
                } else {
                    this.rotateBy(parseInt(angle));
                }
            });
        });

        // Zoom controls
        this.modal.querySelector('[data-action="zoom-in"]').addEventListener('click', () => {
            if (this.cropper) this.cropper.zoom(0.1);
        });
        this.modal.querySelector('[data-action="zoom-out"]').addEventListener('click', () => {
            if (this.cropper) this.cropper.zoom(-0.1);
        });
        this.modal.querySelector('#zoom-slider').addEventListener('input', (e) => {
            if (this.cropper) {
                const zoomLevel = parseFloat(e.target.value);
                this.cropper.zoomTo(zoomLevel);
            }
        });

        // Close on overlay click
        this.modal.querySelector('.cropper-modal-overlay').addEventListener('click', () => this.close());
    }

    open(imageSrc, onComplete) {
        this.onComplete = onComplete;
        this.currentRotation = 0;

        const img = this.modal.querySelector('#cropper-image');
        img.src = imageSrc;

        this.modal.style.display = 'flex';

        // Initialize Cropper.js
        if (this.cropper) {
            this.cropper.destroy();
        }

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
                    console.log('[CanvaCropper] Cropper initialized');
                }
            });

            this.currentAspectRatio = NaN;

            // Update zoom slider
            const imageData = this.cropper.getImageData();
            const containerData = this.cropper.getContainerData();
            const maxZoom = Math.min(imageData.naturalWidth / containerData.width, imageData.naturalHeight / containerData.height);
            this.modal.querySelector('#zoom-slider').max = maxZoom;
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
        // Remove active class from all buttons
        this.modal.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const ratio = btn.dataset.ratio;

        if (ratio === 'free') {
            this.currentAspectRatio = NaN;
            if (this.cropper) this.cropper.setAspectRatio(NaN);
        } else if (ratio === 'original') {
            const imageData = this.cropper.getImageData();
            this.currentAspectRatio = imageData.naturalWidth / imageData.naturalHeight;
            if (this.cropper) this.cropper.setAspectRatio(this.currentAspectRatio);
        } else {
            this.currentAspectRatio = parseFloat(ratio);
            if (this.cropper) this.cropper.setAspectRatio(this.currentAspectRatio);
        }
    }

    updateRotation(angle) {
        this.currentRotation = parseInt(angle);
        this.modal.querySelector('#rotation-value').textContent = angle;
        if (this.cropper) {
            this.cropper.rotateTo(this.currentRotation);
        }
    }

    rotateBy(angle) {
        this.currentRotation += angle;
        // Normalize to -180 to 180
        while (this.currentRotation > 180) this.currentRotation -= 360;
        while (this.currentRotation < -180) this.currentRotation += 360;

        this.modal.querySelector('#rotation-slider').value = this.currentRotation;
        this.updateRotation(this.currentRotation);
    }

    resetRotation() {
        this.currentRotation = 0;
        this.modal.querySelector('#rotation-slider').value = 0;
        this.updateRotation(0);
    }

    applyCrop() {
        if (!this.cropper) return;

        // Get cropped canvas
        const canvas = this.cropper.getCroppedCanvas({
            maxWidth: 4096,
            maxHeight: 4096,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (this.onComplete) {
            // Convert to blob for better quality
            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    this.onComplete(reader.result, canvas);
                    this.close();
                };
                reader.readAsDataURL(blob);
            }, 'image/png', 0.95);
        }
    }
}

// Initialize global instance
window.addEventListener('DOMContentLoaded', () => {
    window.canvaCropper = new CanvaCropper();
    console.log('[CanvaCropper] Ready');

    // Connect to the button in cropping panel
    const openBtn = document.getElementById('open-canva-cropper-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            console.log('[CanvaCropper] Opening cropper');

            // Get current image from canvas
            if (window.imageEditor && window.imageEditor.canvas) {
                const canvas = window.imageEditor.canvas;
                const imageDataUrl = canvas.toDataURL('image/png');

                window.canvaCropper.open(imageDataUrl, (croppedDataUrl, croppedCanvas) => {
                    console.log('[CanvaCropper] Crop completed');

                    // Create new image from cropped result
                    const img = new Image();
                    img.onload = () => {
                        // Update the editor with the cropped image
                        if (window.imageEditor) {
                            window.imageEditor.loadImage(img);
                            if (window.toastManager) {
                                window.toastManager.success('切り抜きが完了しました！', '成功');
                            }
                        }
                    };
                    img.src = croppedDataUrl;
                });
            } else {
                if (window.toastManager) {
                    window.toastManager.warning('画像をアップロードしてください', '警告');
                } else {
                    alert('まず画像をアップロードしてください');
                }
            }
        });

        // Add hover effect
        openBtn.addEventListener('mouseenter', () => {
            openBtn.style.transform = 'translateY(-2px)';
            openBtn.style.boxShadow = '0 6px 16px rgba(168, 85, 247, 0.4)';
        });
        openBtn.addEventListener('mouseleave', () => {
            openBtn.style.transform = 'translateY(0)';
            openBtn.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.3)';
        });
    }
});
