let products = [];
let filteredProducts = [];
const API_BASE_URL = 'https://home-tech-backend.onrender.com/api'; // Change to your deployed backend URL later

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

// In app.js
async function fetchProductsApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        products = await response.json();
        // Important: Re-filter and re-render after fetching new products
        applyFilters(); // Call your existing filter logic if any
        renderNewLaunches();
        renderProducts();
        renderFilterTags();
    } catch (error) {
        console.error("Error fetching products for main app:", error);
        showNotification('Failed to load products. Please try again later.', 'error');
    }
}

async function initializeApp() {
    await fetchProductsApp();
    renderNewLaunches();
    renderProducts();
    renderFilterTags();
}

function initializeAdmin() {
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
    
    // Create admin interface
    createAdminInterface();
}

// ---------------------------------------------
// Global variable for uploaded image
let uploadedImageDataURL = null;

function setupImageUpload() {
    const fileInput = document.getElementById('productImageFile');
    const previewBox = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const hint = document.getElementById('imageHint');
    
    // Make sure elements exist
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
}

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


function renderProductsAdmin() {
    const container = document.getElementById('productsAdminGrid');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No products available.</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-admin-card">
            <div class="product-admin-card__actions">
                <button class="btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
            </div>
            <div class="product-admin-card__header">
                <h4 class="product-admin-card__title">${product.name}</h4>
                ${product.isNewLaunch ? '<span class="status status--success">New Launch</span>' : ''}
            </div>
            <div class="product-admin-card__price">₹${product.price.toLocaleString()}</div>
            <div class="product-technologies" style="margin-top: 12px;">
                ${product.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
            </div>
            <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: var(--radius-sm); margin-top: 12px;" onerror="this.src='https://via.placeholder.com/250'">
        </div>
    `).join('');
}

// Add this function to your app (2).js file

function renderOrdersList() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No orders yet.</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-item-admin">
            <div class="order-header">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-status order-status--pending">${order.status}</span>
            </div>
            <div class="order-details">
                <div><strong>Product:</strong> ${order.productName}</div>
                <div><strong>Quantity:</strong> ${order.quantity}</div>
                <div><strong>Customer:</strong> ${order.customerName}</div>
                <div><strong>Phone:</strong> ${order.customerPhone}</div>
                <div><strong>Date:</strong> ${order.orderDate}</div>
                <div><strong>Total:</strong> ₹${order.total.toLocaleString()}</div>
            </div>
            <div style="margin-top: 12px;">
                <strong>Address:</strong> ${order.customerAddress}
            </div>
            ${order.specialInstructions ? 
                `<div style="margin-top: 8px;"><strong>Instructions:</strong> ${order.specialInstructions}</div>` : ''
            }
        </div>
    `).join('');
}

function exitAdmin() {
    window.location.hash = '';
    window.location.reload();
}

function setupEventListeners() {
    if (isAdminMode) return;
    
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Filter functionality
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
    
    // Modal close events
    setupModalEvents();
    
    // Forms
    setupFormEvents();
    
    // Smooth scrolling for navigation links
    setupSmoothScrolling();
}

function toggleMobileMenu() {
    if (mainNav) {
        mainNav.classList.toggle('active');
    }
}

function renderNewLaunches() {
    if (!newLaunchesGrid) return;
    
    const newProducts = products.filter(product => product.isNewLaunch);
    if (newProducts.length === 0) {
        newLaunchesGrid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No new launches at the moment.</p>';
        return;
    }
    newLaunchesGrid.innerHTML = newProducts.map(product => createProductCard(product)).join('');
}

function renderProducts(filteredProducts = products) {
    if (!productsGrid) return;
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No products match your filters.</p>';
        return;
    }
    productsGrid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    return `
        <div class="product-card">
            ${product.isNewLaunch ? '<span class="product-card__badge">New Launch</span>' : ''}
            <img src="${product.image}" alt="${product.name}" class="product-card__image" onerror="this.src='https://via.placeholder.com/250'">
            <div class="product-card__content">
                <h3 class="product-card__title">${product.name}</h3>
                <div class="product-card__price">₹${product.price.toLocaleString()}</div>
                <div class="product-technologies">
                    ${product.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
                </div>
                <div class="product-card__actions">
                    <button class="btn btn--secondary btn--sm" onclick="openProductModal(${product.id})">View Details</button>
                    <button class="btn btn--primary btn--sm" onclick="openOrderModal(${product.id})">Order</button>
                </div>
            </div>
        </div>
    `;
}

