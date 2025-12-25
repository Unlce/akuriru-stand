/**
 * Admin Panel JavaScript
 * Acrylic Stand Shop
 */

// API endpoint
const API_BASE = '../api';

// Status labels
const STATUS_LABELS = {
    'pending': 'New',
    'processing': 'Processing',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
};

const STATUS_CLASSES = {
    'pending': 'status-pending',
    'processing': 'status-processing',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
};

// Size labels
const SIZE_LABELS = {
    'card': 'Card Size',
    'small': 'Small',
    'medium': 'Medium',
    'large': 'Large'
};

// Base labels
const BASE_LABELS = {
    'default': 'Standard',
    'premium': 'Premium',
    'none': 'None'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadOrders, 300));
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadOrders);
    }
    
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }
    
    const modal = document.getElementById('orderDetailModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal();
            }
        });
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadOrders() {
    const loading = document.getElementById('loading');
    const tbody = document.querySelector('#ordersTable tbody');
    
    if (loading) loading.style.display = 'block';
    
    try {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        
        let url = API_BASE + '/orders.php?limit=50&offset=0';
        
        if (statusFilter && statusFilter.value) {
            url += '&status=' + encodeURIComponent(statusFilter.value);
        }
        
        if (searchInput && searchInput.value.trim()) {
            url += '&search=' + encodeURIComponent(searchInput.value.trim());
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (loading) loading.style.display = 'none';
        
        if (data.success && data.orders) {
            renderOrders(data.orders);
            updateStats(data.total || data.orders.length);
        } else {
            showEmptyState('Failed to load orders');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        if (loading) loading.style.display = 'none';
        showEmptyState('Error: ' + error.message);
    }
}

function renderOrders(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    
    if (!orders || orders.length === 0) {
        showEmptyState('No orders yet');
        return;
    }
    
    let html = '';
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const imgHtml = order.image_path 
            ? '<img src="../' + order.image_path + '" alt="Product" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="showImagePreview(\x27../' + order.image_path + '\x27)">'
            : '<span style="color: #999;">None</span>';
        
        html += '<tr>';
        html += '<td><strong>' + escapeHtml(order.order_number || order.id) + '</strong></td>';
        html += '<td>' + formatDate(order.created_at) + '</td>';
        html += '<td>' + escapeHtml(order.customer_name || 'N/A') + '<br><small style="color: #666;">' + escapeHtml(order.customer_email || '') + '</small></td>';
        html += '<td>' + imgHtml + '</td>';
        html += '<td>' + (SIZE_LABELS[order.size] || order.size || 'N/A') + '</td>';
        html += '<td>' + (BASE_LABELS[order.base_type] || order.base_type || 'N/A') + '</td>';
        html += '<td>Y' + formatNumber(order.total_price || order.price || 0) + '</td>';
        html += '<td><span class="status-badge ' + (STATUS_CLASSES[order.status] || 'status-pending') + '">' + (STATUS_LABELS[order.status] || order.status || 'New') + '</span></td>';
        html += '<td><button class="btn btn-small btn-primary" onclick="showOrderDetail(\x27' + order.id + '\x27)">Detail</button> ';
        html += '<button class="btn btn-small btn-secondary" onclick="updateOrderStatus(\x27' + order.id + '\x27)">Update</button></td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function showEmptyState(message) {
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><div class="empty-state-icon">-</div><div class="empty-state-text">' + escapeHtml(message) + '</div></td></tr>';
}

function updateStats(total) {
    const totalOrders = document.getElementById('totalOrders');
    if (totalOrders) {
        totalOrders.textContent = total;
    }
}

async function showOrderDetail(orderId) {
    const modal = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderDetailContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
    modal.style.display = 'flex';
    
    try {
        const response = await fetch(API_BASE + '/orders.php?id=' + orderId);
        const data = await response.json();
        
        if (data.success && data.orders && data.orders.length > 0) {
            const order = data.orders[0];
            let html = '<div class="order-detail">';
            html += '<div class="detail-section"><h3>Order Info</h3>';
            html += '<p><strong>Order Number:</strong> ' + escapeHtml(order.order_number || order.id) + '</p>';
            html += '<p><strong>Date:</strong> ' + formatDate(order.created_at) + '</p>';
            html += '<p><strong>Status:</strong> <span class="status-badge ' + STATUS_CLASSES[order.status] + '">' + (STATUS_LABELS[order.status] || order.status) + '</span></p></div>';
            html += '<div class="detail-section"><h3>Customer Info</h3>';
            html += '<p><strong>Name:</strong> ' + escapeHtml(order.customer_name || 'N/A') + '</p>';
            html += '<p><strong>Email:</strong> ' + escapeHtml(order.customer_email || 'N/A') + '</p>';
            html += '<p><strong>Phone:</strong> ' + escapeHtml(order.customer_phone || 'N/A') + '</p></div>';
            html += '<div class="detail-section"><h3>Product Info</h3>';
            html += '<p><strong>Size:</strong> ' + (SIZE_LABELS[order.size] || order.size || 'N/A') + '</p>';
            html += '<p><strong>Base:</strong> ' + (BASE_LABELS[order.base_type] || order.base_type || 'N/A') + '</p>';
            html += '<p><strong>Quantity:</strong> ' + (order.quantity || 1) + '</p>';
            html += '<p><strong>Price:</strong> Y' + formatNumber(order.total_price || order.price || 0) + '</p></div>';
            if (order.image_path) {
                html += '<div class="detail-section"><h3>Product Image</h3>';
                html += '<img src="../' + order.image_path + '" alt="Product" style="max-width: 200px; border-radius: 8px;"></div>';
            }
            html += '</div>';
            content.innerHTML = html;
        } else {
            content.innerHTML = '<p>Order not found.</p>';
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
        content.innerHTML = '<p>Error loading order.</p>';
    }
}

function hideModal() {
    const modal = document.getElementById('orderDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function updateOrderStatus(orderId) {
    const newStatus = prompt('Enter new status:\n- pending (New)\n- processing (Processing)\n- completed (Completed)\n- cancelled (Cancelled)');
    
    if (!newStatus || ['pending', 'processing', 'completed', 'cancelled'].indexOf(newStatus) === -1) {
        if (newStatus !== null) {
            alert('Invalid status.');
        }
        return;
    }
    
    try {
        const response = await fetch(API_BASE + '/orders.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: orderId,
                status: newStatus
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Status updated.');
            loadOrders();
        } else {
            alert('Update failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error occurred.');
    }
}

function showImagePreview(imagePath) {
    window.open(imagePath, '_blank');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    return Number(num).toLocaleString('ja-JP');
}
