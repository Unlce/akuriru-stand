// Payment and Order Management

class OrderManager {
    constructor() {
        this.selectedSize = 'card';
        this.selectedPrice = 1000;
        this.quantity = 1;
        this.sessionStartTime = Date.now();
        this.pagesViewed = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateTotalPrice();
        this.initSessionTracking();
        this.checkApiAvailability();
    }

    /**
     * APIの可用性をチェック（診断用）
     */
    async checkApiAvailability() {
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
            console.log('[Payment] Checking API availability...');
            
            try {
                // Check upload.php with OPTIONS request
                const uploadCheck = await fetch('api/upload.php', { method: 'OPTIONS' });
                console.log('[Payment] upload.php availability:', uploadCheck.status, uploadCheck.statusText);
                
                // Check orders.php with OPTIONS request
                const ordersCheck = await fetch('api/orders.php', { method: 'OPTIONS' });
                console.log('[Payment] orders.php availability:', ordersCheck.status, ordersCheck.statusText);
                
                if (uploadCheck.status === 200 && ordersCheck.status === 200) {
                    console.log('[Payment] ✓ Both API endpoints are accessible');
                } else {
                    console.warn('[Payment] ⚠ Some API endpoints may not be accessible');
                }
            } catch (error) {
                console.warn('[Payment] ⚠ API availability check failed:', error.message);
                console.warn('[Payment] This is normal if running locally without a PHP server');
            }
        }
    }

    /**
     * セッション追跡を初期化
     */
    initSessionTracking() {
        // ページビューをカウント
        const viewCount = parseInt(sessionStorage.getItem('pagesViewed') || '0');
        this.pagesViewed = viewCount + 1;
        sessionStorage.setItem('pagesViewed', this.pagesViewed.toString());

        // セッション開始時刻を保存
        if (!sessionStorage.getItem('sessionStartTime')) {
            sessionStorage.setItem('sessionStartTime', this.sessionStartTime.toString());
        } else {
            this.sessionStartTime = parseInt(sessionStorage.getItem('sessionStartTime'));
        }
    }

    setupEventListeners() {
        // Size selection
        const sizeOptions = document.querySelectorAll('input[name="size"]');
        sizeOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                this.selectedSize = e.target.value;
                this.selectedPrice = parseInt(e.target.dataset.price);
                this.updateTotalPrice();
            });
        });

        // Quantity input
        const quantityInput = document.getElementById('quantity');
        if (quantityInput) {
            quantityInput.addEventListener('input', (e) => {
                this.quantity = Math.max(1, parseInt(e.target.value) || 1);
                e.target.value = this.quantity;
                this.updateTotalPrice();
            });
        }

        // Proceed to payment button
        const proceedBtn = document.getElementById('proceed-to-payment');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                this.proceedToPayment();
            });
        }

        // Payment form
        const paymentForm = document.getElementById('payment-form');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitOrder();
            });
        }

        // Success modal close button
        const closeSuccessBtn = document.getElementById('close-success');
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                window.ModalManager.hide('success-modal');
                this.resetAfterOrder();
            });
        }
    }

    updateTotalPrice() {
        const totalPrice = this.selectedPrice * this.quantity;
        const totalPriceElement = document.getElementById('total-price');
        if (totalPriceElement) {
            totalPriceElement.textContent = `¥${totalPrice.toLocaleString()}`;
        }
    }

    proceedToPayment() {
        // Check if image is uploaded
        if (!window.imageEditor || !window.imageEditor.hasImage()) {
            alert('画像をアップロードしてください。');
            return;
        }

        // Update order summary in modal
        const sizeNames = {
            card: 'カードサイズ',
            postcard: 'はがきサイズ',
            a5: 'A5サイズ',
            a4: 'A4サイズ'
        };

        const summarySize = document.getElementById('summary-size');
        const summaryQuantity = document.getElementById('summary-quantity');
        const summaryTotal = document.getElementById('summary-total');

        if (summarySize) {
            summarySize.textContent = sizeNames[this.selectedSize];
        }
        if (summaryQuantity) {
            summaryQuantity.textContent = `${this.quantity}個`;
        }
        if (summaryTotal) {
            const totalPrice = this.selectedPrice * this.quantity;
            summaryTotal.textContent = `¥${totalPrice.toLocaleString()}`;
        }

        // Show payment modal
        window.ModalManager.show('payment-modal');
    }

    async submitOrder() {
        console.log('[Payment] submitOrder called');
        
        // Get form data
        const customerName = document.getElementById('customer-name').value;
        const customerEmail = document.getElementById('customer-email').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerAddress = document.getElementById('customer-address').value;

        console.log('[Payment] Form data:', { customerName, customerEmail, customerPhone });

        // Validate form
        if (!customerName || !customerEmail || !customerPhone || !customerAddress) {
            alert('すべての項目を入力してください。');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            alert('有効なメールアドレスを入力してください。');
            return;
        }

        // Phone validation (Japanese format)
        // Accepts formats like: 03-1234-5678, 090-1234-5678, 0312345678, etc.
        const phoneRegex = /^[\d\-\(\)\s]{10,}$/;
        if (!phoneRegex.test(customerPhone) || customerPhone.replace(/\D/g, '').length < 10) {
            alert('有効な電話番号を入力してください（10桁以上の数字）。');
            return;
        }

        // Disable submit button
        const submitBtn = document.querySelector('#payment-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '処理中...';
        }

        try {
            // Upload image first
            let imagePath = null;
            const imageData = window.imageEditor.getImageData();
            
            console.log('[Payment] Image data obtained, length:', imageData ? imageData.length : 0);
            
            if (imageData) {
                console.log('[Payment] Starting image upload...');
                imagePath = await this.uploadImage(imageData);
                console.log('[Payment] Image upload completed, path:', imagePath);
            }

            // Collect analytics data
            const analytics = this.collectAnalyticsData();
            console.log('[Payment] Analytics data collected:', analytics);

            // Create order object for API
            const orderData = {
                customer: {
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone,
                    address: customerAddress
                },
                order_details: {
                    product_size: this.selectedSize,
                    base_design: window.imageEditor.getBaseType(),
                    quantity: this.quantity,
                    price: this.selectedPrice,
                    image_path: imagePath,
                    image_data: imageData
                },
                payment: {
                    payment_status: 'pending',
                    amount: this.selectedPrice * this.quantity
                },
                analytics: analytics
            };

            // Submit order to backend API
            console.log('[Payment] Submitting order to backend API...');
            const result = await this.submitToBackend(orderData);

            if (result.success) {
                console.log('[Payment] Order submitted successfully:', result);
                
                // Add to gallery
                if (window.galleryManager) {
                    window.galleryManager.addItem({
                        imageData: imageData,
                        size: this.selectedSize,
                        baseType: window.imageEditor.getBaseType()
                    });
                }

                // Hide payment modal
                window.ModalManager.hide('payment-modal');

                // Show success modal
                window.ModalManager.show('success-modal');

                console.log('Order submitted successfully:', result);
            } else {
                throw new Error(result.error || '注文の送信に失敗しました');
            }

        } catch (error) {
            console.error('[Payment] Order submission error:', error);
            console.error('[Payment] Error type:', error.name);
            console.error('[Payment] Error message:', error.message);
            
            // Provide more detailed error messages to users
            let userMessage = '注文を保存しました（オフラインモード）。後ほど管理者が確認します。';
            
            if (error.message.includes('HTTP 405')) {
                userMessage = 'APIエンドポイントへのアクセスに問題があります。オフラインモードで注文を保存しました。';
                console.error('[Payment] HTTP 405 error - Method not allowed. Check API endpoint configuration.');
            } else if (error.message.includes('HTTP 404')) {
                userMessage = 'APIが見つかりません。オフラインモードで注文を保存しました。';
                console.error('[Payment] HTTP 404 error - API endpoint not found.');
            } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                userMessage = 'ネットワークエラーが発生しました。オフラインモードで注文を保存しました。';
                console.error('[Payment] Network error - Could not connect to API.');
            }
            
            // Fallback to localStorage if API fails
            const fallbackOrder = {
                id: `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                imageData: window.imageEditor.getImageData(),
                size: this.selectedSize,
                baseType: window.imageEditor.getBaseType(),
                quantity: this.quantity,
                price: this.selectedPrice,
                totalPrice: this.selectedPrice * this.quantity,
                customer: {
                    name: customerName,
                    email: customerEmail,
                    phone: customerPhone,
                    address: customerAddress
                },
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            
            this.saveToLocalStorage(fallbackOrder);
            console.log('[Payment] Order saved to localStorage:', fallbackOrder.id);
            
            // Add to gallery
            if (window.galleryManager) {
                window.galleryManager.addItem({
                    imageData: fallbackOrder.imageData,
                    size: fallbackOrder.size,
                    baseType: fallbackOrder.baseType
                });
            }

            // Hide payment modal
            window.ModalManager.hide('payment-modal');

            // Show success modal
            window.ModalManager.show('success-modal');

            alert(userMessage);
        } finally {
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '注文を確定する';
            }
        }
    }

    /**
     * 画像をサーバーにアップロード
     * @param {string} imageData Base64 画像データ
     * @returns {Promise<string|null>} アップロードされた画像のパス
     */
    async uploadImage(imageData) {
        console.log('[Payment] Starting image upload...');
        try {
            // Base64 を Blob に変換
            const blob = await this.base64ToBlob(imageData);
            console.log('[Payment] Converted to blob, size:', blob.size);
            
            // FormData を作成
            const formData = new FormData();
            formData.append('image', blob, 'design.png');

            console.log('[Payment] Sending POST request to api/upload.php...');
            // API にアップロード
            const response = await fetch('api/upload.php', {
                method: 'POST',
                body: formData
            });

            console.log('[Payment] Upload response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Payment] Upload failed with status:', response.status, 'Response:', errorText);
                throw new Error(`アップロードに失敗しました (HTTP ${response.status})`);
            }

            const result = await response.json();
            console.log('[Payment] Upload response:', result);

            if (result.success) {
                console.log('[Payment] Image uploaded successfully:', result.file.path);
                return result.file.path;
            } else {
                throw new Error(result.error || 'アップロードに失敗しました');
            }
        } catch (error) {
            console.error('[Payment] Image upload error:', error);
            console.error('[Payment] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            return null;
        }
    }

    /**
     * Base64 を Blob に変換
     * @param {string} base64 Base64 文字列
     * @returns {Promise<Blob>} Blob オブジェクト
     */
    async base64ToBlob(base64) {
        const response = await fetch(base64);
        return await response.blob();
    }

    /**
     * 分析データを収集
     * @returns {Object} 分析データ
     */
    collectAnalyticsData() {
        // デバイスタイプの判定
        const deviceType = this.getDeviceType();

        // ブラウザ情報の取得
        const browser = navigator.userAgent;

        // セッション時間の計算（秒）
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

        // リファラの取得
        const referrer = document.referrer || 'direct';

        return {
            device_type: deviceType,
            browser: browser,
            session_duration: sessionDuration,
            referrer: referrer,
            pages_viewed: this.pagesViewed
        };
    }

    /**
     * デバイスタイプを判定
     * @returns {string} デバイスタイプ (mobile, tablet, desktop)
     */
    getDeviceType() {
        const width = window.innerWidth;
        if (width < 768) {
            return 'mobile';
        } else if (width < 1280) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * バックエンドAPIに注文を送信
     * @param {Object} orderData 注文データ
     * @returns {Promise<Object>} API レスポンス
     */
    async submitToBackend(orderData) {
        console.log('[Payment] Submitting order to backend...');
        console.log('[Payment] Order data:', JSON.stringify(orderData, null, 2));
        
        try {
            const response = await fetch('api/orders.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            console.log('[Payment] Order submission response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Payment] Order submission failed:', response.status, 'Response:', errorText);
                throw new Error(`注文の送信に失敗しました (HTTP ${response.status})`);
            }

            const result = await response.json();
            console.log('[Payment] Order submission result:', result);
            
            if (!result.success) {
                throw new Error(result.error || '注文の送信に失敗しました');
            }

            return result;
        } catch (error) {
            console.error('[Payment] submitToBackend error:', error);
            console.error('[Payment] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw error;
        }
    }

    /**
     * LocalStorage に保存（バックエンドが利用できない場合の予備手段）
     * @param {Object} order 注文オブジェクト
     */
    saveToLocalStorage(order) {
        const storageKey = 'acrylicStandOrders';
        const orders = this.getOrders();
        orders.push(order);
        localStorage.setItem(storageKey, JSON.stringify(orders));
    }

    getOrders() {
        const storageKey = 'acrylicStandOrders';
        const orders = localStorage.getItem(storageKey);
        return orders ? JSON.parse(orders) : [];
    }

    resetAfterOrder() {
        // Reset form
        const paymentForm = document.getElementById('payment-form');
        if (paymentForm) {
            paymentForm.reset();
        }

        // Reset editor
        if (window.imageEditor) {
            window.imageEditor.reset();
        }

        // Reset quantity
        this.quantity = 1;
        const quantityInput = document.getElementById('quantity');
        if (quantityInput) {
            quantityInput.value = 1;
        }

        // Reset size selection to default
        const firstSizeOption = document.querySelector('input[name="size"]');
        if (firstSizeOption) {
            firstSizeOption.checked = true;
            this.selectedSize = firstSizeOption.value;
            this.selectedPrice = parseInt(firstSizeOption.dataset.price);
        }

        // Update total price
        this.updateTotalPrice();

        // Scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Initialize order manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.orderManager = new OrderManager();
});