function renderFilterTags() {
    if (!filterTags) return;
    
    const availableTags = [...new Set(products.flatMap(product => product.tags))];
    filterTags.innerHTML = availableTags.map(tag => 
        `<span class="filter-tag" data-filter="${tag}" onclick="toggleFilter('${tag}')">${tag}</span>`
    ).join('');
}

function toggleFilter(tag) {
    const filterElement = document.querySelector(`[data-filter="${tag}"]`);
    
    if (activeFilters.includes(tag)) {
        activeFilters = activeFilters.filter(filter => filter !== tag);
        if (filterElement) filterElement.classList.remove('active');
    } else {
        activeFilters.push(tag);
        if (filterElement) filterElement.classList.add('active');
    }
    
    applyFilters();
}

function applyFilters() {
    if (activeFilters.length === 0) {
        renderProducts();
        return;
    }
    
    const filteredProducts = products.filter(product => 
        activeFilters.some(filter => product.tags.includes(filter))
    );
    
    renderProducts(filteredProducts);
}

function clearAllFilters() {
    activeFilters = [];
    document.querySelectorAll('.filter-tag.active').forEach(tag => {
        tag.classList.remove('active');
    });
    renderProducts();
}

// Global functions for onclick handlers
window.openProductModal = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || !productModal) return;
    
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="product-detail">
            <img src="${product.image}" alt="${product.name}" class="product-detail__image" onerror="this.src='https://via.placeholder.com/250'">
            <h3>${product.name}</h3>
            <div class="product-detail__price">₹${product.price.toLocaleString()}</div>
            <div class="product-technologies">
                ${product.tags.map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
            </div>
            <div class="product-detail__features">
                <h4>Key Features:</h4>
                <ul>
                    <li>Advanced ${product.tags.join(', ')} technology</li>
                    <li>High-quality water purification</li>
                    <li>Durable and efficient design</li>
                    <li>Easy maintenance and service</li>
                    <li>Suitable for all water types</li>
                </ul>
            </div>
            <div class="product-detail__specs">
                <h4>Specifications:</h4>
                <div class="spec-grid">
                    <div class="spec-item">
                        <span class="spec-label">Technology:</span>
                        <span class="spec-value">${product.tags.join(', ')}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Capacity:</span>
                        <span class="spec-value">8-12 Litres</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Power:</span>
                        <span class="spec-value">60-80W</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Warranty:</span>
                        <span class="spec-value">2-3 Years</span>
                    </div>
                </div>
            </div>
            <button class="btn btn--primary btn--full-width" onclick="closeModal('productModal'); openOrderModal(${product.id})">Order Now</button>
        </div>
    `;
    
    productModal.classList.remove('hidden');
};

window.openOrderModal = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || !orderModal) return;
    
    currentProduct = product;
    
    const orderSummary = document.getElementById('orderSummary');
    if (!orderSummary) return;
    
    orderSummary.innerHTML = `
        <h4>Order Summary</h4>
        <div class="order-item">
            <span>${product.name}</span>
            <span>₹${product.price.toLocaleString()}</span>
        </div>
        <div class="order-item">
            <span>Quantity</span>
            <span id="orderQuantityDisplay">1</span>
        </div>
        <div class="order-item order-total">
            <span>Total Amount:</span>
            <span id="orderTotalDisplay">₹${product.price.toLocaleString()}</span>
        </div>
    `;
    
    orderModal.classList.remove('hidden');
    
    // Add event listener for quantity changes
    setTimeout(() => {
        const quantitySelect = document.querySelector('select[name="quantity"]');
        if (quantitySelect) {
            quantitySelect.addEventListener('change', updateOrderSummary);
        }
    }, 100);
};

function updateOrderSummary() {
    if (!currentProduct) return;
    
    const quantity = parseInt(document.querySelector('select[name="quantity"]').value) || 1;
    const total = currentProduct.price * quantity;
    
    const quantityDisplay = document.getElementById('orderQuantityDisplay');
    const totalDisplay = document.getElementById('orderTotalDisplay');
    
    if (quantityDisplay) quantityDisplay.textContent = quantity;
    if (totalDisplay) totalDisplay.textContent = `₹${total.toLocaleString()}`;
}

function setupModalEvents() {
    if (isAdminMode) return;
    
    // Product modal
    const modalClose = document.getElementById('modalClose');
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalClose) modalClose.addEventListener('click', () => closeModal('productModal'));
    if (modalOverlay) modalOverlay.addEventListener('click', () => closeModal('productModal'));
    
    // Order modal
    const orderModalClose = document.getElementById('orderModalClose');
    const orderModalOverlay = document.getElementById('orderModalOverlay');
    if (orderModalClose) orderModalClose.addEventListener('click', () => closeModal('orderModal'));
    if (orderModalOverlay) orderModalOverlay.addEventListener('click', () => closeModal('orderModal'));
    
    // Notification
    const notificationClose = document.getElementById('notificationClose');
    if (notificationClose) notificationClose.addEventListener('click', hideNotification);
}

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
};

function setupFormEvents() {
    if (isAdminMode) return;
    
    // Order form
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processOrder(new FormData(this));
        });
    }
}

// ... (all existing code before processOrder) ...

async function processOrder(formData) {
    if (!currentProduct) return;

    const quantity = parseInt(formData.get('quantity')) || 1;
    const total = currentProduct.price * quantity;

    const orderData = {
        productId: currentProduct.id,
        productName: currentProduct.name,
        quantity: quantity,
        customerName: formData.get('customerName'),
        customerPhone: formData.get('customerPhone'),
        customerAddress: formData.get('customerAddress'),
        specialInstructions: formData.get('specialInstructions') || '',
        total: total,
        orderDate: new Date().toLocaleDateString(),
        status: 'Pending'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) throw new Error('Failed to place order');

        const newOrder = await response.json();

        // Close order modal
        closeModal('orderModal');

        // Show success notification
        const orderId = newOrder.id || 'N/A';
        showNotification(`Order placed successfully! Order ID: #${orderId}`, 'success');


        // Simulate manager notification
        setTimeout(() => {
            alert('Manager notified');
            showNotification('Manager has been notified of your order!', 'info');
        }, 1500);

        // Reset form
        const orderForm = document.getElementById('orderForm');
        if (orderForm) orderForm.reset();
        currentProduct = null;

        orders.push(newOrder);

    } catch (error) {
        console.error("Error placing order:", error);
        showNotification('Failed to place order.', 'error');
    }
}

