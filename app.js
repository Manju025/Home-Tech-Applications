
let products = [];
let filteredProducts = [];
const API_BASE_URL = 'https://home-tech-backend.onrender.com/api';
const allTags = ["RO", "UV", "UF", "Alkaline", "Copper", "Smart", "Multi-Stage", "TDS Controller"];
let orders = [];
let activeFilters = [];
let currentProduct = null;
let isAdminMode = false;

// DOM Elements
let mobileMenuBtn, mainNav, newLaunchesGrid, productsGrid, filterTags, clearFiltersBtn;
let productModal, orderModal, notification;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    mobileMenuBtn = document.getElementById('mobileMenuBtn');
    mainNav = document.getElementById('mainNav');
    newLaunchesGrid = document.getElementById('newLaunchesGrid');
    productsGrid = document.getElementById('productsGrid');
    filterTags = document.getElementById('filterTags');
    clearFiltersBtn = document.getElementById('clearFilters');
    productModal = document.getElementById('productModal');
    orderModal = document.getElementById('orderModal');
    notification = document.getElementById('notification');

    // Check if admin mode is requested via URL hash
    if (window.location.hash === '#admin') {
        initializeAdmin();
    } else {
        initializeApp();
        setupEventListeners();
    }
});

// Fetch products from API
async function fetchProductsApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        products = await response.json();
        
        applyFilters();
        renderNewLaunches();
        renderProducts();
        renderFilterTags();
    } catch (error) {
        console.error("Error fetching products for main app:", error);
        showNotification('Failed to load products. Please try again later.', 'error');
    }
}

// Fetch orders from API
async function fetchOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        orders = await response.json();
        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        showNotification('Failed to load orders.', 'error');
        return [];
    }
}

// Initialize main app
async function initializeApp() {
    await fetchProductsApp();
    renderNewLaunches();
    renderProducts();
    renderFilterTags();
}

// Initialize admin mode
async function initializeAdmin() {
    // Admin authentication
    const password = prompt('Enter admin password:');
    if (password !== 'manager123') {
        alert('Incorrect password. Redirecting to home page.');
        window.location.hash = '';
        window.location.reload();
        return;
    }

    isAdminMode = true;
    document.body.classList.add('admin-mode');
    
    // Hide regular content and show admin panel
    const mainElement = document.querySelector('.main');
    const footerElement = document.querySelector('.footer');
    if (mainElement) mainElement.style.display = 'none';
    if (footerElement) footerElement.style.display = 'none';

    // Fetch data for admin
    await fetchProductsApp();
    await fetchOrders();
    
    // Create admin interface
    createAdminInterface();
    setupAdminEventListeners();
}

// Setup main app event listeners
function setupEventListeners() {
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }

    // Clear filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeProductModal();
        }
        if (e.target === orderModal) {
            closeOrderModal();
        }
    });

    // Order form submission
    document.addEventListener('submit', (e) => {
        if (e.target.id === 'orderForm') {
            e.preventDefault();
            submitOrder(e.target);
        }
    });
}

// Setup admin event listeners
function setupAdminEventListeners() {
    // Admin tabs
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Refresh data when switching tabs
            if (targetTab === 'manage-products') {
                renderProductsAdmin();
            } else if (targetTab === 'orders') {
                renderOrdersList();
            }
        });
    });

    // Add product form
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addNewProduct(new FormData(this));
        });
    }

    // Setup image upload
    setupImageUpload();
}

// Global variable for uploaded image
let uploadedImageDataURL = null;

function setupImageUpload() {
    const fileInput = document.getElementById('productImageFile');
    const previewBox = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const hint = document.getElementById('imageHint');

    if (!fileInput || !previewBox || !previewImg || !hint) {
        console.error('Image upload elements not found');
        return;
    }

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) {
            uploadedImageDataURL = null;
            previewBox.style.display = 'none';
            return;
        }

        // Validation
        if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
            hint.textContent = 'Only PNG or JPG files allowed';
            hint.style.color = 'var(--color-error)';
            fileInput.value = '';
            uploadedImageDataURL = null;
            previewBox.style.display = 'none';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            hint.textContent = 'Image too large (max 5 MB)';
            hint.style.color = 'var(--color-error)';
            fileInput.value = '';
            uploadedImageDataURL = null;
            previewBox.style.display = 'none';
            return;
        }

        hint.textContent = 'Reading image...';
        hint.style.color = 'var(--color-text-secondary)';

        // Read file as base64
        const reader = new FileReader();
        reader.onload = function(evt) {
            uploadedImageDataURL = evt.target.result;
            previewImg.src = uploadedImageDataURL;
            previewBox.style.display = 'block';
            hint.textContent = '✓ Image ready';
            hint.style.color = 'var(--color-success)';
        };
        reader.onerror = function() {
            hint.textContent = 'Error reading file';
            hint.style.color = 'var(--color-error)';
            uploadedImageDataURL = null;
            previewBox.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });
}

