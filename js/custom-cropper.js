/**
 * Custom Cropper - カスタム切り抜きツール
 * Cropper.jsライブラリを使わない、シンプルなカスタム実装
 */

class CustomCropper {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.cropArea = { x: 0, y: 0, width: 100, height: 100 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragTarget = null; // 'move', 'nw', 'ne', 'sw', 'se'
        this.rotation = 0;
        this.scale = 1;
        this.aspectRatio = null; // null = free
        this.onComplete = null;

        this.init();
    }

    init() {
        this.createModal();
        console.log('[CustomCropper] Initialized');
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'custom-cropper-modal';
        this.modal.style.display = 'none';

        this.modal.innerHTML = `
            <div class="custom-cropper-overlay"></div>
            <div class="custom-cropper-content">
                <div class="custom-cropper-header">
                    <h2>切り抜き（カスタム版）</h2>
                    <button class="custom-cropper-close">×</button>
                </div>

                <div class="custom-cropper-body">
                    <div class="custom-cropper-sidebar">
                        <div class="custom-cropper-section">
                            <h3>縦横比</h3>
                            <div class="custom-aspect-buttons">
                                <button class="custom-aspect-btn active" data-ratio="free">自由</button>
                                <button class="custom-aspect-btn" data-ratio="1">1:1</button>
                                <button class="custom-aspect-btn" data-ratio="1.7777">16:9</button>
                                <button class="custom-aspect-btn" data-ratio="0.6666">2:3</button>
                            </div>
                        </div>

                        <div class="custom-cropper-section">
                            <h3>回転</h3>
                            <div class="custom-rotation-controls">
                                <input type="range" id="custom-rotation" min="0" max="360" value="0">
                                <span id="custom-rotation-value">0°</span>
                            </div>
                            <div class="custom-rotation-buttons">
                                <button class="custom-rotate-btn" data-angle="-90">← 90°</button>
                                <button class="custom-rotate-btn" data-angle="90">90° →</button>
                                <button class="custom-rotate-btn" data-angle="0">リセット</button>
                            </div>
                        </div>

                        <div class="custom-cropper-section">
                            <h3>サイズ</h3>
                            <div class="custom-size-controls">
                                <label>幅: <span id="custom-width">0</span>px</label>
                                <label>高さ: <span id="custom-height">0</span>px</label>
                            </div>
                        </div>
                    </div>

                    <div class="custom-cropper-main">
                        <canvas id="custom-crop-canvas"></canvas>
                    </div>
                </div>

                <div class="custom-cropper-footer">
                    <button class="custom-btn custom-btn-secondary" id="custom-cancel">キャンセル</button>
                    <button class="custom-btn custom-btn-primary" id="custom-apply">完了</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.canvas = this.modal.querySelector('#custom-crop-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.attachEventListeners();
        this.addStyles();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .custom-cropper-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .custom-cropper-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 1;
            }

            .custom-cropper-content {
                position: relative;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                width: 90vw;
                max-width: 1200px;
                height: 85vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 25px 70px rgba(102, 126, 234, 0.4);
                z-index: 2;
                padding: 3px;
            }

            .custom-cropper-header {
                background: #fff;
                padding: 20px 24px;
                border-radius: 14px 14px 0 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .custom-cropper-header h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .custom-cropper-close {
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
                border-radius: 50%;
                transition: all 0.2s;
            }

            .custom-cropper-close:hover {
                background: #f0f0f0;
                color: #667eea;
                transform: rotate(90deg);
            }

            .custom-cropper-body {
                flex: 1;
                display: flex;
                overflow: hidden;
                background: #fff;
            }

            .custom-cropper-sidebar {
                width: 250px;
                padding: 20px;
                background: #f8f9fa;
                border-right: 2px solid #e9ecef;
                overflow-y: auto;
            }

            .custom-cropper-section {
                margin-bottom: 24px;
            }

            .custom-cropper-section h3 {
                font-size: 13px;
                font-weight: 700;
                color: #667eea;
                margin: 0 0 12px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .custom-aspect-buttons {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }

            .custom-aspect-btn {
                padding: 10px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                background: #fff;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                color: #495057;
                transition: all 0.2s;
            }

            .custom-aspect-btn:hover {
                border-color: #667eea;
                color: #667eea;
                transform: translateY(-2px);
            }

            .custom-aspect-btn.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-color: #667eea;
                color: #fff;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .custom-rotation-controls {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }

            #custom-rotation {
                flex: 1;
                height: 4px;
                border-radius: 2px;
                background: #e9ecef;
                outline: none;
                -webkit-appearance: none;
            }

            #custom-rotation::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
            }

            #custom-rotation-value {
                font-size: 14px;
                font-weight: 700;
                color: #667eea;
                min-width: 45px;
            }

            .custom-rotation-buttons {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
            }

            .custom-rotate-btn {
                padding: 8px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                background: #fff;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }

            .custom-rotate-btn:hover {
                border-color: #667eea;
                color: #667eea;
                background: #f8f9fa;
            }

            .custom-size-controls {
                display: flex;
                flex-direction: column;
                gap: 8px;
                font-size: 13px;
                color: #495057;
            }

            .custom-size-controls label {
                display: flex;
                justify-content: space-between;
                padding: 8px 12px;
                background: #fff;
                border-radius: 6px;
                border: 1px solid #e9ecef;
            }

            .custom-size-controls span {
                font-weight: 700;
                color: #667eea;
            }

            .custom-cropper-main {
                flex: 1;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f8f9fa;
                position: relative;
            }

            #custom-crop-canvas {
                max-width: 100%;
                max-height: 100%;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                cursor: move;
            }

            .custom-cropper-footer {
                background: #fff;
                padding: 20px 24px;
                border-radius: 0 0 14px 14px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .custom-btn {
                padding: 12px 28px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .custom-btn-secondary {
                background: #e9ecef;
                color: #495057;
            }

            .custom-btn-secondary:hover {
                background: #dee2e6;
            }

            .custom-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #fff;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .custom-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            @media (max-width: 768px) {
                .custom-cropper-content {
                    width: 100vw;
                    height: 100vh;
                    border-radius: 0;
                }

                .custom-cropper-body {
                    flex-direction: column;
                }

                .custom-cropper-sidebar {
                    width: 100%;
                    max-height: 35vh;
                    border-right: none;
                    border-bottom: 2px solid #e9ecef;
                }
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Close buttons
        this.modal.querySelector('.custom-cropper-close').addEventListener('click', () => this.close());
        this.modal.querySelector('#custom-cancel').addEventListener('click', () => this.close());
        this.modal.querySelector('#custom-apply').addEventListener('click', () => this.applyCrop());

        // Aspect ratio buttons
        this.modal.querySelectorAll('.custom-aspect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.modal.querySelectorAll('.custom-aspect-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                const ratio = e.currentTarget.dataset.ratio;
                this.aspectRatio = ratio === 'free' ? null : parseFloat(ratio);
                this.enforceCropAspectRatio();
                this.render();
            });
        });

        // Rotation controls
        const rotationSlider = this.modal.querySelector('#custom-rotation');
        rotationSlider.addEventListener('input', (e) => {
            this.rotation = parseInt(e.target.value);
            this.modal.querySelector('#custom-rotation-value').textContent = this.rotation + '°';
            this.render();
        });

        this.modal.querySelectorAll('.custom-rotate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const angle = parseInt(e.currentTarget.dataset.angle);
                if (angle === 0) {
                    this.rotation = 0;
                } else {
                    this.rotation = (this.rotation + angle) % 360;
                    if (this.rotation < 0) this.rotation += 360;
                }
                rotationSlider.value = this.rotation;
                this.modal.querySelector('#custom-rotation-value').textContent = this.rotation + '°';
                this.render();
            });
        });

        // Canvas mouse events for dragging crop area
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());

        // Close on overlay
        this.modal.querySelector('.custom-cropper-overlay').addEventListener('click', () => this.close());
    }

    open(imageSrc, onComplete) {
        this.onComplete = onComplete;

        const img = new Image();
        img.onload = () => {
            this.image = img;
            this.canvas.width = 800;
            this.canvas.height = 600;

            // Initialize crop area to center
            const imgAspect = img.width / img.height;
            if (imgAspect > this.canvas.width / this.canvas.height) {
                this.scale = this.canvas.height / img.height;
            } else {
                this.scale = this.canvas.width / img.width;
            }

            const scaledWidth = img.width * this.scale;
            const scaledHeight = img.height * this.scale;

            this.cropArea = {
                x: (this.canvas.width - scaledWidth * 0.8) / 2,
                y: (this.canvas.height - scaledHeight * 0.8) / 2,
                width: scaledWidth * 0.8,
                height: scaledHeight * 0.8
            };

            this.modal.style.display = 'flex';
            this.render();
        };
        img.src = imageSrc;
    }

    close() {
        this.modal.style.display = 'none';
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw rotated image
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate((this.rotation * Math.PI) / 180);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(
            this.image,
            -this.image.width / 2,
            -this.image.height / 2
        );
        this.ctx.restore();

        // Draw dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Clear crop area
        this.ctx.clearRect(this.cropArea.x, this.cropArea.y, this.cropArea.width, this.cropArea.height);

        // Redraw image in crop area
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(this.cropArea.x, this.cropArea.y, this.cropArea.width, this.cropArea.height);
        this.ctx.clip();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate((this.rotation * Math.PI) / 180);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(
            this.image,
            -this.image.width / 2,
            -this.image.height / 2
        );
        this.ctx.restore();

        // Draw crop border
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(this.cropArea.x, this.cropArea.y, this.cropArea.width, this.cropArea.height);

        // Draw corners
        const cornerSize = 12;
        this.ctx.fillStyle = '#667eea';
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([rx, ry]) => {
            const x = this.cropArea.x + rx * this.cropArea.width - (rx ? cornerSize : 0);
            const y = this.cropArea.y + ry * this.cropArea.height - (ry ? cornerSize : 0);
            this.ctx.fillRect(x, y, cornerSize, cornerSize);
        });

        // Update size display
        this.modal.querySelector('#custom-width').textContent = Math.round(this.cropArea.width);
        this.modal.querySelector('#custom-height').textContent = Math.round(this.cropArea.height);
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking on corners or inside crop area
        const cornerSize = 12;
        const corners = [
            ['nw', this.cropArea.x, this.cropArea.y],
            ['ne', this.cropArea.x + this.cropArea.width - cornerSize, this.cropArea.y],
            ['sw', this.cropArea.x, this.cropArea.y + this.cropArea.height - cornerSize],
            ['se', this.cropArea.x + this.cropArea.width - cornerSize, this.cropArea.y + this.cropArea.height - cornerSize]
        ];

        for (const [name, cx, cy] of corners) {
            if (x >= cx && x <= cx + cornerSize && y >= cy && y <= cy + cornerSize) {
                this.isDragging = true;
                this.dragTarget = name;
                this.dragStart = { x, y };
                return;
            }
        }

        // Check if inside crop area
        if (x >= this.cropArea.x && x <= this.cropArea.x + this.cropArea.width &&
            y >= this.cropArea.y && y <= this.cropArea.y + this.cropArea.height) {
            this.isDragging = true;
            this.dragTarget = 'move';
            this.dragStart = { x, y };
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;

        if (this.dragTarget === 'move') {
            this.cropArea.x += dx;
            this.cropArea.y += dy;
        } else if (this.dragTarget.includes('e')) {
            this.cropArea.width += dx;
            if (this.aspectRatio) {
                this.cropArea.height = this.cropArea.width / this.aspectRatio;
            }
        } else if (this.dragTarget.includes('w')) {
            this.cropArea.x += dx;
            this.cropArea.width -= dx;
            if (this.aspectRatio) {
                this.cropArea.height = this.cropArea.width / this.aspectRatio;
            }
        }

        if (this.dragTarget.includes('s')) {
            this.cropArea.height += dy;
            if (this.aspectRatio) {
                this.cropArea.width = this.cropArea.height * this.aspectRatio;
            }
        } else if (this.dragTarget.includes('n')) {
            this.cropArea.y += dy;
            this.cropArea.height -= dy;
            if (this.aspectRatio) {
                this.cropArea.width = this.cropArea.height * this.aspectRatio;
            }
        }

        this.dragStart = { x, y };
        this.render();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.dragTarget = null;
    }

    enforceCropAspectRatio() {
        if (this.aspectRatio) {
            this.cropArea.height = this.cropArea.width / this.aspectRatio;
        }
    }

    applyCrop() {
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = this.cropArea.width;
        outputCanvas.height = this.cropArea.height;
        const outputCtx = outputCanvas.getContext('2d');

        outputCtx.save();
        outputCtx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
        outputCtx.rotate((this.rotation * Math.PI) / 180);

        const scaledWidth = this.image.width * this.scale;
        const scaledHeight = this.image.height * this.scale;
        const offsetX = (this.canvas.width / 2 - this.cropArea.x - this.cropArea.width / 2) / this.scale;
        const offsetY = (this.canvas.height / 2 - this.cropArea.y - this.cropArea.height / 2) / this.scale;

        outputCtx.drawImage(
            this.image,
            offsetX - this.image.width / 2,
            offsetY - this.image.height / 2
        );
        outputCtx.restore();

        if (this.onComplete) {
            const dataUrl = outputCanvas.toDataURL('image/png');
            this.onComplete(dataUrl, outputCanvas);
        }

        this.close();
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    window.customCropper = new CustomCropper();
    console.log('[CustomCropper] Ready');

    // Add button to test custom cropper
    const cropPanel = document.getElementById('cropping-panel');
    if (cropPanel) {
        const testBtn = document.createElement('button');
        testBtn.id = 'open-custom-cropper-btn';
        testBtn.textContent = 'カスタム切り抜き（テスト版）';
        testBtn.style.cssText = 'width: 100%; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); margin-bottom: 1rem;';

        testBtn.addEventListener('click', () => {
            if (window.imageEditor && window.imageEditor.canvas) {
                const imageDataUrl = window.imageEditor.canvas.toDataURL('image/png');
                window.customCropper.open(imageDataUrl, (croppedDataUrl) => {
                    const img = new Image();
                    img.onload = () => {
                        if (window.imageEditor) {
                            window.imageEditor.loadImage(img);
                            if (window.toastManager) {
                                window.toastManager.success('カスタム切り抜き完了！', '成功');
                            }
                        }
                    };
                    img.src = croppedDataUrl;
                });
            } else {
                alert('まず画像をアップロードしてください');
            }
        });

        const toolPanelContent = cropPanel.querySelector('.tool-panel-content');
        if (toolPanelContent) {
            toolPanelContent.insertBefore(testBtn, toolPanelContent.firstChild);
        }
    }
});
