// 📑 1. Global State & DOM Element Initializations
let productCatalog = [];
let cart = []; // each item: { id, name, vendor, price, stock, image, quantity }

const productsGrid = document.getElementById('products-grid');
const cartDrawer = document.getElementById('cart-drawer');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalPrice = document.getElementById('cart-total-price');
const buyerSearch = document.getElementById('buyer-search');
const searchBtn = document.getElementById('search-btn');
const addProductForm = document.getElementById('add-product-form');

const navHome = document.getElementById('nav-home');
const navOrders = document.getElementById('nav-orders');
const navVendor = document.getElementById('nav-vendor');
const navCart = document.getElementById('nav-cart');
const buyerView = document.getElementById('buyer-view');
const vendorView = document.getElementById('vendor-view');
const ordersView = document.getElementById('orders-view');
const ordersList = document.getElementById('orders-list');
const closeCartBtn = document.getElementById('close-cart-btn');
const checkoutBtn = document.getElementById('checkout-btn');

// 🎨 Signature touch: every vendor gets a consistent color + initials badge,
// so buyers can recognize a seller at a glance across the catalog, cart, and orders.
const VENDOR_PALETTE = ['#7C3AED', '#FF6B6B', '#06D6A0', '#FFB703', '#3A86FF', '#F72585'];

function vendorColor(vendor) {
    const name = vendor || 'Independent Vendor';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return VENDOR_PALETTE[Math.abs(hash) % VENDOR_PALETTE.length];
}

