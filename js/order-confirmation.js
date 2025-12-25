// Order confirmation modal

class OrderConfirmationModal {
    constructor() {
        this.modal = null;
        this.onConfirm = null;
        this.onEdit = null;
    }

    show(orderData, onConfirm, onEdit) {
        this.onConfirm = onConfirm;
        this.onEdit = onEdit;
        this.createModal(orderData);
        document.body.appendChild(this.modal);
        
        // Show with animation
        setTimeout(() => {
            this.modal.classList.add('show');
        }, 10);
    }

    hide() {
        this.modal.classList.remove('show');
        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
        }, 300);
    }

    createModal(orderData) {
        this.modal = document.createElement('div');
        this.modal.className = 'order-confirmation-modal';
        
        const baseTypeNames = {
            'square': '正方形',
            'rectangle': '長方形',
            'circle': '円形',
            'heart': 'ハート形',
            'star': '星形'
        };

        const sizeNames = {
            'small': '小（10cm）',
            'medium': '中（15cm）',
            'large': '大（20cm）'
        };

        const paymentMethodNames = {
            'credit': 'クレジットカード（Stripe）',
            'paypay': 'PayPay'
        };

        this.modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>ご注文内容の確認</h2>
                    <button class="modal-close">×</button>
                </div>
                
                <div class="modal-body">
                    <div class="confirmation-section">
                        <h3>お客様情報</h3>
                        <div class="confirmation-grid">
                            <div class="confirmation-item">
                                <span class="item-label">お名前:</span>
                                <span class="item-value">${this.escapeHtml(orderData.name)}</span>
                            </div>
                            <div class="confirmation-item">
                                <span class="item-label">メールアドレス:</span>
                                <span class="item-value">${this.escapeHtml(orderData.email)}</span>
                            </div>
                            <div class="confirmation-item">
                                <span class="item-label">電話番号:</span>
                                <span class="item-value">${this.escapeHtml(orderData.phone)}</span>
                            </div>
                            <div class="confirmation-item full-width">
                                <span class="item-label">お届け先住所:</span>
                                <span class="item-value">
                                    〒${this.escapeHtml(orderData.postalCode)}<br>
                                    ${this.escapeHtml(orderData.address)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="confirmation-section">
                        <h3>商品情報</h3>
                        <div class="confirmation-grid">
                            <div class="confirmation-item">
                                <span class="item-label">形状:</span>
                                <span class="item-value">${baseTypeNames[orderData.baseType] || orderData.baseType}</span>
                            </div>
                            <div class="confirmation-item">
                                <span class="item-label">サイズ:</span>
                                <span class="item-value">${sizeNames[orderData.size] || orderData.size}</span>
                            </div>
                            <div class="confirmation-item">
                                <span class="item-label">数量:</span>
                                <span class="item-value">${orderData.quantity}個</span>
                            </div>
                            <div class="confirmation-item">
                                <span class="item-label">単価:</span>
                                <span class="item-value">¥${orderData.price.toLocaleString()}</span>
                            </div>
                            <div class="confirmation-item full-width">
                                <span class="item-label">合計金額:</span>
                                <span class="item-value total-price">¥${orderData.totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    ${orderData.imagePreview ? `
                    <div class="confirmation-section">
                        <h3>デザインプレビュー</h3>
                        <div class="image-preview-container">
                            <img src="${orderData.imagePreview}" alt="デザインプレビュー" class="order-image-preview">
                        </div>
                    </div>
                    ` : ''}

                    <div class="confirmation-section">
                        <h3>お支払い方法</h3>
                        <div class="confirmation-grid">
                            <div class="confirmation-item full-width">
                                <span class="item-label">決済方法:</span>
                                <span class="item-value">${paymentMethodNames[orderData.paymentMethod] || orderData.paymentMethod}</span>
                            </div>
                        </div>
                    </div>

                    ${orderData.specialRequest ? `
                    <div class="confirmation-section">
                        <h3>特記事項</h3>
                        <div class="confirmation-grid">
                            <div class="confirmation-item full-width">
                                <p class="special-request">${this.escapeHtml(orderData.specialRequest)}</p>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="confirmation-notice">
                        <p>⚠️ 注文を確定すると、お支払いページに移動します。</p>
                        <p>内容に誤りがないかご確認ください。</p>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" id="editOrderBtn">内容を修正</button>
                    <button class="btn btn-primary" id="confirmOrderBtn">注文を確定する</button>
                </div>
            </div>
        `;

        // Event listeners
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.hide());
        this.modal.querySelector('.modal-overlay').addEventListener('click', () => this.hide());
        this.modal.querySelector('#editOrderBtn').addEventListener('click', () => {
            this.hide();
            if (this.onEdit) this.onEdit();
        });
        this.modal.querySelector('#confirmOrderBtn').addEventListener('click', () => {
            this.hide();
            if (this.onConfirm) this.onConfirm();
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize global instance
window.addEventListener('DOMContentLoaded', () => {
    window.orderConfirmationModal = new OrderConfirmationModal();
    console.log('[OrderConfirmation] Modal initialized');
});