// Add new product (admin)
async function addNewProduct(formData) {
    const selectedTechnologies = [];
    document.querySelectorAll('#technologyCheckboxes input[type="checkbox"]:checked')
        .forEach(checkbox => selectedTechnologies.push(checkbox.value));

    if (selectedTechnologies.length === 0) {
        alert('Please select at least one technology.');
        return;
    }

    const newProduct = {
        id: Date.now(),
        name: formData.get('productName'),
        price: parseInt(formData.get('productPrice')),
        image: uploadedImageDataURL,
        tags: selectedTechnologies,
        isNewLaunch: formData.get('isNewLaunch') === 'on'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });

        if (!response.ok) throw new Error('Failed to add product');

        showNotification('Product added successfully!', 'success');
        
        // Reset form
        document.getElementById('addProductForm').reset();
        document.querySelectorAll('#technologyCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        uploadedImageDataURL = null;
        
        const previewBox = document.getElementById('imagePreview');
        if (previewBox) previewBox.style.display = 'none';
        
        const hint = document.getElementById('imageHint');
        if (hint) {
            hint.textContent = '';
            hint.style.color = 'var(--color-text-secondary)';
        }

        // Reload products from backend
        await fetchProductsApp();
        renderProductsAdmin();
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Failed to add product.', 'error');
    }
}

// Delete product (admin)
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete product');

        showNotification('Product deleted successfully!', 'success');
        await fetchProductsApp();
        renderProductsAdmin();
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product.', 'error');
    }
}

// Submit order
async function submitOrder(form) {
    const formData = new FormData(form);
    
    const orderData = {
        id: Date.now().toString(),
        productId: currentProduct.id,
        productName: currentProduct.name,
        quantity: parseInt(formData.get('quantity')),
        customerName: formData.get('customerName'),
        customerPhone: formData.get('customerPhone'),
        customerAddress: formData.get('customerAddress'),
        specialInstructions: formData.get('specialInstructions') || '',
        orderDate: new Date().toLocaleDateString(),
        total: currentProduct.price * parseInt(formData.get('quantity')),
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
        closeOrderModal();
        form.reset();
    } catch (error) {
        console.error('Error placing order:', error);
        showNotification('Failed to place order. Please try again.', 'error');
    }
}

// Update order status (admin)
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Failed to update order status');

        showNotification('Order status updated!', 'success');
        await fetchOrders();
        renderOrdersList();
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Failed to update order status.', 'error');
    }
}