function vendorInitials(vendor) {
    const name = (vendor || 'IV').trim();
    const parts = name.split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function vendorBadge(vendor) {
    return `<span class="vendor-badge" style="background:${vendorColor(vendor)}">${vendorInitials(vendor)}</span>`;
}

// 🔐 Helper: read the logged-in user (or null) from localStorage
function getLoggedInUser() {
    const userJson = localStorage.getItem('loggedInUser');
    return userJson ? JSON.parse(userJson) : null;
}

// 🔐 Helper: gate a feature behind login — alerts and redirects if logged out
function requireLogin(message) {
    const user = getLoggedInUser();
    if (!user) {
        alert(message || "Please log in first.");
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// 📦 2. Render Products dynamically onto the Grid (With Edit Support)
function renderProducts() {
    if (!productsGrid) return;
    productsGrid.innerHTML = ''; 
    
    const loggedInUser = getLoggedInUser();

    if (!productCatalog || productCatalog.length === 0) {
        productsGrid.innerHTML = `<h3>🔍 No products listed yet</h3>`;
        return;
    }

    productCatalog.forEach(product => {
        const currentStock = parseInt(product.stock) || 0;
        const productName = product.name || "Unknown Product";
        const finalImage = product.image && product.image.trim() !== "" ? product.image : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80"; 

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="stock-badge">Qty: ${currentStock}</div>
            <div class="product-image-container"><img src="${finalImage}" alt="${productName}"></div>
            <div class="product-info">
                <h3>${productName}</h3>
                <p class="vendor-tag">${vendorBadge(product.vendor)} <strong>${product.vendor || 'Independent Vendor'}</strong></p>
                <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
            </div>
            <button class="add-to-cart-btn" ${currentStock === 0 ? 'disabled' : ''} onclick="addToCart(${product.id})">${currentStock === 0 ? 'Out of Stock' : 'Add to Cart'}</button>
            
            ${loggedInUser && loggedInUser.username.toLowerCase() === (product.vendor || '').toLowerCase() ? 
                `<button class="edit-btn" onclick="openEditModal(${product.id})">✏️ Edit Product</button>` : ''
            }
        `;
        productsGrid.appendChild(card);
    });
}

// 🎛️ Open and Populate Edit Modal Windows
window.openEditModal = function(productId) {
    const product = productCatalog.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-vendor-name').value = product.vendor;
    document.getElementById('edit-product-image').value = product.image || '';
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-stock').value = product.stock;

    document.getElementById('edit-modal').style.display = 'flex';
};

// Close Modal Element
if (document.getElementById('close-edit-modal')) {
    document.getElementById('close-edit-modal').addEventListener('click', () => {
        document.getElementById('edit-modal').style.display = 'none';
    });
}

// 📤 Handle Edit Form Submission Update
const editProductForm = document.getElementById('edit-product-form');
if (editProductForm) {
    editProductForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-product-id').value;
        const name = document.getElementById('edit-product-name').value;
        const price = document.getElementById('edit-product-price').value;
        const stock = document.getElementById('edit-product-stock').value;
        const image = document.getElementById('edit-product-image').value.trim();

        fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, stock, image })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Listing updated successfully!");
                document.getElementById('edit-modal').style.display = 'none';
                location.reload();
            } else {
                alert("Error updating product: " + data.message);
            }
        })
        .catch(err => console.error("Error updating item records:", err));
    });
}

// 🛒 3. Add to Cart Logic (with stock-aware quantities)
window.addToCart = function(productId) {
    const product = productCatalog.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert(`Only ${product.stock} in stock — that's the max we can add.`);
        }
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCartUI();
};

// ➕➖ Quantity controls inside the cart drawer
window.incrementCartItem = function(productId) {
    const item = cart.find(i => i.id === productId);
    const product = productCatalog.find(p => p.id === productId);
    if (!item || !product) return;

    if (item.quantity < product.stock) {
        item.quantity++;
    } else {
        alert(`Only ${product.stock} in stock — that's the max we can add.`);
    }
    updateCartUI();
};

window.decrementCartItem = function(productId) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity--;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }
    updateCartUI();
};

// 🔄 4. Update Cart Sidebar UI Layout
function updateCartUI() {
    if (!cartItemsList || !cartTotalPrice || !navCart) return;
    cartItemsList.innerHTML = '';
    let total = 0;
    let totalItems = 0;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `<li class="cart-empty">Your cart is empty — go find something good!</li>`;
    }

    cart.forEach(item => {
        const itemPrice = parseFloat(item.price) || 0;
        const subtotal = itemPrice * item.quantity;
        total += subtotal;
        totalItems += item.quantity;

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-vendor">${vendorBadge(item.vendor)} ${item.vendor || ''}</span>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="decrementCartItem(${item.id})">−</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn" onclick="incrementCartItem(${item.id})">+</button>
            </div>
            <span class="cart-item-subtotal">$${subtotal.toFixed(2)}</span>
            <button class="remove-item-btn" onclick="removeFromCart(${item.id})" title="Remove">❌</button>
        `;
        cartItemsList.appendChild(li);
    });

    cartTotalPrice.textContent = `$${total.toFixed(2)}`;
    navCart.textContent = `Cart (${totalItems})`;
}

window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
};

// 🌐 5. Navigation View Switchers
function hideAllViews() {
    if (buyerView) buyerView.style.display = 'none';
    if (vendorView) vendorView.style.display = 'none';
    if (ordersView) ordersView.style.display = 'none';
    if (cartDrawer) cartDrawer.style.display = 'none';
}

if (navHome) {
    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllViews();
        if (buyerView) buyerView.style.display = 'block';
    });
}

if (navOrders) {
    navOrders.addEventListener('click', (e) => {
        e.preventDefault();
        const user = requireLogin("Log in to see your order history.");
        if (!user) return;

        hideAllViews();
        if (ordersView) ordersView.style.display = 'block';
        loadOrderHistory(user.username);
    });
}

if (navVendor) {
    navVendor.addEventListener('click', (e) => {
        e.preventDefault();
        const user = requireLogin("Log in to access the Vendor Portal.");
        if (!user) return;

        hideAllViews();
        if (vendorView) vendorView.style.display = 'block';

        const vendorNameField = document.getElementById('vendor-name');
        if (vendorNameField) vendorNameField.value = user.username;

        loadVendorDashboard(user.username);
    });
}

if (navCart) {
    navCart.addEventListener('click', (e) => {
        e.preventDefault();
        if (cartDrawer) {
            cartDrawer.style.display = cartDrawer.style.display === 'block' ? 'none' : 'block';
        }
    });
}

if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => {
        if (cartDrawer) cartDrawer.style.display = 'none';
    });
}

// 📜 Order history: fetch and render a buyer's past purchases
function loadOrderHistory(username) {
    if (!ordersList) return;
    ordersList.innerHTML = `<p>Loading your orders...</p>`;

    fetch(`/api/orders/${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(orders => {
            if (!orders || orders.length === 0) {
                ordersList.innerHTML = `
                    <div class="no-products-found">
                        <h3>📦 No orders yet</h3>
                        <p>Anything you buy will show up here.</p>
                    </div>
                `;
                return;
            }

            ordersList.innerHTML = orders.map(order => {
                const date = new Date(order.purchase_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                const itemsHtml = order.items.map(item => `
                    <li>
                        <span>${vendorBadge(item.vendor)} ${item.product_name} × ${item.quantity}</span>
                        <span>$${(parseFloat(item.price_each) * item.quantity).toFixed(2)}</span>
                    </li>
                `).join('');

                return `
                    <div class="order-card">
                        <div class="order-card-header">
                            <span>Order #${order.id} · ${date}</span>
                            <span class="order-total">$${parseFloat(order.total_price).toFixed(2)}</span>
                        </div>
                        <ul class="order-items-list">${itemsHtml}</ul>
                    </div>
                `;
            }).join('');
        })
        .catch(err => {
            console.error("Error loading order history:", err);
            ordersList.innerHTML = `<p>Something went wrong loading your orders. Please try again.</p>`;
        });
}

// 📊 Vendor dashboard: this vendor's own listings + sales stats
function loadVendorDashboard(vendor) {
    const statsContainer = document.getElementById('vendor-stats-table');
    const productsContainer = document.getElementById('vendor-products-grid');
    if (statsContainer) statsContainer.innerHTML = `<p>Loading your stats...</p>`;
    if (productsContainer) productsContainer.innerHTML = `<p>Loading your listings...</p>`;

    fetch(`/api/vendor/stats/${encodeURIComponent(vendor)}`)
        .then(res => res.json())
        .then(data => {
            const { products, stats } = data;

            // Stats table
            if (statsContainer) {
                if (!stats || stats.length === 0) {
                    statsContainer.innerHTML = `<p class="vendor-subtitle">No sales yet — once buyers check out, your numbers will show up here.</p>`;
                } else {
                    const totalRevenue = stats.reduce((sum, s) => sum + parseFloat(s.revenue), 0);
                    statsContainer.innerHTML = `
                        <table class="stats-table">
                            <thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                            <tbody>
                                ${stats.map(s => `
                                    <tr>
                                        <td>${s.product_name}</td>
                                        <td>${s.units_sold}</td>
                                        <td>$${parseFloat(s.revenue).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot><tr><td>Total</td><td></td><td>$${totalRevenue.toFixed(2)}</td></tr></tfoot>
                        </table>
                    `;
                }
            }

            // Your listings grid (re-uses the same card markup as the buyer grid, minus Add to Cart)
            if (productsContainer) {
                if (!products || products.length === 0) {
                    productsContainer.innerHTML = `<p class="vendor-subtitle">You haven't listed anything yet — use the form above to add your first product.</p>`;
                } else {
                    productsContainer.innerHTML = products.map(product => {
                        const finalImage = product.image && product.image.trim() !== "" ? product.image : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
                        return `
                            <div class="product-card">
                                <div class="stock-badge">Qty: ${product.stock}</div>
                                <div class="product-image-container"><img src="${finalImage}" alt="${product.name}"></div>
                                <div class="product-info">
                                    <h3>${product.name}</h3>
                                    <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                                </div>
                                <button class="edit-btn" onclick="openEditModal(${product.id})">✏️ Edit Product</button>
                            </div>
                        `;
                    }).join('');
                }
            }

            // Keep the global catalog in sync so Edit modal lookups work from this view too
            if (products && products.length) {
                products.forEach(p => {
                    const idx = productCatalog.findIndex(existing => existing.id === p.id);
                    if (idx >= 0) productCatalog[idx] = p; else productCatalog.push(p);
                });
            }
        })
        .catch(err => {
            console.error("Error loading vendor dashboard:", err);
            if (statsContainer) statsContainer.innerHTML = `<p>Something went wrong loading your stats.</p>`;
            if (productsContainer) productsContainer.innerHTML = `<p>Something went wrong loading your listings.</p>`;
        });
}

// 🔍 6. Search Filter Input Logic
if (searchBtn && buyerSearch) {
    searchBtn.addEventListener('click', () => {
        const query = buyerSearch.value.trim();
        const url = query ? `/api/products?search=${encodeURIComponent(query)}` : '/api/products';
        
        fetch(url)
            .then(res => res.json())
            .then(data => {
                productCatalog = data;
                
                if (!productCatalog || productCatalog.length === 0) {
                    productsGrid.innerHTML = `
                        <div class="no-products-found">
                            <h3>🔍 No products found matching "${query}"</h3>
                            <p>Try checking your spelling or search for something else!</p>
                        </div>
                    `;
                    return; 
                }
                renderProducts();
            })
            .catch(err => {
                console.error("Error searching products:", err);
                productsGrid.innerHTML = `<p>Something went wrong while searching. Please try again.</p>`;
            });
    });
}

// ➕ 7. Vendor Form Submission Handler
if (addProductForm) {
    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const user = requireLogin("Log in to list a product.");
        if (!user) return;
        
        const name = document.getElementById('product-name').value;
        const vendor = user.username; // vendor identity is always the logged-in user, not free text
        const price = document.getElementById('product-price').value;
        const stock = document.getElementById('product-stock').value;
        
        const imageField = document.getElementById('product-image');
        const image = imageField ? imageField.value.trim() : "";

        fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, vendor, price, stock, image })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Product listed successfully!");
                addProductForm.reset();
                location.reload(); 
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(err => console.error("Error adding product:", err));
    });
}

// 💳 8. Order Checkout Processor Link (now requires a logged-in buyer)
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert("Your cart is empty!");

        const user = requireLogin("Please log in to complete your purchase.");
        if (!user) return;
        
        const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
        
        fetch('/api/cart/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cartItems: cart,
                username: user.username,
                totalPrice: total
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(`Order placed! Order ID: ${data.orderId}`);
                cart = [];
                updateCartUI();
                if (cartDrawer) cartDrawer.style.display = 'none';
                location.reload();
            } else {
                alert("Checkout failed: " + data.message);
            }
        })
        .catch(err => console.error("Checkout submission error:", err));
    });
}

