const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Blackpink@2016',
    database: 'marketplace_db',
    port: 3307
});

connection.connect((err) => {
    if (err) throw err;
    
    const createOrdersTableSQL = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    // 🧾 Line items for each order — lets us show exactly what was bought,
    // from which vendor, and at what price, even if the product is edited later.
    const createOrderItemsTableSQL = `
        CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT,
            product_name VARCHAR(255) NOT NULL,
            vendor VARCHAR(255) NOT NULL,
            quantity INT NOT NULL,
            price_each DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
    `;

    connection.query(createOrdersTableSQL, (err) => {
        if (err) throw err;
        console.log("🧾 Table 'orders' initialized successfully inside marketplace_db!");

        connection.query(createOrderItemsTableSQL, (err) => {
            if (err) throw err;
            console.log("📋 Table 'order_items' initialized successfully inside marketplace_db!");
            connection.end();
        });
    });
});