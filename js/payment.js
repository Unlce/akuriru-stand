// Payment and Order Management

class OrderManager {
    constructor() {
        this.selectedSize = 'card';
        this.selectedPrice = 1000;
        this.quantity = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateTotalPrice();
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

    submitOrder() {
        // Get form data
        const customerName = document.getElementById('customer-name').value;
        const customerEmail = document.getElementById('customer-email').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerAddress = document.getElementById('customer-address').value;

        // Validate form
        if (!customerName || !customerEmail || !customerPhone || !customerAddress) {
            alert('すべての項目を入力してください。');
            return;
        }

        // Create order object
        const order = {
            id: Date.now(),
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

        // Save order (in real app, this would be sent to server)
        this.saveOrder(order);

        // Add to gallery
        if (window.galleryManager) {
            window.galleryManager.addItem({
                imageData: order.imageData,
                size: order.size,
                baseType: order.baseType
            });
        }

        // Hide payment modal
        window.ModalManager.hide('payment-modal');

        // Show success modal
        window.ModalManager.show('success-modal');

        // In a real application, this would redirect to PayPay payment page
        console.log('Order submitted:', order);
    }

    saveOrder(order) {
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