// 🚀 9. Initial Lifecycle Core Load Operation
document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch catalog products as normal
    fetch('/api/products')
        .then(res => res.json())
        .then(data => {
            productCatalog = data;
            renderProducts();
        })
        .catch(err => console.error("Error loading marketplace catalog summary:", err));

    // 🔒 2. Check for an authenticated user session memory
    checkAuthStatus();
    updateCartUI();
});

// New Helper Function to manage login UI state changes
function checkAuthStatus() {
    const authNavLink = document.getElementById('auth-nav-link');
    const user = getLoggedInUser();

    if (user) {
        // A. Transform the login link into a dynamic Logout button
        if (authNavLink) {
            authNavLink.textContent = `Logout (${user.username})`;
            authNavLink.href = '#';
            authNavLink.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('loggedInUser'); // 🔄 Wipe credentials on logout
                alert("Logged out successfully!");
                location.reload(); // Refresh to restore login view
            });
        }

        // B. Add a personalized welcome banner right above your product catalog section
        const buyerViewEl = document.getElementById('buyer-view');
        if (buyerViewEl && !document.getElementById('welcome-banner')) {
            const banner = document.createElement('div');
            banner.id = 'welcome-banner';
            banner.className = 'welcome-banner';
            banner.innerHTML = `<h2>👋 Welcome back, <strong>${user.username}</strong>! Happy shopping.</h2>`;
            
            // Insert banner at the top of the buyer view layout
            buyerViewEl.insertBefore(banner, buyerViewEl.firstChild);
        }
    }
}
