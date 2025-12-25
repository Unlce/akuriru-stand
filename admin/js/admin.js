/**
 * Admin Panel JavaScript
 * Acrylic Stand Shop
 */

// API endpoint
const API_BASE = '../api';

// Status labels
const STATUS_LABELS = {
    'pending': '新規',
    'paid': '決済確認済',
    'processing': '処理中',
    'shipped': '発送済',
    'completed': '完了',
    'cancelled': 'キャンセル'
};

const STATUS_CLASSES = {
    'pending': 'status-pending',
    'paid': 'status-paid',
    'processing': 'status-processing',
    'shipped': 'status-shipped',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
};

// Size labels
const SIZE_LABELS = {
    'card': 'カードサイズ',
    'postcard': 'はがきサイズ',
    'a5': 'A5サイズ',
    'a4': 'A4サイズ'
};

// Global state
let allOrders = [];
let filteredOrders = [];

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
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }

    // Date filters
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    if (dateFrom) dateFrom.addEventListener('change', applyFilters);
    if (dateTo) dateTo.addEventListener('change', applyFilters);

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);

    // CSV export
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

    // Select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.order-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }

    // Bulk actions
    const bulkApplyBtn = document.getElementById('bulkApplyBtn');
    if (bulkApplyBtn) bulkApplyBtn.addEventListener('click', applyBulkAction);

    // Image modal
    const modal = document.getElementById('imageModal');
    const closeBtn = modal?.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    if (modal) {
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };
    }

    // Order detail modal
    const detailModal = document.getElementById('orderDetailModal');
    const detailCloseBtn = detailModal?.querySelector('.close-modal');
    if (detailCloseBtn) {
        detailCloseBtn.addEventListener('click', hideModal);
    }
    if (detailModal) {
        detailModal.addEventListener('click', function(e) {
            if (e.target === detailModal) {
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
        let url = API_BASE + '/orders.php?limit=1000&offset=0';
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (loading) loading.style.display = 'none';
        
        if (data.success && data.orders) {
            allOrders = data.orders;
            filteredOrders = allOrders;
            renderOrders(allOrders);
            updateStatistics(allOrders);
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
        showEmptyState('注文がありません');
        return;
    }
    
    let html = '';
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const imgHtml = order.image_path 
            ? `<img src="../${order.image_path}" alt="Product" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="showImagePreview('${order.image_path}')">`
            : '<span style="color: #999;">なし</span>';
        
        html += '<tr>';
        html += `<td><input type="checkbox" class="order-checkbox" data-order-id="${order.id}"></td>`;
        html += '<td><strong>' + escapeHtml(order.order_number || order.id) + '</strong></td>';
        html += '<td>' + formatDate(order.created_at) + '</td>';
        html += '<td>' + escapeHtml(order.customer_name || 'N/A') + '<br><small style="color: #666;">' + escapeHtml(order.customer_email || '') + '</small></td>';
        html += '<td>' + imgHtml + '</td>';
        html += '<td>' + (SIZE_LABELS[order.size] || order.size || 'N/A') + '</td>';
        html += '<td>' + (order.quantity || 1) + '</td>';
        html += '<td>¥' + formatNumber(order.total_price || order.price || 0) + '</td>';
        html += '<td><span class="status-badge ' + (STATUS_CLASSES[order.status] || 'status-pending') + '">' + (STATUS_LABELS[order.status] || order.status || '新規') + '</span></td>';
        html += `<td>
            <button class="btn btn-small btn-primary" onclick="showOrderDetail('${order.id}')">詳細</button>
            <button class="btn btn-small btn-secondary" onclick="updateOrderStatus('${order.id}')">更新</button>
            <button class="btn btn-small btn-info" onclick="downloadPrintData('${order.id}')">印刷データ</button>
        </td>`;
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function showEmptyState(message) {
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">' + escapeHtml(message) + '</div></td></tr>';
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

// 統計を更新
function updateStatistics(orders) {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;

    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('totalRevenue').textContent = `¥${totalRevenue.toLocaleString()}`;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('completedOrders').textContent = completedOrders;
}

// フィルターを適用
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    filteredOrders = allOrders.filter(order => {
        // 検索フィルター
        if (searchTerm) {
            const matchesSearch = 
                order.order_number?.toLowerCase().includes(searchTerm) ||
                order.customer_name?.toLowerCase().includes(searchTerm) ||
                order.customer_email?.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
        }

        // 日付フィルター
        if (dateFrom) {
            const orderDate = order.created_at?.split(' ')[0];
            if (orderDate < dateFrom) return false;
        }
        if (dateTo) {
            const orderDate = order.created_at?.split(' ')[0];
            if (orderDate > dateTo) return false;
        }

        // ステータスフィルター
        if (statusFilter && order.status !== statusFilter) {
            return false;
        }

        return true;
    });

    renderOrders(filteredOrders);
    updateStatistics(filteredOrders);
}

// CSVエクスポート
function exportToCSV() {
    const orders = filteredOrders.length > 0 ? filteredOrders : allOrders;
    if (orders.length === 0) {
        alert('エクスポートする注文がありません');
        return;
    }

    const headers = ['注文番号', '日時', '顧客名', 'メール', '電話', '住所', 'サイズ', '数量', '金額', 'ステータス'];
    const rows = orders.map(order => [
        order.order_number || '',
        order.created_at || '',
        order.customer_name || '',
        order.customer_email || '',
        order.customer_phone || '',
        order.customer_address || '',
        SIZE_LABELS[order.size] || order.size || '',
        order.quantity || '',
        order.total_price || '',
        STATUS_LABELS[order.status] || order.status || ''
    ]);

    let csvContent = '\uFEFF'; // BOM for Excel UTF-8
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 一括操作
async function applyBulkAction() {
    const action = document.getElementById('bulkAction')?.value;
    if (!action) {
        alert('操作を選択してください');
        return;
    }

    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('注文を選択してください');
        return;
    }

    if (!confirm(`${checkboxes.length}件の注文を「${STATUS_LABELS[action]}」に更新しますか？`)) {
        return;
    }

    const orderIds = Array.from(checkboxes).map(cb => cb.dataset.orderId);
    
    try {
        const promises = orderIds.map(orderId => 
            fetch(API_BASE + '/update-status.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: action })
            })
        );

        await Promise.all(promises);
        alert('一括更新が完了しました');
        loadOrders();
    } catch (error) {
        console.error('Bulk update error:', error);
        alert('一括更新に失敗しました');
    }
}

// 画像プレビュー
function showImagePreview(imagePath) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    if (modal && modalImg) {
        modal.style.display = 'block';
        modalImg.src = '../' + imagePath;
    }
}

// 印刷用データダウンロード
function downloadPrintData(orderId, format = 'json') {
    const downloadUrl = API_BASE + `/download-print-data.php?order_id=${orderId}&format=${format}`;
    window.open(downloadUrl, '_blank');
}

// 印刷データダウンロードメニュー表示
function showPrintDataMenu(orderId) {
    const formats = [
        { value: 'json', label: 'JSON形式' },
        { value: 'image', label: '画像のみ' },
        { value: 'pdf', label: '製造指示書' }
    ];

    const menu = `
        <div class="download-menu">
            <h4>ダウンロード形式を選択</h4>
            ${formats.map(f => `
                <button onclick="downloadPrintData('${orderId}', '${f.value}')" class="btn btn-small">
                    ${f.label}
                </button>
            `).join('')}
        </div>
    `;

    // Show menu in modal or inline
    alert('ダウンロード形式: ' + format);
}
