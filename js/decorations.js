// Decoration Management System for Acrylic Stand Editor

class DecorationManager {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.decorations = [];
        this.selectedDecoration = null;
        this.nextId = 1;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // デコレーションカタログ
        this.motifCatalog = {
            hearts: [
                { name: 'ハート', file: 'heart.svg' },
                { name: 'キラキラハート', file: 'sparkle-heart.svg' },
                { name: 'ダブルハート', file: 'double-heart.svg' }
            ],
            ribbons: [
                { name: 'ピンクリボン', file: 'pink-ribbon.svg' },
                { name: 'ゴールドリボン', file: 'gold-ribbon.svg' }
            ],
            stars: [
                { name: '星', file: 'star.svg' },
                { name: 'キラキラ', file: 'sparkle.svg' },
                { name: '流れ星', file: 'shooting-star.svg' }
            ],
            flowers: [
                { name: '桜', file: 'sakura.svg' },
                { name: 'バラ', file: 'rose.svg' },
                { name: '花びら', file: 'petal.svg' }
            ],
            effects: [
                { name: 'キラキラ', file: 'sparkles.svg' },
                { name: '光', file: 'light.svg' },
                { name: '泡', file: 'bubble.svg' }
            ]
        };
        
        this.init();
    }

    init() {
        if (!this.container) return;
        
        // コンテナをrelativeに設定
        this.container.style.position = 'relative';
        
        // イベントリスナー設定
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (this.selectedDecoration) {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    this.deleteDecoration(this.selectedDecoration.id);
                }
            }
        });
    }

    // モチーフを追加
    addMotif(category, fileName) {
        const decoration = {
            id: this.nextId++,
            type: 'motif',
            category: category,
            src: `assets/decorations/${category}/${fileName}`,
            x: 50, // パーセンテージで中央
            y: 50,
            width: 80,
            height: 80,
            rotation: 0,
            zIndex: this.decorations.length
        };
        
        this.decorations.push(decoration);
        this.renderDecoration(decoration);
        this.selectDecoration(decoration.id);
        
        return decoration.id;
    }

    // テキストを追加
    addText(text, options = {}) {
        const decoration = {
            id: this.nextId++,
            type: 'text',
            text: text,
            x: 50,
            y: 50,
            fontSize: options.fontSize || 24,
            fontFamily: options.fontFamily || 'Arial, sans-serif',
            color: options.color || '#000000',
            rotation: 0,
            zIndex: this.decorations.length
        };
        
        this.decorations.push(decoration);
        this.renderDecoration(decoration);
        this.selectDecoration(decoration.id);
        
        return decoration.id;
    }

    // デコレーションをレンダリング
    renderDecoration(decoration) {
        let element;
        
        if (decoration.type === 'motif') {
            element = document.createElement('img');
            element.src = decoration.src;
            element.style.width = decoration.width + 'px';
            element.style.height = decoration.height + 'px';
            element.draggable = false;
        } else if (decoration.type === 'text') {
            element = document.createElement('div');
            element.textContent = decoration.text;
            element.style.fontSize = decoration.fontSize + 'px';
            element.style.fontFamily = decoration.fontFamily;
            element.style.color = decoration.color;
            element.style.whiteSpace = 'nowrap';
            element.style.userSelect = 'none';
        }
        
        element.className = 'decoration-element';
        element.dataset.decorationId = decoration.id;
        element.style.position = 'absolute';
        element.style.left = decoration.x + '%';
        element.style.top = decoration.y + '%';
        element.style.transform = `translate(-50%, -50%) rotate(${decoration.rotation}deg)`;
        element.style.transformOrigin = 'center';
        element.style.cursor = 'move';
        element.style.zIndex = decoration.zIndex;
        
        this.container.appendChild(element);
        decoration.element = element;
    }

    // すべてのデコレーションを再レンダリング
    renderAll() {
        // 既存のデコレーション要素を削除
        const existingElements = this.container.querySelectorAll('.decoration-element, .decoration-controls');
        existingElements.forEach(el => el.remove());
        
        // すべてのデコレーションを再レンダリング
        this.decorations.forEach(decoration => {
            this.renderDecoration(decoration);
        });
        
        // 選択されているデコレーションがあればコントロールを表示
        if (this.selectedDecoration) {
            this.showControls(this.selectedDecoration);
        }
    }

    // デコレーションを選択
    selectDecoration(id) {
        const decoration = this.decorations.find(d => d.id === id);
        if (!decoration) return;
        
        this.selectedDecoration = decoration;
        this.hideAllControls();
        this.showControls(decoration);
    }

    // 選択解除
    deselectAll() {
        this.selectedDecoration = null;
        this.hideAllControls();
    }

    // コントロールを表示
    showControls(decoration) {
        this.hideAllControls();
        
        const controls = document.createElement('div');
        controls.className = 'decoration-controls';
        controls.dataset.decorationId = decoration.id;
        controls.style.position = 'absolute';
        controls.style.left = decoration.x + '%';
        controls.style.top = decoration.y + '%';
        controls.style.transform = 'translate(-50%, -50%)';
        controls.style.pointerEvents = 'none';
        controls.style.zIndex = 9999;
        
        // 枠線
        const border = document.createElement('div');
        border.className = 'decoration-border';
        border.style.position = 'absolute';
        border.style.border = '2px dashed #FF69B4';
        border.style.pointerEvents = 'none';
        
        if (decoration.type === 'motif') {
            border.style.width = decoration.width + 'px';
            border.style.height = decoration.height + 'px';
        } else {
            const textElement = decoration.element;
            border.style.width = textElement.offsetWidth + 'px';
            border.style.height = textElement.offsetHeight + 'px';
        }
        
        border.style.left = '50%';
        border.style.top = '50%';
        border.style.transform = `translate(-50%, -50%) rotate(${decoration.rotation}deg)`;
        
        controls.appendChild(border);
        
        // リサイズハンドル（モチーフのみ）
        if (decoration.type === 'motif') {
            const resizeHandle = this.createHandle('resize', '↘', decoration.width / 2, decoration.height / 2);
            controls.appendChild(resizeHandle);
        }
        
        // 回転ハンドル
        const rotateHandle = this.createHandle('rotate', '↻', 0, decoration.type === 'motif' ? -decoration.height / 2 - 20 : -30);
        controls.appendChild(rotateHandle);
        
        // 削除ボタン
        const deleteBtn = this.createHandle('delete', '✕', decoration.type === 'motif' ? decoration.width / 2 + 10 : 30, decoration.type === 'motif' ? -decoration.height / 2 - 10 : -30);
        deleteBtn.style.background = '#FF4444';
        controls.appendChild(deleteBtn);
        
        this.container.appendChild(controls);
        
        // デコレーション要素をハイライト
        decoration.element.style.outline = '2px solid #FF69B4';
    }

    // ハンドルを作成
    createHandle(type, symbol, offsetX, offsetY) {
        const handle = document.createElement('div');
        handle.className = `decoration-handle decoration-handle-${type}`;
        handle.textContent = symbol;
        handle.style.position = 'absolute';
        handle.style.width = '24px';
        handle.style.height = '24px';
        handle.style.background = '#FF69B4';
        handle.style.color = 'white';
        handle.style.borderRadius = '50%';
        handle.style.display = 'flex';
        handle.style.alignItems = 'center';
        handle.style.justifyContent = 'center';
        handle.style.cursor = type === 'resize' ? 'nwse-resize' : type === 'rotate' ? 'grab' : 'pointer';
        handle.style.fontSize = '14px';
        handle.style.fontWeight = 'bold';
        handle.style.pointerEvents = 'all';
        handle.style.left = `calc(50% + ${offsetX}px)`;
        handle.style.top = `calc(50% + ${offsetY}px)`;
        handle.style.transform = 'translate(-50%, -50%)';
        handle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        return handle;
    }

    // すべてのコントロールを非表示
    hideAllControls() {
        const controls = this.container.querySelectorAll('.decoration-controls');
        controls.forEach(c => c.remove());
        
        const elements = this.container.querySelectorAll('.decoration-element');
        elements.forEach(el => el.style.outline = 'none');
    }

    // デコレーションを削除
    deleteDecoration(id) {
        const index = this.decorations.findIndex(d => d.id === id);
        if (index === -1) return;
        
        const decoration = this.decorations[index];
        if (decoration.element) {
            decoration.element.remove();
        }
        
        this.decorations.splice(index, 1);
        this.hideAllControls();
        this.selectedDecoration = null;
    }

    // デコレーションを前面へ
    bringToFront(id) {
        const decoration = this.decorations.find(d => d.id === id);
        if (!decoration) return;
        
        const maxZ = Math.max(...this.decorations.map(d => d.zIndex));
        decoration.zIndex = maxZ + 1;
        if (decoration.element) {
            decoration.element.style.zIndex = decoration.zIndex;
        }
    }

    // デコレーションを背面へ
    sendToBack(id) {
        const decoration = this.decorations.find(d => d.id === id);
        if (!decoration) return;
        
        const minZ = Math.min(...this.decorations.map(d => d.zIndex));
        decoration.zIndex = minZ - 1;
        if (decoration.element) {
            decoration.element.style.zIndex = decoration.zIndex;
        }
    }

    // テキストを更新
    updateText(id, text) {
        const decoration = this.decorations.find(d => d.id === id);
        if (!decoration || decoration.type !== 'text') return;
        
        decoration.text = text;
        if (decoration.element) {
            decoration.element.textContent = text;
        }
    }

    // テキストスタイルを更新
    updateTextStyle(id, options) {
        const decoration = this.decorations.find(d => d.id === id);
        if (!decoration || decoration.type !== 'text') return;
        
        if (options.fontSize) {
            decoration.fontSize = options.fontSize;
            decoration.element.style.fontSize = options.fontSize + 'px';
        }
        if (options.fontFamily) {
            decoration.fontFamily = options.fontFamily;
            decoration.element.style.fontFamily = options.fontFamily;
        }
        if (options.color) {
            decoration.color = options.color;
            decoration.element.style.color = options.color;
        }
        
        // コントロールを更新
        if (this.selectedDecoration && this.selectedDecoration.id === id) {
            this.showControls(decoration);
        }
    }

    // マウスダウン
    handleMouseDown(e) {
        const target = e.target;
        
        // ハンドルクリック
        if (target.classList.contains('decoration-handle-delete')) {
            const controls = target.closest('.decoration-controls');
            if (controls) {
                const id = parseInt(controls.dataset.decorationId);
                this.deleteDecoration(id);
            }
            return;
        }
        
        if (target.classList.contains('decoration-handle-resize')) {
            this.isResizing = true;
            const controls = target.closest('.decoration-controls');
            if (controls) {
                const id = parseInt(controls.dataset.decorationId);
                this.selectedDecoration = this.decorations.find(d => d.id === id);
            }
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            return;
        }
        
        if (target.classList.contains('decoration-handle-rotate')) {
            this.isRotating = true;
            const controls = target.closest('.decoration-controls');
            if (controls) {
                const id = parseInt(controls.dataset.decorationId);
                this.selectedDecoration = this.decorations.find(d => d.id === id);
            }
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            return;
        }
        
        // デコレーション要素クリック
        if (target.classList.contains('decoration-element')) {
            const id = parseInt(target.dataset.decorationId);
            this.selectDecoration(id);
            this.isDragging = true;
            
            const rect = this.container.getBoundingClientRect();
            this.dragOffsetX = e.clientX - rect.left - (this.selectedDecoration.x * rect.width / 100);
            this.dragOffsetY = e.clientY - rect.top - (this.selectedDecoration.y * rect.height / 100);
            return;
        }
        
        // 空白をクリック
        if (target === this.container || target.id === 'preview-canvas') {
            this.deselectAll();
        }
    }

    // マウス移動
    handleMouseMove(e) {
        if (this.isDragging && this.selectedDecoration) {
            const rect = this.container.getBoundingClientRect();
            const x = ((e.clientX - rect.left - this.dragOffsetX) / rect.width) * 100;
            const y = ((e.clientY - rect.top - this.dragOffsetY) / rect.height) * 100;
            
            this.selectedDecoration.x = Math.max(0, Math.min(100, x));
            this.selectedDecoration.y = Math.max(0, Math.min(100, y));
            
            this.updateDecorationPosition(this.selectedDecoration);
        } else if (this.isResizing && this.selectedDecoration) {
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            const delta = Math.max(deltaX, deltaY);
            
            const newWidth = Math.max(20, this.selectedDecoration.width + delta);
            const newHeight = Math.max(20, this.selectedDecoration.height + delta);
            
            this.selectedDecoration.width = newWidth;
            this.selectedDecoration.height = newHeight;
            
            if (this.selectedDecoration.element) {
                this.selectedDecoration.element.style.width = newWidth + 'px';
                this.selectedDecoration.element.style.height = newHeight + 'px';
            }
            
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.showControls(this.selectedDecoration);
        } else if (this.isRotating && this.selectedDecoration) {
            const deltaX = e.clientX - this.dragStartX;
            this.selectedDecoration.rotation = (this.selectedDecoration.rotation + deltaX) % 360;
            
            if (this.selectedDecoration.element) {
                this.selectedDecoration.element.style.transform = 
                    `translate(-50%, -50%) rotate(${this.selectedDecoration.rotation}deg)`;
            }
            
            this.dragStartX = e.clientX;
            this.showControls(this.selectedDecoration);
        }
    }

    // マウスアップ
    handleMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
    }

    // タッチイベント処理
    handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        e.target.dispatchEvent(mouseEvent);
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        document.dispatchEvent(mouseEvent);
        e.preventDefault();
    }

    handleTouchEnd(e) {
        const mouseEvent = new MouseEvent('mouseup', {
            bubbles: true
        });
        document.dispatchEvent(mouseEvent);
    }

    // デコレーション位置を更新
    updateDecorationPosition(decoration) {
        if (!decoration.element) return;
        
        decoration.element.style.left = decoration.x + '%';
        decoration.element.style.top = decoration.y + '%';
        
        // コントロールも更新
        const controls = this.container.querySelector(`.decoration-controls[data-decoration-id="${decoration.id}"]`);
        if (controls) {
            controls.style.left = decoration.x + '%';
            controls.style.top = decoration.y + '%';
        }
    }

    // すべてのデコレーションを取得
    getDecorations() {
        return this.decorations;
    }

    // すべてクリア
    clearAll() {
        this.decorations.forEach(d => {
            if (d.element) d.element.remove();
        });
        this.decorations = [];
        this.selectedDecoration = null;
        this.hideAllControls();
    }

    // モチーフカタログを取得
    getMotifCatalog() {
        return this.motifCatalog;
    }
}

// グローバルに公開（editor.jsから利用）
window.DecorationManager = DecorationManager;
