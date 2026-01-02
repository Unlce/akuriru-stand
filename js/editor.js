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
        this.croppingTool = null;
        this.baseEditor = null;
        this.filterManager = null;
        this.currentMode = 'basic'; // 'basic', 'filters', 'cropping', 'base'
        this.init();
    }

    init() {
        this.canvas = document.getElementById('preview-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        this.setupEventListeners();
        this.initDecorations();
        this.initCroppingTool();
        this.initBaseEditor();
        this.initEditorModes();
        
        // Try to restore previous session
        this.checkForSavedSession();
    }

    /**
     * Check for saved session and prompt to restore
     */
    checkForSavedSession() {
        setTimeout(() => {
            if (window.sessionProtector) {
                const saved = window.sessionProtector.showRestorePrompt();
                if (saved && saved.imageData) {
                    // Restore the session
                    const img = new Image();
                    img.onload = () => {
                        this.image = img;
                        this.rotation = saved.rotation || 0;
                        this.scale = saved.scale || 1;
                        this.baseType = saved.baseType || 'default';
                        this.render();
                        this.showEditor();
                        window.toastManager.success('前回のセッションを復元しました', '復元完了');
                        window.sessionProtector.markAsSaved();
                    };
                    img.src = saved.imageData;
                }
            }
        }, 1000);
    }

    /**
     * Show quality warning in editor
     */
    showQualityWarning(warnings) {
        const editorSection = document.getElementById('editor-section');
        if (!editorSection) return null;
        
        // Remove any existing warnings
        const existingWarning = editorSection.querySelector('.quality-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        // Create new warning
        const warningDiv = document.createElement('div');
        warningDiv.className = 'quality-warning';
        warningDiv.innerHTML = `
            <div class="quality-warning-icon">⚠️</div>
            <div class="quality-warning-content">
                <div class="quality-warning-title">画質に関する警告</div>
                <div class="quality-warning-message">${warnings.join('<br>')}</div>
            </div>
            <button class="quality-warning-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Insert at the top of editor section
        editorSection.insertBefore(warningDiv, editorSection.firstChild);
        
        return warningDiv;
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
            fileInput.addEventListener('change', async (e) => {
                console.log('[Editor] File input change event triggered');
                if (e.target.files && e.target.files[0]) {
                    console.log('[Editor] File selected:', e.target.files[0].name);
                    
                    // Quality check
                    if (window.imageQualityChecker) {
                        const file = e.target.files[0];
                        const qualityResults = await window.imageQualityChecker.check(file);
                        
                        if (qualityResults.errors.length > 0) {
                            window.toastManager.error(qualityResults.errors.join('<br>'), 'ファイルエラー');
                            return;
                        }
                        
                        if (qualityResults.warnings.length > 0) {
                            const warningDiv = this.showQualityWarning(qualityResults.warnings);
                            // Still allow loading the image, but show warning
                            window.toastManager.warning(qualityResults.warnings[0], '画質警告');
                        }
                    }
                    
                    this.loadImage(e.target.files[0]);
                    
                    // Mark session as changed
                    if (window.sessionProtector) {
                        window.sessionProtector.markAsChanged();
                    }
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

            uploadArea.addEventListener('drop', async (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    if (!EDITOR_CONFIG.ACCEPTED_TYPES.includes(file.type)) {
                        window.toastManager.warning('JPG、PNG、GIF、WEBP形式の画像ファイルを選択してください。');
                        return;
                    }
                    
                    // Quality check
                    if (window.imageQualityChecker) {
                        const qualityResults = await window.imageQualityChecker.check(file);
                        
                        if (qualityResults.errors.length > 0) {
                            window.toastManager.error(qualityResults.errors.join('<br>'), 'ファイルエラー');
                            return;
                        }
                        
                        if (qualityResults.warnings.length > 0) {
                            window.toastManager.warning(qualityResults.warnings[0], '画質警告');
                        }
                    }
                    
                    this.loadImage(file);
                    
                    // Mark session as changed
                    if (window.sessionProtector) {
                        window.sessionProtector.markAsChanged();
                    }
                }
            });

            // Allow clicking on upload area (only if no image is loaded)
            // Removed to fix double-click issue - selectFileBtn already handles this
            // uploadArea.addEventListener('click', () => {
            //     if (!this.image) {
            //         fileInput.click();
            //     }
            // });
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
        console.log('[Editor] loadImage called with file:', file.name, 'size:', file.size, 'type:', file.type);
        
        // Validate file size
        if (file.size > EDITOR_CONFIG.MAX_FILE_SIZE) {
            alert(`ファイルサイズは${EDITOR_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB以下にしてください。`);
            console.error('[Editor] File too large:', file.size);
            return;
        }

        // Validate file type
        if (!EDITOR_CONFIG.ACCEPTED_TYPES.includes(file.type)) {
            alert('JPG、PNG、GIF、WEBP形式の画像ファイルを選択してください。');
            console.error('[Editor] Invalid file type:', file.type);
            return;
        }

        console.log('[Editor] File validation passed, reading file...');
        const reader = new FileReader();
        
        reader.onerror = (error) => {
            console.error('[Editor] FileReader error:', error);
            alert('ファイルの読み込みに失敗しました。');
        };
        
        reader.onload = (e) => {
            console.log('[Editor] File loaded, data URL length:', e.target.result.length);
            console.log('[Editor] Creating image object...');
            const img = new Image();
            
            img.onerror = (error) => {
                console.error('[Editor] Image load error:', error);
                alert('画像の読み込みに失敗しました。');
            };
            
            img.onload = () => {
                console.log('[Editor] Image loaded successfully:', img.width, 'x', img.height);
                console.log('[Editor] Canvas element:', this.canvas);
                console.log('[Editor] Context:', this.ctx);
                
                this.image = img;
                this.rotation = 0;
                this.scale = 1;
                this.originalFile = file;
                
                // Reset slider
                const scaleSlider = document.getElementById('scale-slider');
                if (scaleSlider) {
                    scaleSlider.value = 100;
                    console.log('[Editor] Scale slider reset');
                }
                const scaleValue = document.getElementById('scale-value');
                if (scaleValue) {
                    scaleValue.textContent = '100%';
                }

                console.log('[Editor] Calling render()...');
                this.render();
                console.log('[Editor] Calling showEditor()...');
                this.showEditor();
                console.log('[Editor] Image rendering complete');
            };
            
            console.log('[Editor] Setting image src...');
            img.src = e.target.result;
        };
        
        console.log('[Editor] Starting to read file as DataURL...');
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
        
        // Apply filters after rendering if filter manager exists and has active filter
        if (this.filterManager && this.filterManager.currentFilter !== 'none') {
            const currentFilter = this.filterManager.currentFilter;
            this.filterManager.applyFilter(currentFilter);
        }

        // If cropping mode is active, render cropping overlay
        if (this.croppingTool && this.croppingTool.isActive) {
            this.croppingTool.renderPreview();
        }
    }

    updateBasePreview() {
        const selectedBase = document.getElementById('selected-base');
        if (selectedBase) {
            selectedBase.className = `base-${this.baseType}`;
        }
    }

    showEditor() {
        console.log('[Editor] showEditor called');
        const uploadSection = document.querySelector('.upload-section');
        const editorSection = document.getElementById('editor-section');
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const standWrapper = document.getElementById('stand-wrapper');
        
        console.log('[Editor] Elements:', { uploadSection, editorSection, previewPlaceholder, standWrapper });
        
        if (uploadSection) {
            uploadSection.style.display = 'none';
            console.log('[Editor] Upload section hidden');
        }
        if (editorSection) {
            editorSection.style.display = 'block';
            console.log('[Editor] Editor section displayed');
        }
        
        // Show the stand preview and hide placeholder
        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'none';
            console.log('[Editor] Placeholder hidden');
        }
        if (standWrapper) {
            standWrapper.style.display = 'block';
            console.log('[Editor] Stand wrapper displayed');
        }
        
        // Re-setup filter controls to ensure they're bound after image is loaded
        if (this.filterManager) {
            this.setupFilterControls();
            console.log('[Editor] Filter controls re-initialized after image load');
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
        const previewPlaceholder = document.getElementById('preview-placeholder');
        const standWrapper = document.getElementById('stand-wrapper');

        if (uploadSection) {
            uploadSection.style.display = 'block';
        }
        if (editorSection) {
            editorSection.style.display = 'none';
        }
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Hide the stand preview and show placeholder
        if (previewPlaceholder) {
            previewPlaceholder.style.display = 'block';
        }
        if (standWrapper) {
            standWrapper.style.display = 'none';
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
        if (!this.canvas || !this.ctx) return null;
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
    
    getImageDataURL() {
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
            return this.getImageDataURL();
        }

        // 新しいキャンバスを作成して統合
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = this.canvas.width;
        finalCanvas.height = this.canvas.height;
        const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });

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

    /**
     * Initialize cropping tool
     */
    initCroppingTool() {
        const initCropping = () => {
            if (window.CroppingTool && this.canvas) {
                this.croppingTool = new CroppingTool(this.canvas, () => {
                    this.render();
                });
                this.setupCroppingControls();
            } else {
                setTimeout(initCropping, 100);
            }
        };
        initCropping();
    }

    /**
     * Setup cropping tool controls
     */
    setupCroppingControls() {
        console.log('[Editor] Setting up cropping controls...');

        // Professional Cropper Button
        const proCropperBtn = document.getElementById('pro-cropper-btn');
        if (proCropperBtn) {
            proCropperBtn.addEventListener('click', () => {
                console.log('[Editor] Professional cropper button clicked');

                if (!this.image) {
                    alert('画像をアップロードしてからプロ仕様切り抜きを使用してください');
                    return;
                }

                // Get current canvas as data URL
                const dataUrl = this.canvas.toDataURL('image/png');

                // Open professional cropper modal
                if (window.professionalCropper) {
                    window.professionalCropper.open(dataUrl, (croppedFile) => {
                        console.log('[Editor] Cropped file received:', croppedFile);

                        // Load the cropped image back into editor
                        this.loadImage(croppedFile);

                        // Show success message
                        if (window.toastManager) {
                            window.toastManager.success('切り抜き完了！');
                        }

                        // Switch back to basic mode
                        this.switchMode('basic');
                    });
                } else {
                    console.error('[Editor] Professional cropper not loaded');
                    alert('プロ仕様切り抜きツールの読み込みに失敗しました。ページを再読み込みしてください。');
                }
            });
        }

        // Tool selection
        const toolButtons = document.querySelectorAll('.crop-tool-btn');
        const brushSizeControl = document.getElementById('brush-size-control');
        const cropHint = document.getElementById('crop-hint');
        
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tool = btn.dataset.tool;
                console.log('[Editor] Tool selected:', tool);
                
                if (this.croppingTool) {
                    this.croppingTool.setTool(tool);
                }
                
                // Show/hide brush size control
                if (tool === 'freehand') {
                    if (brushSizeControl) brushSizeControl.style.display = 'block';
                } else {
                    if (brushSizeControl) brushSizeControl.style.display = 'none';
                }
            });
        });

        // Brush size control
        const brushSizeSlider = document.getElementById('brush-size-slider');
        const brushSizeValue = document.getElementById('brush-size-value');
        if (brushSizeSlider && brushSizeValue) {
            brushSizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                brushSizeValue.textContent = size;
                if (this.croppingTool) {
                    this.croppingTool.setBrushSize(size);
                }
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('crop-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('[Editor] Cancel button clicked');
                if (this.croppingTool) {
                    this.croppingTool.deactivate();
                }
                this.switchMode('basic');
            });
        }

        // Apply crop button
        const applyBtn = document.getElementById('crop-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                console.log('[Editor] Apply button clicked');
                
                if (this.croppingTool && this.croppingTool.isActive) {
                    this.croppingTool.applyCrop((url) => {
                        if (url) {
                            const img = new Image();
                            img.onload = () => {
                                this.image = img;
                                this.croppingTool.deactivate();
                                this.switchMode('basic');
                                this.render();
                                URL.revokeObjectURL(url);
                                console.log('[Editor] Crop applied successfully');
                            };
                            img.onerror = (err) => {
                                console.error('[Editor] Failed to load cropped image:', err);
                            };
                            img.src = url;
                        }
                    });
                }
            });
        }
    }

    /**
     * Initialize base editor
     */
    initBaseEditor() {
        const initBase = () => {
            if (window.BaseEditor) {
                console.log('[Editor] BaseEditor found, initializing...');
                this.baseEditor = new BaseEditor('.stand-base');
                this.setupBaseEditorControls();
            } else {
                console.log('[Editor] Waiting for BaseEditor...');
                setTimeout(initBase, 100);
            }
        };
        initBase();
    }

    /**
     * Initialize image filters
     */
    initFilters() {
        // Filters removed
    }

    /**
     * Setup filter controls
     */
    setupFilterControls() {
        // Filters removed
    }

    /**
     * Setup base editor controls
     */
    setupBaseEditorControls() {
        // Shape selection
        const shapeButtons = document.querySelectorAll('.base-shape-btn');
        shapeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                shapeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const shape = btn.dataset.shape;
                if (this.baseEditor) {
                    this.baseEditor.setShape(shape);
                }
            });
        });

        // Color picker
        const colorPicker = document.getElementById('base-color-picker');
        const colorValue = document.getElementById('base-color-value');
        if (colorPicker && colorValue) {
            colorPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                colorValue.textContent = color;
                if (this.baseEditor) {
                    this.baseEditor.setColor(color);
                }
            });
        }

        // Gradient toggle
        const gradientToggle = document.getElementById('base-gradient-toggle');
        const gradientColors = document.getElementById('gradient-colors');
        if (gradientToggle && gradientColors) {
            gradientToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                gradientColors.style.display = enabled ? 'grid' : 'none';
                if (this.baseEditor) {
                    this.baseEditor.setGradientEnabled(enabled);
                }
            });
        }

        // Gradient colors
        const gradientColor1 = document.getElementById('gradient-color1');
        const gradientColor2 = document.getElementById('gradient-color2');
        if (gradientColor1 && gradientColor2) {
            const updateGradient = () => {
                if (this.baseEditor) {
                    this.baseEditor.setGradientColors(
                        gradientColor1.value,
                        gradientColor2.value
                    );
                }
            };
            gradientColor1.addEventListener('input', updateGradient);
            gradientColor2.addEventListener('input', updateGradient);
        }

        // Opacity slider
        const opacitySlider = document.getElementById('base-opacity-slider');
        const opacityValue = document.getElementById('base-opacity-value');
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const opacity = parseInt(e.target.value) / 100;
                opacityValue.textContent = e.target.value;
                if (this.baseEditor) {
                    this.baseEditor.setOpacity(opacity);
                }
            });
        }

        // Size slider
        const sizeSlider = document.getElementById('base-size-slider');
        const sizeValue = document.getElementById('base-size-value');
        if (sizeSlider && sizeValue) {
            sizeSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                sizeValue.textContent = size;
                if (this.baseEditor) {
                    this.baseEditor.setSize(size);
                }
            });
        }

        // Text controls
        const textInput = document.getElementById('base-text-input');
        const fontSelect = document.getElementById('base-font-select');
        const textColor = document.getElementById('base-text-color');
        const textSizeSlider = document.getElementById('base-text-size-slider');
        const textSizeValue = document.getElementById('base-text-size-value');
        const addBtn = document.getElementById('base-text-add-btn');
        const removeBtn = document.getElementById('base-text-remove-btn');

        if (textSizeSlider && textSizeValue) {
            textSizeSlider.addEventListener('input', (e) => {
                textSizeValue.textContent = e.target.value;
            });
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const text = textInput ? textInput.value : '';
                if (text.trim() && this.baseEditor) {
                    const fontSize = textSizeSlider ? parseInt(textSizeSlider.value) : 16;
                    const fontFamily = fontSelect ? fontSelect.value : 'sans-serif';
                    const color = textColor ? textColor.value : '#000000';
                    
                    this.baseEditor.addText(text, {
                        fontSize,
                        fontFamily,
                        color
                    });
                    
                    if (textInput) textInput.value = '';
                } else if (!text.trim()) {
                    alert('テキストを入力してください');
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (this.baseEditor && this.baseEditor.selectedTextId) {
                    this.baseEditor.removeText(this.baseEditor.selectedTextId);
                } else {
                    alert('削除するテキストを選択してください');
                }
            });
        }

        // Setup text dragging
        if (this.baseEditor) {
            this.baseEditor.setupTextDragging();
        }
    }

    /**
     * Initialize editor mode switching
     */
    initEditorModes() {
        const modeButtons = document.querySelectorAll('.editor-mode-tab');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    /**
     * Switch between editor modes
     */
    switchMode(mode) {
        this.currentMode = mode;

        // Update tab active states
        const modeButtons = document.querySelectorAll('.editor-mode-tab');
        modeButtons.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Show/hide panels
        const basicPanel = document.getElementById('basic-editing-panel');
        const croppingPanel = document.getElementById('cropping-panel');
        const basePanel = document.getElementById('base-editor-panel');

        if (basicPanel) basicPanel.classList.remove('active');
        if (croppingPanel) croppingPanel.classList.remove('active');
        if (basePanel) basePanel.classList.remove('active');

        // Activate/deactivate cropping tool
        if (this.croppingTool) {
            if (mode === 'cropping' && this.image) {
                // First render the base image
                this.render();
                // Then activate cropping tool with current canvas state
                const imageData = this.getImageData();
                this.croppingTool.activate(imageData);
                if (croppingPanel) croppingPanel.classList.add('active');
                // Render again with cropping overlay
                this.croppingTool.renderPreview();
                console.log('[Editor] Cropping mode activated');
            } else {
                this.croppingTool.deactivate();
                if (this.image) {
                    this.render();
                }
                console.log('[Editor] Cropping mode deactivated');
            }
        }

        // Show appropriate panel
        if (mode === 'basic' && basicPanel) {
            basicPanel.classList.add('active');
        } else if (mode === 'cropping' && croppingPanel) {
            if (!this.image) {
                alert('画像をアップロードしてから切り抜きツールを使用してください');
                this.switchMode('basic');
                return;
            }
            croppingPanel.classList.add('active');
        } else if (mode === 'base' && basePanel) {
            basePanel.classList.add('active');
        }
    }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.imageEditor = new ImageEditor();
});
