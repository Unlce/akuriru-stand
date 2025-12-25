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
                // Note: 405 (Method Not Allowed) or 200 both indicate the endpoint exists
                const uploadCheck = await fetch('api/upload.php', { method: 'OPTIONS' });
                const uploadAvailable = uploadCheck.status === 200 || uploadCheck.status === 405;
                console.log('[Payment] upload.php availability:', uploadCheck.status, uploadCheck.statusText, uploadAvailable ? '✓' : '✗');
                
                // Check orders.php with OPTIONS request
                const ordersCheck = await fetch('api/orders.php', { method: 'OPTIONS' });
                const ordersAvailable = ordersCheck.status === 200 || ordersCheck.status === 405;
                console.log('[Payment] orders.php availability:', ordersCheck.status, ordersCheck.statusText, ordersAvailable ? '✓' : '✗');
                
                if (uploadAvailable && ordersAvailable) {
                    console.log('[Payment] ✓ Both API endpoints are accessible');
                } else {
                    console.warn('[Payment] ⚠ Some API endpoints may not be accessible');
                    if (!uploadAvailable) console.warn('[Payment]   - upload.php is not accessible');
                    if (!ordersAvailable) console.warn('[Payment]   - orders.php is not accessible');
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
        
        // Check network status
        if (window.networkMonitor && !window.networkMonitor.checkConnection()) {
            window.toastManager.error('インターネット接続がありません。接続を確認してください。');
            return;
        }

        // Get form data
        const customerName = document.getElementById('customer-name').value;
        const customerEmail = document.getElementById('customer-email').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerAddress = document.getElementById('customer-address').value;
        const customerPostalCode = document.getElementById('customer-postal-code')?.value || '';
        const specialRequest = document.getElementById('special-request')?.value || '';

        console.log('[Payment] Form data:', { customerName, customerEmail, customerPhone });

        // Validate form
        if (!customerName || !customerEmail || !customerPhone || !customerAddress) {
            window.toastManager.warning('すべての必須項目を入力してください。');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            window.toastManager.warning('有効なメールアドレスを入力してください。');
            return;
        }

        // Phone validation (Japanese format)
        const phoneRegex = /^[\d\-\(\)\s]{10,}$/;
        if (!phoneRegex.test(customerPhone) || customerPhone.replace(/\D/g, '').length < 10) {
            window.toastManager.warning('有効な電話番号を入力してください（10桁以上の数字）。');
            return;
        }

        // Get payment method
        const paymentMethod = this.getSelectedPaymentMethod();
        if (!paymentMethod) {
            window.toastManager.warning('お支払い方法を選択してください。');
            return;
        }

        // Prepare order data for confirmation
        const imageData = window.imageEditor.getImageData();
        const orderData = {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: customerAddress,
            postalCode: customerPostalCode,
            baseType: window.imageEditor.getBaseType(),
            size: this.selectedSize,
            quantity: this.quantity,
            price: this.selectedPrice,
            totalPrice: this.selectedPrice * this.quantity,
            paymentMethod: paymentMethod,
            specialRequest: specialRequest,
            imagePreview: imageData
        };

        // Show confirmation modal
        window.orderConfirmationModal.show(
            orderData,
            () => this.confirmAndSubmit(orderData, imageData),
            () => {
                window.toastManager.info('注文内容を修正してください。');
            }
        );
    }

    async confirmAndSubmit(orderData, imageData) {
        // Show loading
        window.loadingManager.show('注文を処理中...');

        // Mark session as having changes
        if (window.sessionProtector) {
            window.sessionProtector.markAsChanged();
        }

        // Mark session as having changes
        if (window.sessionProtector) {
            window.sessionProtector.markAsChanged();
        }

        try {
            // Upload image first
            let imagePath = null;
            
            console.log('[Payment] Image data obtained, length:', imageData ? imageData.length : 0);
            
            if (imageData) {
                console.log('[Payment] Starting image upload...');
                window.loadingManager.show('画像をアップロード中...');
                imagePath = await this.uploadImage(imageData);
                console.log('[Payment] Image upload completed, path:', imagePath);
            }

            // Collect analytics data
            window.loadingManager.show('注文データを準備中...');
            const analytics = this.collectAnalyticsData();
            console.log('[Payment] Analytics data collected:', analytics);

            // Create order object for API
            const apiOrderData = {
                customer: {
                    name: orderData.name,
                    email: orderData.email,
                    phone: orderData.phone,
                    address: orderData.address,
                    postal_code: orderData.postalCode
                },
                order_details: {
                    product_size: this.selectedSize,
                    base_design: orderData.baseType,
                    quantity: this.quantity,
                    price: this.selectedPrice,
                    image_path: imagePath,
                    image_data: imageData,
                    special_request: orderData.specialRequest
                },
                payment: {
                    payment_status: 'pending',
                    payment_method: orderData.paymentMethod,
                    amount: this.selectedPrice * this.quantity
                },
                analytics: analytics
            };

            // Submit order to backend API
            console.log('[Payment] Submitting order to backend API...');
            window.loadingManager.show('注文を送信中...');
            const result = await this.submitToBackend(apiOrderData);

            if (result.success) {
                console.log('[Payment] Order submitted successfully:', result);
                
                // Mark as saved
                if (window.sessionProtector) {
                    window.sessionProtector.markAsSaved();
                }

                window.toastManager.success('注文が正常に送信されました！', '成功');

                // Check if payment integration is enabled
                const paymentMethod = orderData.paymentMethod;
                
                if (paymentMethod === 'credit' || paymentMethod === 'paypay') {
                    console.log('[Payment] Initiating payment with:', paymentMethod);
                    window.loadingManager.show('決済ページに移動中...');
                    await this.initiatePayment(result.order_id, paymentMethod);
                } else {
                    // No payment integration - show success directly
                    window.loadingManager.hide();
                    
                    // Add to gallery
                    if (window.galleryManager) {
                        window.galleryManager.addItem({
                            imageData: imageData,
                            size: this.selectedSize,
                            baseType: orderData.baseType
                        });
                    }

                    // Hide payment modal
                    window.ModalManager.hide('payment-modal');

                    // Show success modal
                    window.ModalManager.show('success-modal');
                    
                    window.toastManager.success(`注文番号: ${result.order_id}`, '注文完了');
                }

            } else {
                throw new Error(result.error || '注文の送信に失敗しました');
            }

        } catch (error) {
            console.error('[Payment] Order submission error:', error);
            window.loadingManager.hide();
            
            // Provide more detailed error messages to users
            let userMessage = '注文の送信に失敗しました。';
            let shouldFallback = false;
            
            if (error.message.includes('HTTP 405')) {
                userMessage = 'サーバーとの通信に問題が発生しました。';
                shouldFallback = true;
            } else if (error.message.includes('HTTP 404')) {
                userMessage = 'サーバーが見つかりません。';
                shouldFallback = true;
            } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                userMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
                shouldFallback = true;
            }
            
            window.toastManager.error(userMessage + ' もう一度お試しください。', 'エラー');
            
            if (shouldFallback) {
                // Fallback to localStorage if API fails
                const fallbackOrder = {
                    id: `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    imageData: imageData,
                    size: this.selectedSize,
                    baseType: orderData.baseType,
                    quantity: this.quantity,
                    price: this.selectedPrice,
                    totalPrice: this.selectedPrice * this.quantity,
                    customer: orderData,
                    createdAt: new Date().toISOString(),
                    status: 'pending'
                };
                
                this.saveToLocalStorage(fallbackOrder);
                console.log('[Payment] Order saved to localStorage:', fallbackOrder.id);
                window.toastManager.info('注文をローカルに保存しました。後ほど再送信してください。', 'オフライン保存');
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
            
            // Clone response before consuming it for error handling
            const responseClone = response.clone();
            
            if (!response.ok) {
                let errorMessage = `アップロードに失敗しました (HTTP ${response.status})`;
                try {
                    const result = await responseClone.json();
                    if (result.error) {
                        errorMessage = result.error;
                    }
                    console.error('[Payment] Upload failed with JSON error:', result);
                } catch (e) {
                    // If JSON parsing fails, get status text
                    console.error('[Payment] Upload failed, status:', response.status, response.statusText);
                }
                throw new Error(errorMessage);
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
     * Get selected payment method from form
     */
    getSelectedPaymentMethod() {
        const paymentMethodInput = document.querySelector('input[name="payment-method"]:checked');
        return paymentMethodInput ? paymentMethodInput.value : null;
    }

    /**
     * Initiate payment with selected provider
     */
    async initiatePayment(orderId, paymentMethod) {
        try {
            const totalAmount = this.selectedPrice * this.quantity;
            
            console.log('[Payment] Creating payment session...');
            const response = await fetch('api/create-payment.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    order_id: orderId,
                    amount: totalAmount,
                    payment_method: paymentMethod,
                    currency: 'jpy'
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || '決済セッションの作成に失敗しました');
            }

            console.log('[Payment] Payment session created:', result.payment_data);

            if (paymentMethod === 'stripe') {
                // Redirect to Stripe Checkout
                if (result.payment_data.checkout_url) {
                    window.location.href = result.payment_data.checkout_url;
                } else if (window.Stripe && result.payment_data.public_key) {
                    // Use Stripe.js for embedded checkout
                    const stripe = window.Stripe(result.payment_data.public_key);
                    await stripe.redirectToCheckout({
                        sessionId: result.payment_data.session_id
                    });
                }
            } else if (paymentMethod === 'paypay') {
                // Redirect to PayPay or show QR code
                if (result.payment_data.deeplink) {
                    // Try to open PayPay app
                    window.location.href = result.payment_data.deeplink;
                    
                    // Fallback to QR code display after 2 seconds
                    setTimeout(() => {
                        this.showPayPayQRCode(result.payment_data);
                    }, 2000);
                } else if (result.payment_data.payment_url) {
                    window.location.href = result.payment_data.payment_url;
                }
            }

        } catch (error) {
            console.error('[Payment] Payment initiation error:', error);
            alert('決済の開始に失敗しました: ' + error.message);
            
            // Re-enable submit button
            const submitBtn = document.querySelector('#payment-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '注文を確定';
            }
        }
    }

    /**
     * Show PayPay QR code modal
     */
    showPayPayQRCode(paymentData) {
        // Create QR code modal (simplified - in production use QR code library)
        const modal = document.createElement('div');
        modal.className = 'paypay-qr-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>PayPay QRコード</h3>
                <p>PayPayアプリでこのQRコードをスキャンしてください</p>
                <div class="qr-code-placeholder">
                    <p>QR Code: ${paymentData.session_id}</p>
                    <p><a href="${paymentData.payment_url}" target="_blank">PayPayで支払う</a></p>
                </div>
                <p class="qr-expires">有効期限: ${new Date(paymentData.expires_at * 1000).toLocaleString('ja-JP')}</p>
                <button onclick="this.parentElement.parentElement.remove()">閉じる</button>
            </div>
        `;
        document.body.appendChild(modal);
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
            
            // Clone response before consuming it for error handling
            const responseClone = response.clone();
            
            if (!response.ok) {
                let errorMessage = `注文の送信に失敗しました (HTTP ${response.status})`;
                try {
                    const result = await responseClone.json();
                    if (result.error) {
                        errorMessage = result.error;
                    }
                    console.error('[Payment] Order submission failed with JSON error:', result);
                } catch (e) {
                    // If JSON parsing fails, get status text
                    console.error('[Payment] Order submission failed, status:', response.status, response.statusText);
                }
                throw new Error(errorMessage);
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
