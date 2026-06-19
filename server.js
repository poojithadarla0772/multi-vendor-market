const express = require('express');
const mysql = require('mysql2'); 
const path = require('path');
const bcrypt = require('bcrypt'); // Added bcrypt for password hashing
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Serves your index.html automatically

// 🗄️ Establish MySQL Connection Pool on Port 3307
const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'Blackpink@2016',
    database: 'marketplace_db',
    port: 3307,
    decimalNumbers: true, 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 🔍 API Endpoint: Fetch and Filter Products (Includes Image Retrieval)
app.get('/api/products', (req, res) => {
    const searchQuery = req.query.search;
    
    if (searchQuery) {
        // 🔄 Mapped to include 'image' from your schema safely
        const sql = `
            SELECT id, name, vendor, price, stock, image 
            FROM products 
            WHERE name LIKE ?
        `;
        const wildCardQuery = `%${searchQuery}%`; 
        
        db.query(sql, [wildCardQuery], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database failed to search products' });
            }
            res.json(results);
        });
    } else {
        // 🔄 Mapped to include 'image' from your schema safely
        db.query('SELECT id, name, vendor, price, stock, image FROM products', (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database failed to fetch products' });
            }
            res.json(results);
        });
    }
});

// 🛒 API Endpoint: Handle Secure Checkout and Record Orders
app.post('/api/cart/checkout', (req, res) => {
    const { cartItems, username, totalPrice } = req.body; 
    
    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty!" });
    }

    // Checkout requires a real, logged-in buyer — no more silent "Guest Buyer" orders
    if (!username) {
        return res.status(401).json({ success: false, message: "Please log in before checking out." });
    }

    // 1. First insert a record into our orders table
    const insertOrderSQL = 'INSERT INTO orders (username, total_price) VALUES (?, ?)';
    
    db.query(insertOrderSQL, [username, totalPrice], (err, orderResult) => {
        if (err) {
            console.error("Order creation failed:", err);
            return res.status(500).json({ success: false, message: "Failed to generate order invoice." });
        }

        const orderId = orderResult.insertId;

        // 2. Record a line item for each product so order history shows exactly what was bought
        const insertItemSQL = 'INSERT INTO order_items (order_id, product_id, product_name, vendor, quantity, price_each) VALUES (?, ?, ?, ?, ?, ?)';
        const updateStockSQL = 'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?';
        let completedQueries = 0;
        let errorsOccurred = false;

        cartItems.forEach(item => {
            // 3. Deduct stock and log the line item in parallel
            db.query(updateStockSQL, [item.quantity, item.id, item.quantity], (err, result) => {
                if (err || result.affectedRows === 0) {
                    console.error(`Stock update failed for item ID ${item.id}`);
                    errorsOccurred = true;
                }
            });

            db.query(insertItemSQL, [orderId, item.id, item.name, item.vendor, item.quantity, item.price], (err) => {
                completedQueries++;
                if (err) {
                    console.error(`Order item logging failed for item ID ${item.id}:`, err);
                    errorsOccurred = true;
                }

                // 4. Once all async loop operations finish, return final status along with Order ID
                if (completedQueries === cartItems.length) {
                    if (errorsOccurred) {
                        return res.status(500).json({ success: false, message: "Order processed, but some item details failed to save accurately." });
                    }
                    res.json({ 
                        success: true, 
                        message: "Purchase completed successfully!", 
                        orderId: orderId 
                    });
                }
            });
        });
    });
});