async function placeOrder() { // Make it async
    // ... (existing validation logic) ...

    const orderDetails = {
        id: generateOrderId(), // Your existing function
        productId: currentProduct.id,
        productName: currentProduct.name,
        quantity: parseInt(document.querySelector('#orderModal [name="quantity"]').value),
        customerName: document.querySelector('#orderModal [name="customerName"]').value,
        customerPhone: document.querySelector('#orderModal [name="customerPhone"]').value,
        customerAddress: document.querySelector('#orderModal [name="customerAddress"]').value,
        specialInstructions: document.querySelector('#orderModal [name="specialInstructions"]').value,
        orderDate: new Date().toLocaleDateString(),
        total: currentProduct.price * parseInt(document.querySelector('#orderModal [name="quantity"]').value),
        status: 'Pending' // Initial status
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderDetails)
        });
        
        if (!response.ok) throw new Error('Failed to place order');

        showNotification('Order placed successfully! We will contact you soon.', 'success');
        hideModal('orderModal');
        document.getElementById('orderForm').reset();
        
        // Admin panel will pick up the new order via its fetchOrdersAdmin or periodic refresh
    } catch (error) {
        console.error("Error placing order:", error);
        showNotification('Failed to place order: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'success') {
    if (!notification) return;
    
    const notificationMessage = document.getElementById('notificationMessage');
    if (notificationMessage) {
        notificationMessage.textContent = message;
    }
    
    // Update notification style based on type
    notification.className = `notification ${type === 'success' ? '' : 'notification--' + type}`;
    notification.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    if (notification) {
        notification.classList.add('hidden');
    }
}

function setupSmoothScrolling() {
    if (isAdminMode) return;
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu if open
                if (mainNav) mainNav.classList.remove('active');
            }
        });
    });
}

// Handle window resize for mobile menu
window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && mainNav) {
        mainNav.classList.remove('active');
    }
});

// Handle click outside mobile menu to close it
document.addEventListener('click', function(e) {
    if (!isAdminMode && !e.target.closest('.header') && mainNav && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
    }
});

// Prevent modal content clicks from closing modal
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.modal__content').forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
});

// Listen for storage changes to update products when admin makes changes
window.addEventListener('storage', function(e) {
    if (e.key === 'products' && !isAdminMode) {
        products = JSON.parse(e.newValue) || products;
        renderNewLaunches();
        renderProducts();
        renderFilterTags();
    }
});

// Utility functions
function formatPrice(price) {
    return `₹${price.toLocaleString()}`;
}

function generateOrderId() {
    return Date.now().toString().slice(-6);
}

function createAdminInterface() {
    // ... your existing HTML creation code ...
    
    document.body.insertAdjacentHTML('beforeend', adminHTML);
    setupAdminEventListeners();
    setupImageUpload(); // ADD THIS LINE!
    renderProductsAdmin();
    renderOrdersList();
}