// Create admin interface
function createAdminInterface() {
    const body = document.body;
    body.innerHTML = `
        <div class="admin-container">
            <div class="admin-header">
                <h1>🏠 Home Tech Admin Panel</h1>
                <button onclick="window.location.hash=''; window.location.reload();" class="logout-btn">
                    🚪 Exit Admin
                </button>
            </div>
            
            <div class="admin-tabs">
                <button class="admin-tab active" data-tab="add-product">➕ Add Product</button>
                <button class="admin-tab" data-tab="manage-products">📦 Manage Products</button>
                <button class="admin-tab" data-tab="orders">🛍️ View Orders</button>
            </div>
            
            <div class="admin-content">
                <!-- Add Product Tab -->
                <div id="add-product" class="admin-tab-content active">
                    <h2>Add New Product</h2>
                    <form id="addProductForm" class="admin-form">
                        <div class="form-group">
                            <label for="productName">Product Name:</label>
                            <input type="text" id="productName" name="productName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="productPrice">Price (₹):</label>
                            <input type="number" id="productPrice" name="productPrice" required min="1">
                        </div>
                        
                        <div class="form-group">
                            <label for="productImageFile">Product Image:</label>
                            <input type="file" id="productImageFile" accept="image/png,image/jpeg,image/jpg">
                            <small id="imageHint" style="color: var(--color-text-secondary);"></small>
                            <div id="imagePreview" style="display: none; margin-top: 10px;">
                                <img id="previewImg" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Technologies:</label>
                            <div id="technologyCheckboxes" class="checkbox-group">
                                ${allTags.map(tag => `
                                    <label class="checkbox-label">
                                        <input type="checkbox" value="${tag}">
                                        <span>${tag}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="isNewLaunch">
                                <span>Mark as New Launch</span>
                            </label>
                        </div>
                        
                        <button type="submit" class="btn-primary">Add Product</button>
                    </form>
                </div>
                
                <!-- Manage Products Tab -->
                <div id="manage-products" class="admin-tab-content">
                    <h2>Manage Products</h2>
                    <div id="productsAdminGrid" class="admin-products-grid"></div>
                </div>
                
                <!-- Orders Tab -->
                <div id="orders" class="admin-tab-content">
                    <h2>Customer Orders</h2>
                    <div id="ordersContainer" class="orders-container"></div>
                </div>
            </div>
        </div>
        
        <div id="notification" class="notification"></div>
    `;
}

// Render products in admin
function renderProductsAdmin() {
    const container = document.getElementById('productsAdminGrid');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p>No products available.</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="admin-product-card">
            <img src="${product.image || '/api/placeholder/150/150'}" alt="${product.name}">
            <div class="admin-product-info">
                <h3>${product.name}</h3>
                <p class="price">₹${product.price}</p>
                <div class="tags">
                    ${product.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                ${product.isNewLaunch ? '<span class="new-launch-badge">New Launch</span>' : ''}
                <button onclick="deleteProduct(${product.id})" class="btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

// Render orders list in admin
function renderOrdersList() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p>No orders yet.</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <h3>Order #${order.id}</h3>
                <span class="order-status status-${order.status.toLowerCase()}">${order.status}</span>
            </div>
            <div class="order-details">
                <p><strong>Product:</strong> ${order.productName}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                <p><strong>Customer:</strong> ${order.customerName}</p>
                <p><strong>Phone:</strong> ${order.customerPhone}</p>
                <p><strong>Address:</strong> ${order.customerAddress}</p>
                <p><strong>Total:</strong> ₹${order.total}</p>
                <p><strong>Date:</strong> ${order.orderDate}</p>
                ${order.specialInstructions ? `<p><strong>Instructions:</strong> ${order.specialInstructions}</p>` : ''}
            </div>
            <div class="order-actions">
                <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Done" ${order.status === 'Done' ? 'selected' : ''}>Done</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Render new launches
function renderNewLaunches() {
    if (!newLaunchesGrid) return;
    
    const newProducts = products.filter(product => product.isNewLaunch);
    
    if (newProducts.length === 0) {
        newLaunchesGrid.innerHTML = '<p>No new launches at the moment.</p>';
        return;
    }
    
    newLaunchesGrid.innerHTML = newProducts.map(product => createProductCard(product)).join('');
}

// Render all products
function renderProducts(filteredProducts = products) {
    if (!productsGrid) return;
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p>No products match your filters.</p>';
        return;
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
}

// Create product card HTML
function createProductCard(product) {
    return `
        <div class="product-card" onclick="openProductModal(${product.id})">
            <div class="product-image">
                <img src="${product.image || '/api/placeholder/300/200'}" alt="${product.name}">
                ${product.isNewLaunch ? '<span class="new-badge">New</span>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">₹${product.price}</p>
                <div class="product-tags">
                    ${product.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

// Render filter tags
function renderFilterTags() {
    if (!filterTags) return;
    
    filterTags.innerHTML = allTags.map(tag => `
        <button class="filter-tag ${activeFilters.includes(tag) ? 'active' : ''}" 
                onclick="toggleFilter('${tag}')">
            ${tag}
        </button>
    `).join('');
}

// Filter functions
function toggleFilter(tag) {
    if (activeFilters.includes(tag)) {
        activeFilters = activeFilters.filter(f => f !== tag);
    } else {
        activeFilters.push(tag);
    }
    applyFilters();
    renderFilterTags();
}

function applyFilters() {
    if (activeFilters.length === 0) {
        filteredProducts = products;
    } else {
        filteredProducts = products.filter(product => 
            activeFilters.some(filter => product.tags.includes(filter))
        );
    }
    renderProducts(filteredProducts);
}

function clearFilters() {
    activeFilters = [];
    applyFilters();
    renderFilterTags();
}

// Modal functions
function openProductModal(productId) {
    currentProduct = products.find(p => p.id === productId);
    if (!currentProduct || !productModal) return;
    
    document.getElementById('modalProductImage').src = currentProduct.image || '/api/placeholder/400/300';
    document.getElementById('modalProductName').textContent = currentProduct.name;
    document.getElementById('modalProductPrice').textContent = `₹${currentProduct.price}`;
    document.getElementById('modalProductTags').innerHTML = 
        currentProduct.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    
    productModal.style.display = 'block';
}

function closeProductModal() {
    if (productModal) {
        productModal.style.display = 'none';
    }
}

function openOrderModal() {
    if (!orderModal) return;
    closeProductModal();
    orderModal.style.display = 'block';
}

function closeOrderModal() {
    if (orderModal) {
        orderModal.style.display = 'none';
    }
}

// Utility functions
function showNotification(message, type = 'success') {
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
