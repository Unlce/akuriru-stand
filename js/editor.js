// Image Editor for Acrylic Stand Creator

class ImageEditor {
    constructor() {
        this.image = null;
        this.canvas = null;
        this.ctx = null;
        this.rotation = 0;
        this.scale = 1;
        this.baseType = 'default';
        this.init();
    }

    init() {
        this.canvas = document.getElementById('preview-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('file-input');
        const selectFileBtn = document.getElementById('select-file-btn');
        const uploadArea = document.getElementById('upload-area');

        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', () => fileInput.click());
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.loadImage(e.target.files[0]);
                }
            });
        }

        // Drag and drop
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        this.loadImage(file);
                    } else {
                        alert('画像ファイルを選択してください。');
                    }
                }
            });

            // Also allow clicking on upload area
            uploadArea.addEventListener('click', () => {
                if (!this.image) {
                    fileInput.click();
                }
            });
        }

        // Rotation controls
        const rotateLeft = document.getElementById('rotate-left');
        const rotateRight = document.getElementById('rotate-right');

        if (rotateLeft) {
            rotateLeft.addEventListener('click', () => {
                this.rotation -= 90;
                this.render();
            });
        }

        if (rotateRight) {
            rotateRight.addEventListener('click', () => {
                this.rotation += 90;
                this.render();
            });
        }

        // Scale control
        const scaleSlider = document.getElementById('scale-slider');
        const scaleValue = document.getElementById('scale-value');

        if (scaleSlider) {
            scaleSlider.addEventListener('input', (e) => {
                this.scale = e.target.value / 100;
                if (scaleValue) {
                    scaleValue.textContent = e.target.value + '%';
                }
                this.render();
            });
        }

        // Base selection
        const baseOptions = document.querySelectorAll('.base-option');
        baseOptions.forEach(option => {
            option.addEventListener('click', () => {
                baseOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.baseType = option.dataset.base;
                this.updateBasePreview();
            });
        });

        // Reset button
        const resetBtn = document.getElementById('reset-image');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }
    }

    loadImage(file) {
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert('ファイルサイズは10MB以下にしてください。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.rotation = 0;
                this.scale = 1;
                
                // Reset slider
                const scaleSlider = document.getElementById('scale-slider');
                if (scaleSlider) {
                    scaleSlider.value = 100;
                }
                const scaleValue = document.getElementById('scale-value');
                if (scaleValue) {
                    scaleValue.textContent = '100%';
                }

                this.render();
                this.showEditor();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    render() {
        if (!this.image || !this.canvas || !this.ctx) return;

        // Set canvas size
        const maxWidth = 400;
        const maxHeight = 500;
        
        let width = this.image.width;
        let height = this.image.height;

        // Adjust for rotation
        if (Math.abs(this.rotation % 180) === 90) {
            [width, height] = [height, width];
        }

        // Scale to fit
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        width *= scale;
        height *= scale;

        // Apply user scale
        width *= this.scale;
        height *= this.scale;

        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context state
        this.ctx.save();

        // Move to center
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

        // Apply rotation
        this.ctx.rotate((this.rotation * Math.PI) / 180);

        // Draw image centered
        this.ctx.drawImage(
            this.image,
            -width / 2,
            -height / 2,
            width,
            height
        );

        // Restore context state
        this.ctx.restore();
    }

    updateBasePreview() {
        const selectedBase = document.getElementById('selected-base');
        if (selectedBase) {
            selectedBase.className = `base-${this.baseType}`;
        }
    }

    showEditor() {
        const uploadSection = document.querySelector('.upload-section');
        const editorSection = document.getElementById('editor-section');
        
        if (uploadSection) {
            uploadSection.style.display = 'none';
        }
        if (editorSection) {
            editorSection.style.display = 'block';
        }
    }

    reset() {
        this.image = null;
        this.rotation = 0;
        this.scale = 1;
        this.baseType = 'default';

        const uploadSection = document.querySelector('.upload-section');
        const editorSection = document.getElementById('editor-section');
        const fileInput = document.getElementById('file-input');

        if (uploadSection) {
            uploadSection.style.display = 'block';
        }
        if (editorSection) {
            editorSection.style.display = 'none';
        }
        if (fileInput) {
            fileInput.value = '';
        }

        // Reset controls
        const scaleSlider = document.getElementById('scale-slider');
        if (scaleSlider) {
            scaleSlider.value = 100;
        }
        const scaleValue = document.getElementById('scale-value');
        if (scaleValue) {
            scaleValue.textContent = '100%';
        }

        // Reset base selection
        const baseOptions = document.querySelectorAll('.base-option');
        baseOptions.forEach(opt => opt.classList.remove('active'));
        const defaultBase = document.querySelector('.base-option[data-base="default"]');
        if (defaultBase) {
            defaultBase.classList.add('active');
        }

        // Clear canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    getImageData() {
        if (!this.canvas) return null;
        return this.canvas.toDataURL('image/png');
    }

    hasImage() {
        return this.image !== null;
    }

    getBaseType() {
        return this.baseType;
    }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.imageEditor = new ImageEditor();
});