// ➕ API Endpoint: Allow Vendors to Add a New Product (With Optional Image Logic)
app.post('/api/products', (req, res) => {
    const { name, vendor, price, stock, image } = req.body;

    if (!name || !vendor || !price || !stock) {
        return res.status(400).json({ success: false, message: "All fields except image are required!" });
    }

    // 🔄 Fallback to placeholder if image field was submitted empty/blank
    const defaultImage = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
    const finalImage = image && image.trim() !== "" ? image.trim() : defaultImage;

    const insertSQL = `
        INSERT INTO products (name, vendor, price, stock, image) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(insertSQL, [name, vendor, parseFloat(price), parseInt(stock), finalImage], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database insertion failed." });
        }

        const newProduct = {
            id: result.insertId, 
            name,
            vendor,
            price: parseFloat(price),
            stock: parseInt(stock),
            image: finalImage
        };
        
        res.json({ success: true, message: "Product listed successfully!", product: newProduct });
    });
});
// 🔄 PUT Endpoint to update an existing product row listing
app.put('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const { name, price, stock, image } = req.body;

    const query = `
        UPDATE products 
        SET name = ?, price = ?, stock = ?, image = ? 
        WHERE id = ?
    `;

    db.query(query, [name, price, stock, image, productId], (err, result) => {
        if (err) {
            console.error("Database error updating product listing:", err);
            return res.status(500).json({ success: false, message: "Database update process dropped." });
        }
        res.json({ success: true, message: "Product record saved smoothly!" });
    });
});

/* ==========================================================================
   📜 ORDER HISTORY & VENDOR SALES STATS
   ========================================================================== */

// 📜 GET Endpoint: Fetch a buyer's order history, grouped with line items
app.get('/api/orders/:username', (req, res) => {
    const { username } = req.params;

    const sql = `
        SELECT o.id AS order_id, o.total_price, o.purchase_date,
               oi.product_name, oi.vendor, oi.quantity, oi.price_each
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.username = ?
        ORDER BY o.purchase_date DESC, o.id DESC
    `;

    db.query(sql, [username], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database failed to fetch order history' });
        }

        // Group flat rows into { id, total_price, purchase_date, items: [...] }
        const ordersById = new Map();
        rows.forEach(row => {
            if (!ordersById.has(row.order_id)) {
                ordersById.set(row.order_id, {
                    id: row.order_id,
                    total_price: row.total_price,
                    purchase_date: row.purchase_date,
                    items: []
                });
            }
            ordersById.get(row.order_id).items.push({
                product_name: row.product_name,
                vendor: row.vendor,
                quantity: row.quantity,
                price_each: row.price_each
            });
        });

        res.json(Array.from(ordersById.values()));
    });
});

// 📊 GET Endpoint: A vendor's own listings plus per-product sales stats
app.get('/api/vendor/stats/:vendor', (req, res) => {
    const { vendor } = req.params;

    const productsSQL = 'SELECT id, name, vendor, price, stock, image FROM products WHERE vendor = ?';
    const statsSQL = `
        SELECT product_name, SUM(quantity) AS units_sold, SUM(quantity * price_each) AS revenue
        FROM order_items
        WHERE vendor = ?
        GROUP BY product_name
    `;

    db.query(productsSQL, [vendor], (err, products) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database failed to fetch vendor products' });
        }

        db.query(statsSQL, [vendor], (err, stats) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database failed to fetch vendor sales stats' });
            }

            res.json({ products, stats });
        });
    });
});

/* ==========================================================================
   🔒 ACCREDITED USER AUTHENTICATION ENDPOINTS (BCRYPT HOOKS)
   ========================================================================== */

// 📝 1. REGISTER ENDPOINT (Sign Up)
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
    }

    try {
        // Scramble the password securely using bcrypt (salting factor of 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUserSQL = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(insertUserSQL, [username, hashedPassword], (err, result) => {
            if (err) {
                // If username already exists in database due to the UNIQUE constraint
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ success: false, message: "Username already taken!" });
                }
                console.error(err);
                return res.status(500).json({ success: false, message: "Registration failed." });
            }
            res.json({ success: true, message: "User registered successfully!" });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

// 🔑 2. LOGIN ENDPOINT
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password required" });
    }

    const findUserSQL = 'SELECT * FROM users WHERE username = ?';
    db.query(findUserSQL, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database login failure." });
        }

        // If no matching profile row was found
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid username or password." });
        }

        const user = results[0];

        // Safe comparison of incoming plaintext password against database scrambled string
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid username or password." });
        }

        // Success match validated
        res.json({ 
            success: true, 
            message: `Welcome back, ${user.username}!`, 
            user: { id: user.id, username: user.username, role: user.role } 
        });
    });
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Marketplace running beautifully on http://localhost:${PORT}`);
});