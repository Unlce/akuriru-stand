/**
 * Admin Panel JavaScript
 * 
 * 管理画面のインタラクティブ機能
 */

// グローバル変数
let currentOrders = [];
let currentFilter = {
    status: '',
    search: ''
};

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initialized');
    
    // 注文一覧を読み込み
    loadOrders();
    
    // フィルターのイベントリスナーを設定
    setupFilters();
    
    // モーダルのイベントリスナーを設定
    setupModal();
});

/**
 * 注文一覧を読み込む
 */
async function loadOrders() {
    try {
        showLoading(true);
        
        // APIから注文一覧を取得
        let url = '../api/orders.php';
        const params = new URLSearchParams();
        
        if (currentFilter.status) {
            params.append('status', currentFilter.status);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentOrders = data.orders || [];
            displayOrders(currentOrders);
            updateStats(data);
        } else {
            showError('注文の読み込みに失敗しました: ' + (data.error || '不明なエラー'));
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('注文の読み込み中にエラーが発生しました');
    } finally {
        showLoading(false);
    }
}

/**
 * 注文一覧を表示
 */
function displayOrders(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    
    if (!tbody) {
        console.error('Orders table body not found');
        return;
    }
    
    // 検索フィルタを適用
    let filteredOrders = orders;
    if (currentFilter.search) {
        const searchLower = currentFilter.search.toLowerCase();
        filteredOrders = orders.filter(order => {
            return (
                order.order_number.toLowerCase().includes(searchLower) ||
                order.customer_name.toLowerCase().includes(searchLower) ||
                order.customer_email.toLowerCase().includes(searchLower)
            );
        });
    }
    
    // テーブルをクリア
    tbody.innerHTML = '';
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-text">注文がありません</div>
                </td>
            </tr>
        `;
        return;
    }
    
    // 各注文を表示
    filteredOrders.forEach(order => {
        const row = createOrderRow(order);
        tbody.appendChild(row);
    });
}

/**
 * 注文行を作成
 */
function createOrderRow(order) {
    const row = document.createElement('tr');
    row.onclick = () => showOrderDetail(order.id);
    
    // サイズ名の変換
    const sizeNames = {
        'card': 'カード',
        'postcard': 'はがき',
        'a5': 'A5',
        'a4': 'A4'
    };
    
    // ステータス名の変換
    const statusNames = {
        'pending': '新規',
        'processing': '処理中',
        'completed': '完了',
        'cancelled': 'キャンセル'
    };
    
    // 日付のフォーマット
    const date = new Date(order.created_at);
    const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const formattedTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    row.innerHTML = `
        <td><strong>${escapeHtml(order.order_number)}</strong></td>
        <td>${formattedDate}<br><small style="color: #999;">${formattedTime}</small></td>
        <td>${escapeHtml(order.customer_name)}</td>
        <td>
            ${order.image_path ? `<img src="../${escapeHtml(order.image_path)}" class="image-thumbnail" alt="商品画像">` : '📷'}
        </td>
        <td>${sizeNames[order.size] || order.size}</td>
        <td>${escapeHtml(order.base_type || 'default')}</td>
        <td>¥${Number(order.total_price || 0).toLocaleString()}</td>
        <td>
            <span class="status status-${order.status}">
                ${statusNames[order.status] || order.status}
            </span>
        </td>
        <td>
            <button class="btn btn-sm" onclick="event.stopPropagation(); showOrderDetail(${order.id})">
                詳細
            </button>
        </td>
    `;
    
    return row;
}

/**
 * 注文詳細を表示
 */
async function showOrderDetail(orderId) {
    try {
        showLoading(true);
        
        const response = await fetch(`../api/order-detail.php?id=${orderId}`);
        const data = await response.json();
        
        if (data.success) {
            displayOrderDetailModal(data.order);
        } else {
            showError('注文詳細の取得に失敗しました: ' + (data.error || '不明なエラー'));
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
        showError('注文詳細の読み込み中にエラーが発生しました');
    } finally {
        showLoading(false);
    }
}

/**
 * 注文詳細モーダルを表示
 */
function displayOrderDetailModal(order) {
    const modal = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderDetailContent');
    
    if (!modal || !content) {
        console.error('Modal elements not found');
        return;
    }
    
    // サイズ名とステータス名の変換
    const sizeNames = {
        'card': 'カードサイズ',
        'postcard': 'はがきサイズ',
        'a5': 'A5サイズ',
        'a4': 'A4サイズ'
    };
    
    const statusNames = {
        'pending': '新規',
        'processing': '処理中',
        'completed': '完了',
        'cancelled': 'キャンセル'
    };
    
    // 日付のフォーマット
    const date = new Date(order.created_at);
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    content.innerHTML = `
        <div class="order-detail">
            <div class="detail-section">
                <h3>📋 注文情報</h3>
                <div class="detail-row">
                    <span class="detail-label">注文番号</span>
                    <span class="detail-value"><strong>${escapeHtml(order.order_number)}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">注文日時</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">ステータス</span>
                    <span class="detail-value">
                        <span class="status status-${order.status}">
                            ${statusNames[order.status] || order.status}
                        </span>
                    </span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>👤 お客様情報</h3>
                <div class="detail-row">
                    <span class="detail-label">お名前</span>
                    <span class="detail-value">${escapeHtml(order.customer_name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">メールアドレス</span>
                    <span class="detail-value">${escapeHtml(order.customer_email)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">電話番号</span>
                    <span class="detail-value">${escapeHtml(order.customer_phone)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">配送先住所</span>
                    <span class="detail-value">${escapeHtml(order.customer_address)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>🎨 商品情報</h3>
                ${order.image_path ? `
                    <img src="../${escapeHtml(order.image_path)}" class="order-image" alt="商品画像">
                ` : '<p>画像なし</p>'}
                <div class="detail-row">
                    <span class="detail-label">サイズ</span>
                    <span class="detail-value">${sizeNames[order.size] || order.size}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">台座タイプ</span>
                    <span class="detail-value">${escapeHtml(order.base_type)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">数量</span>
                    <span class="detail-value">${order.quantity}個</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>💰 金額</h3>
                <div class="detail-row">
                    <span class="detail-label">商品単価</span>
                    <span class="detail-value">¥${Number(order.unit_price || 0).toLocaleString()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">送料</span>
                    <span class="detail-value">¥${Number(order.shipping_fee || 0).toLocaleString()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"><strong>合計金額</strong></span>
                    <span class="detail-value"><strong>¥${Number(order.total_price || 0).toLocaleString()}</strong></span>
                </div>
            </div>
            
            <div class="status-actions">
                <button class="btn" onclick="updateOrderStatus(${order.id}, 'pending')">
                    🆕 新規にする
                </button>
                <button class="btn" onclick="updateOrderStatus(${order.id}, 'processing')">
                    🔄 処理中にする
                </button>
                <button class="btn" onclick="updateOrderStatus(${order.id}, 'completed')">
                    ✅ 完了にする
                </button>
                <button class="btn btn-secondary" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                    ❌ キャンセルする
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

/**
 * 注文ステータスを更新
 */
async function updateOrderStatus(orderId, newStatus) {
    if (!confirm('ステータスを変更してもよろしいですか？')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('../api/update-status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId,
                status: newStatus
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('ステータスを更新しました');
            closeModal();
            loadOrders(); // 一覧を再読み込み
        } else {
            showError('ステータスの更新に失敗しました: ' + (data.error || '不明なエラー'));
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showError('ステータス更新中にエラーが発生しました');
    } finally {
        showLoading(false);
    }
}

/**
 * フィルターの設定
 */
function setupFilters() {
    // ステータスフィルター
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentFilter.status = this.value;
            loadOrders();
        });
    }
    
    // 検索フィルター
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentFilter.search = this.value;
            displayOrders(currentOrders);
        });
    }
}

/**
 * モーダルの設定
 */
function setupModal() {
    const modal = document.getElementById('orderDetailModal');
    const closeBtn = document.querySelector('.close-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
}

/**
 * モーダルを閉じる
 */
function closeModal() {
    const modal = document.getElementById('orderDetailModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * 統計情報を更新
 */
function updateStats(data) {
    const totalElement = document.getElementById('totalOrders');
    if (totalElement && data.total !== undefined) {
        totalElement.textContent = data.total.toLocaleString();
    }
}

/**
 * ローディング表示の切り替え
 */
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.toggle('active', show);
    }
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
    alert('エラー: ' + message);
}

/**
 * 成功メッセージを表示
 */
function showSuccess(message) {
    alert(message);
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
