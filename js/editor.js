// Image Editor for Acrylic Stand Creator

// Configuration constants
const EDITOR_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    MAX_CANVAS_WIDTH: 400,
    MAX_CANVAS_HEIGHT: 500
};

class ImageEditor {
    constructor() {
        this.image = null;
        this.canvas = null;
        this.ctx = null;
        this.rotation = 0;
        this.scale = 1;
        this.baseType = 'default';
        this.originalFile = null;
        this.decorationManager = null;
        this.init();
    }

    init() {
        this.canvas = document.getElementById('preview-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }

        this.setupEventListeners();
        this.initDecorations();
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
                    if (EDITOR_CONFIG.ACCEPTED_TYPES.includes(file.type)) {
                        this.loadImage(file);
                    } else {
                        alert('JPG、PNG、GIF形式の画像ファイルを選択してください。');
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
        // Validate file size
        if (file.size > EDITOR_CONFIG.MAX_FILE_SIZE) {
            alert(`ファイルサイズは${EDITOR_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB以下にしてください。`);
            return;
        }

        // Validate file type
        if (!EDITOR_CONFIG.ACCEPTED_TYPES.includes(file.type)) {
            alert('JPG、PNG、GIF、WEBP形式の画像ファイルを選択してください。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.rotation = 0;
                this.scale = 1;
                this.originalFile = file;
                
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
        const maxWidth = EDITOR_CONFIG.MAX_CANVAS_WIDTH;
        const maxHeight = EDITOR_CONFIG.MAX_CANVAS_HEIGHT;
        
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

    /**
     * 元のファイルを取得（アップロード用）
     * @returns {File|null} 元のファイル
     */
    getOriginalFile() {
        return this.originalFile || null;
    }

    /**
     * デコレーション機能の初期化
     */
    initDecorations() {
        // DecorationManagerが利用可能になるまで待つ
        const initInterval = setInterval(() => {
            if (window.DecorationManager) {
                clearInterval(initInterval);
                this.setupDecorationSystem();
            }
        }, 100);
    }

    /**
     * デコレーションシステムのセットアップ
     */
    setupDecorationSystem() {
        // プレビューエリアの親要素を取得
        const previewArea = document.querySelector('.acrylic-stand-preview');
        if (!previewArea) return;

        // DecorationManagerを初期化
        this.decorationManager = new DecorationManager('.acrylic-stand-preview');

        // タブ切り替え
        const tabs = document.querySelectorAll('.decoration-tab[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchDecorationTab(tabName, tab);
            });
        });

        // カテゴリタブ
        const categoryTabs = document.querySelectorAll('.decoration-tab[data-category]');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                this.showMotifCategory(category, tab);
            });
        });

        // 初期カテゴリを表示
        this.showMotifCategory('hearts');

        // テキストコントロール
        this.setupTextControls();

        // レイヤーコントロール
        this.setupLayerControls();
    }

    /**
     * デコレーションタブを切り替え
     */
    switchDecorationTab(tabName, tabButton) {
        // タブボタンのアクティブ状態を更新
        const allTabs = document.querySelectorAll('.decoration-tab[data-tab]');
        allTabs.forEach(t => t.classList.remove('active'));
        tabButton.classList.add('active');

        // タブコンテンツを切り替え
        const allContents = document.querySelectorAll('.tab-content');
        allContents.forEach(c => c.classList.remove('active'));

        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    /**
     * モチーフカテゴリを表示
     */
    showMotifCategory(category, tabButton = null) {
        if (!this.decorationManager) return;

        // カテゴリタブのアクティブ状態を更新
        if (tabButton) {
            const categoryTabs = document.querySelectorAll('.decoration-tab[data-category]');
            categoryTabs.forEach(t => t.classList.remove('active'));
            tabButton.classList.add('active');
        }

        const catalog = this.decorationManager.getMotifCatalog();
        const motifs = catalog[category] || [];
        const grid = document.getElementById('motif-grid');
        
        if (!grid) return;

        grid.innerHTML = '';

        motifs.forEach(motif => {
            const item = document.createElement('div');
            item.className = 'motif-item';
            
            const img = document.createElement('img');
            img.src = `assets/decorations/${category}/${motif.file}`;
            img.alt = motif.name;
            
            const span = document.createElement('span');
            span.textContent = motif.name;
            
            item.appendChild(img);
            item.appendChild(span);
            
            item.addEventListener('click', () => {
                this.decorationManager.addMotif(category, motif.file);
            });
            
            grid.appendChild(item);
        });
    }

    /**
     * テキストコントロールのセットアップ
     */
    setupTextControls() {
        const addBtn = document.getElementById('add-text-btn');
        const updateBtn = document.getElementById('update-text-btn');
        const fontSizeSlider = document.getElementById('font-size');
        const fontSizeValue = document.getElementById('font-size-value');

        // フォントサイズスライダー
        if (fontSizeSlider && fontSizeValue) {
            fontSizeSlider.addEventListener('input', (e) => {
                fontSizeValue.textContent = e.target.value + 'px';
            });
        }

        // テキスト追加
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const text = document.getElementById('text-input').value;
                const fontSize = parseInt(document.getElementById('font-size').value);
                const fontFamily = document.getElementById('font-select').value;
                const color = document.getElementById('text-color').value;

                if (text.trim()) {
                    this.decorationManager.addText(text, {
                        fontSize,
                        fontFamily,
                        color
                    });
                } else {
                    alert('テキストを入力してください');
                }
            });
        }

        // テキスト更新
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                if (!this.decorationManager.selectedDecoration) {
                    alert('デコレーションを選択してください');
                    return;
                }

                const selected = this.decorationManager.selectedDecoration;
                if (selected.type !== 'text') {
                    alert('テキストデコレーションを選択してください');
                    return;
                }

                const text = document.getElementById('text-input').value;
                const fontSize = parseInt(document.getElementById('font-size').value);
                const fontFamily = document.getElementById('font-select').value;
                const color = document.getElementById('text-color').value;

                if (text.trim()) {
                    this.decorationManager.updateText(selected.id, text);
                    this.decorationManager.updateTextStyle(selected.id, {
                        fontSize,
                        fontFamily,
                        color
                    });
                }
            });
        }
    }

    /**
     * レイヤーコントロールのセットアップ
     */
    setupLayerControls() {
        const bringToFrontBtn = document.getElementById('bring-to-front-btn');
        const sendToBackBtn = document.getElementById('send-to-back-btn');
        const clearBtn = document.getElementById('clear-decorations-btn');

        if (bringToFrontBtn) {
            bringToFrontBtn.addEventListener('click', () => {
                if (!this.decorationManager.selectedDecoration) {
                    alert('デコレーションを選択してください');
                    return;
                }
                this.decorationManager.bringToFront(this.decorationManager.selectedDecoration.id);
            });
        }

        if (sendToBackBtn) {
            sendToBackBtn.addEventListener('click', () => {
                if (!this.decorationManager.selectedDecoration) {
                    alert('デコレーションを選択してください');
                    return;
                }
                this.decorationManager.sendToBack(this.decorationManager.selectedDecoration.id);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('すべてのデコレーションを削除しますか？')) {
                    this.decorationManager.clearAll();
                }
            });
        }
    }

    /**
     * デコレーション付きで最終画像を取得
     */
    getFinalImageWithDecorations() {
        if (!this.canvas || !this.decorationManager) {
            return this.getImageData();
        }

        // 新しいキャンバスを作成して統合
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = this.canvas.width;
        finalCanvas.height = this.canvas.height;
        const finalCtx = finalCanvas.getContext('2d');

        // ベース画像を描画
        finalCtx.drawImage(this.canvas, 0, 0);

        // デコレーションを描画
        const previewArea = document.querySelector('.acrylic-stand-preview');
        const rect = previewArea.getBoundingClientRect();
        
        this.decorationManager.getDecorations()
            .sort((a, b) => a.zIndex - b.zIndex)
            .forEach(decoration => {
                finalCtx.save();
                
                const x = (decoration.x / 100) * finalCanvas.width;
                const y = (decoration.y / 100) * finalCanvas.height;
                
                finalCtx.translate(x, y);
                finalCtx.rotate((decoration.rotation * Math.PI) / 180);
                
                if (decoration.type === 'motif' && decoration.element) {
                    const img = decoration.element;
                    if (img.complete) {
                        finalCtx.drawImage(
                            img,
                            -decoration.width / 2,
                            -decoration.height / 2,
                            decoration.width,
                            decoration.height
                        );
                    }
                } else if (decoration.type === 'text') {
                    finalCtx.font = `${decoration.fontSize}px ${decoration.fontFamily}`;
                    finalCtx.fillStyle = decoration.color;
                    finalCtx.textAlign = 'center';
                    finalCtx.textBaseline = 'middle';
                    finalCtx.fillText(decoration.text, 0, 0);
                }
                
                finalCtx.restore();
            });

        return finalCanvas.toDataURL('image/png');
    }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.imageEditor = new ImageEditor();
});
