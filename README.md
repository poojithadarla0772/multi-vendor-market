# 🛒 Global Market - Multi-Vendor Marketplace

Welcome to **Global Market**, a lightweight, high-performance Full-Stack Multi-Vendor Marketplace web application. Built with a native JavaScript frontend and a robust Node.js/Express backend powered by a MySQL database pool, this application provides an interactive workspace for both standard shoppers and individual storefront merchants.

---

## ✨ Core Features

### 👤 User Roles & Authentication
* **Secure Registration & Login:** Powered by `bcrypt` password hashing to keep user profiles completely protected.
* **Role-Based Access Control:** Separate layouts and capabilities for **Buyers** and **Vendors** driven dynamically through database security layers.
* **Client State Storage:** Uses browser `localStorage` to retain continuous active sessions, updating navigation link metrics and user welcome banners.

### 🛍️ Buyer Capabilities
* **Dynamic Catalog Loading:** Browse through fully populated product grids managed instantly from the server.
* **Live Marketplace Filters:** Query, find, and match products, specific vendor brands, or categories using live search parameters.
* **Interactive Shopping Cart:** Real-time sliding cart drawer containing calculated pricing adjustments, current stock protections, and seamless increments.
* **Order Logging:** Tracks specific line-item metrics, preserving transaction states even if parent products are later modified.

### 👑 Vendor Capabilities
* **Storefront Dashboard:** Secure panel optimized explicitly for active product configurations.
* **Inventory Launchpad:** Create new products complete with custom branding, dynamic stock caps, and modular display URLs.
* **Live Editing Control:** Inline administrative tools (`✏️ Edit Product`) allowing vendors to dynamically manipulate prices, stock values, or metadata on their own unique products.

---

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3 (Modern Google Fonts Integration), Vanilla JavaScript (ES6+ App Lifecycles).
* **Backend Runtime:** Node.js, Express.js.
* **Database Environment:** MySQL 8.x (Port `3307` connection tier managed with a thread connection pool).
* **Security Stack:** `bcrypt` cryptography encryption layers.

---

## 📁 Repository Directory Structure

```text
doremi/
├── public/                 # Client assets folder
│   ├── index.html          # Marketplace core application hub
│   ├── login.html          # Authentication gate and registration management
│   ├── app.js              # State initialization and UI lifecycle management
│   └── style.css           # UI design layout tokens and custom animations
├── .env                    # Local environment secrets configuration (Hidden)
├── .gitignore              # Dependency ignore lists tracking
├── init-db.js              # Database initialization and product catalog seeds
├── init-users.js           # Security configuration table schema validation
├── init-orders.js          # Checkout logging structure configuration
├── package.json            # Node.js project manifest and script records
└── server.js               # Application Entrypoint, Routing Controllers, and Pool# multi-vendor-market
