const API_BASE_URL = 'https://home-tech-backend.onrender.com/api';
const PLACEHOLDER = 'https://placehold.co/250x250?text=No+Image';
let products = [];
let orders = [];
let currentProduct = null;
let isAdminMode = false;

// ---------- FETCH PRODUCTS ----------
async function fetchProductsApp() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    products = await response.json();
  } catch (err) {
    console.error('Error fetching products:', err);
  }
}

// ---------- FETCH ORDERS ----------
async function fetchOrders() {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    orders = await response.json();
  } catch (err) {
    console.error('Error fetching orders:', err);
    orders = [];
  }
}

// ---------- INITIALIZE APP ----------
async function initializeApp() {
  await fetchProductsApp();
  renderProducts();
  renderNewLaunches();
  renderFilterTags();
}

// ---------- INITIALIZE ADMIN ----------
async function initializeAdmin() {
  const password = prompt('Enter admin password:');
  if (password !== 'manager123') {
    alert('Incorrect password. Redirecting to home page.');
    window.location.href = 'index.html';
    return;
  }

  isAdminMode = true;
  await fetchProductsApp();
  await fetchOrders();
  renderTechnologyCheckboxes();
  renderProductsAdmin();
  renderOrdersList();
  setupAdminEventListeners();
}

// ---------- SUBMIT ORDER ----------
async function submitOrder(form) {
  const formData = new FormData(form);
  const quantity = parseInt(formData.get('quantity')) || 1;

  const orderData = {
    id: Date.now().toString(),
    productId: currentProduct.id,
    productName: currentProduct.name,
    quantity: quantity,
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    customerAddress: formData.get('customerAddress'),
    specialInstructions: formData.get('specialInstructions') || '',
    orderDate: new Date().toLocaleDateString(),
    total: currentProduct.price * quantity,
    status: 'Pending'
  };

  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) throw new Error('Failed to place order');

    showNotification('Order placed successfully!', 'success');
    closeModal('orderModal');
    form.reset();
    currentProduct = null;

    if (isAdminMode) {
      await fetchOrders();
      renderOrdersList();
    }
  } catch (err) {
    console.error('Order failed:', err);
    showNotification('Order failed. Please try again.', 'error');
  }
}

// ---------- RENDER ORDERS ----------
function renderOrdersList() {
  const container = document.getElementById('ordersList');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align: center;">No orders yet.</p>';
    return;
  }

  container.innerHTML = orders.map(order => `
    <div class="order-item-admin">
      <div class="order-header">
        <span class="order-id">Order #${order.id}</span>
        <div>
          <span class="order-status order-status--${order.status.toLowerCase()}">${order.status}</span>
          ${order.status === 'Pending' ? 
            `<button class="btn btn--sm btn--secondary" onclick="markOrderAsDone('${order.id}')">Mark as Done</button>` : ''}
        </div>
      </div>
      <div class="order-details">
        <div><strong>Product:</strong> ${order.productName}</div>
        <div><strong>Quantity:</strong> ${order.quantity}</div>
        <div><strong>Customer:</strong> ${order.customerName}</div>
        <div><strong>Phone:</strong> ${order.customerPhone}</div>
        <div><strong>Date:</strong> ${order.orderDate}</div>
        <div><strong>Total:</strong> ₹${order.total.toLocaleString()}</div>
      </div>
      <div><strong>Address:</strong> ${order.customerAddress}</div>
      ${order.specialInstructions ? `<div><strong>Instructions:</strong> ${order.specialInstructions}</div>` : ''}
    </div>
  `).join('');
}

// ---------- MARK ORDER DONE ----------
async function markOrderAsDone(orderId) {
  if (!confirm('Mark this order as Done?')) return;
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Done' })
    });
    if (!response.ok) throw new Error('Update failed');
    await fetchOrders();
    renderOrdersList();
    showNotification('Order marked as Done!', 'success');
  } catch (err) {
    console.error('Status update failed:', err);
    showNotification('Failed to update status.', 'error');
  }
}

// ---------- HANDLE FORM SUBMISSION ----------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('orderForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      submitOrder(e.target);
    });
  }

  const adminPage = window.location.pathname.includes('admin.html');
  if (adminPage) {
    initializeAdmin();
  } else {
    initializeApp();
  }
});
