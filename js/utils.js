// Utility functions for error handling, loading, and user feedback

/**
 * Toast notification system
 */
class ToastManager {
    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        return container;
    }

    show(message, type = 'info', duration = 5000, title = null) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const titles = {
            success: '成功',
            error: 'エラー',
            warning: '警告',
            info: 'お知らせ'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title || titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">×</button>
        `;

        this.container.appendChild(toast);

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    }

    remove(toast) {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, title = null) {
        return this.show(message, 'success', 5000, title);
    }

    error(message, title = null) {
        return this.show(message, 'error', 7000, title);
    }

    warning(message, title = null) {
        return this.show(message, 'warning', 6000, title);
    }

    info(message, title = null) {
        return this.show(message, 'info', 5000, title);
    }
}

/**
 * Loading overlay
 */
class LoadingManager {
    constructor() {
        this.overlay = this.createOverlay();
        document.body.appendChild(this.overlay);
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-large"></div>
            <div class="loading-text">処理中...</div>
        `;
        return overlay;
    }

    show(message = '処理中...') {
        const textEl = this.overlay.querySelector('.loading-text');
        if (textEl) {
            textEl.textContent = message;
        }
        this.overlay.classList.add('active');
    }

    hide() {
        this.overlay.classList.remove('active');
    }
}

/**
 * Image quality checker
 */
class ImageQualityChecker {
    constructor(minWidth = 800, minHeight = 800, maxSize = 10 * 1024 * 1024) {
        this.minWidth = minWidth;
        this.minHeight = minHeight;
        this.maxSize = maxSize;
    }

    async check(file) {
        const results = {
            valid: true,
            warnings: [],
            errors: []
        };

        // Check file size
        if (file.size > this.maxSize) {
            results.valid = false;
            results.errors.push(`ファイルサイズが大きすぎます（最大${this.formatBytes(this.maxSize)}）`);
        }

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            results.valid = false;
            results.errors.push('対応していないファイル形式です（JPG、PNG、GIF、WEBPのみ対応）');
        }

        // Check image dimensions
        try {
            const dimensions = await this.getImageDimensions(file);
            
            if (dimensions.width < this.minWidth || dimensions.height < this.minHeight) {
                results.warnings.push(
                    `画像の解像度が低い可能性があります（推奨: ${this.minWidth}×${this.minHeight}px以上、現在: ${dimensions.width}×${dimensions.height}px）。印刷品質が低下する場合があります。`
                );
            }

            // Check aspect ratio extremes
            const aspectRatio = dimensions.width / dimensions.height;
            if (aspectRatio > 3 || aspectRatio < 0.33) {
                results.warnings.push('画像のアスペクト比が極端です。アクリルスタンドに適していない可能性があります。');
            }

        } catch (error) {
            results.errors.push('画像の読み込みに失敗しました');
        }

        return results;
    }

    getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

/**
 * Session protection - auto-save and page leave warning
 */
class SessionProtector {
    constructor() {
        this.hasUnsavedChanges = false;
        this.autoSaveInterval = null;
        this.init();
    }

    init() {
        // Warn before leaving if there are unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '編集内容が保存されていません。ページを離れますか？';
                return e.returnValue;
            }
        });

        // Start auto-save
        this.startAutoSave();
    }

    markAsChanged() {
        this.hasUnsavedChanges = true;
    }

    markAsSaved() {
        this.hasUnsavedChanges = false;
    }

    startAutoSave(intervalMs = 30000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges && window.imageEditor) {
                this.saveToLocalStorage();
            }
        }, intervalMs);
    }

    saveToLocalStorage() {
        try {
            if (!window.imageEditor || !window.imageEditor.hasImage()) {
                return;
            }

            const data = {
                imageData: window.imageEditor.getImageData(),
                timestamp: Date.now(),
                rotation: window.imageEditor.rotation,
                scale: window.imageEditor.scale,
                baseType: window.imageEditor.baseType
            };

            localStorage.setItem('acrylic_stand_draft', JSON.stringify(data));
            console.log('[SessionProtector] Auto-saved to localStorage');
        } catch (error) {
            console.error('[SessionProtector] Auto-save failed:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('acrylic_stand_draft');
            if (!saved) return null;

            const data = JSON.parse(saved);
            
            // Check if data is not too old (24 hours)
            const age = Date.now() - data.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('acrylic_stand_draft');
                return null;
            }

            return data;
        } catch (error) {
            console.error('[SessionProtector] Load from localStorage failed:', error);
            return null;
        }
    }

    clearSaved() {
        localStorage.removeItem('acrylic_stand_draft');
    }

    showRestorePrompt() {
        const saved = this.loadFromLocalStorage();
        if (!saved) return false;

        const date = new Date(saved.timestamp);
        const message = `${date.toLocaleString('ja-JP')}に自動保存されたデータがあります。復元しますか？`;
        
        if (confirm(message)) {
            return saved;
        } else {
            this.clearSaved();
            return null;
        }
    }
}

/**
 * Network status monitor
 */
class NetworkMonitor {
    constructor(toastManager) {
        this.toastManager = toastManager;
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.toastManager.success('インターネット接続が復旧しました', 'オンライン');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.toastManager.error('インターネット接続が切断されました。接続を確認してください。', 'オフライン');
        });
    }

    checkConnection() {
        return this.isOnline;
    }
}

/**
 * Cookie consent manager
 */
class CookieConsent {
    constructor() {
        this.banner = this.createBanner();
        this.hasConsent = this.checkConsent();
        
        if (!this.hasConsent) {
            this.show();
        }
    }

    createBanner() {
        const banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.innerHTML = `
            <div class="cookie-content">
                <div class="cookie-text">
                    <p>当サイトでは、サービス向上のためCookieを使用しています。<a href="privacy.html" target="_blank">プライバシーポリシー</a>をご確認ください。</p>
                </div>
                <div class="cookie-buttons">
                    <button class="cookie-accept">同意する</button>
                    <button class="cookie-decline">拒否する</button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Event listeners
        banner.querySelector('.cookie-accept').addEventListener('click', () => this.accept());
        banner.querySelector('.cookie-decline').addEventListener('click', () => this.decline());

        return banner;
    }

    show() {
        this.banner.classList.add('show');
    }

    hide() {
        this.banner.classList.remove('show');
    }

    accept() {
        localStorage.setItem('cookie_consent', 'accepted');
        this.hasConsent = true;
        this.hide();
    }

    decline() {
        localStorage.setItem('cookie_consent', 'declined');
        this.hasConsent = false;
        this.hide();
    }

    checkConsent() {
        const consent = localStorage.getItem('cookie_consent');
        return consent === 'accepted';
    }
}

// Initialize global utilities
window.addEventListener('DOMContentLoaded', () => {
    window.toastManager = new ToastManager();
    window.loadingManager = new LoadingManager();
    window.imageQualityChecker = new ImageQualityChecker();
    window.sessionProtector = new SessionProtector();
    window.networkMonitor = new NetworkMonitor(window.toastManager);
    window.cookieConsent = new CookieConsent();

    console.log('[Utils] Initialized: Toast, Loading, Quality Checker, Session Protector, Network Monitor, Cookie Consent');
});
