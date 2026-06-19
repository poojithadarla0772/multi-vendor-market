require('dotenv').config();
const mysql = require('mysql2');

// Connect to the base MySQL server
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL server...");

    // 1. Create the Database if it doesn't exist
    connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
        if (err) throw err;
        console.log(`🎉 Database '${process.env.DB_NAME}' ready!`);

        // 2. Switch to our new database
        connection.changeUser({ database: process.env.DB_NAME }, (err) => {
            if (err) throw err;

            // 3. Create the products table structure
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    vendor VARCHAR(255) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    stock INT NOT NULL,
                    image VARCHAR(500) DEFAULT 'https://via.placeholder.com/150'
                );
            `;

            connection.query(createTableSQL, (err) => {
                if (err) throw err;
                console.log("📦 Table 'products' verified and ready!");

                // 4. Seed with initial mock data if table is completely empty
                connection.query("SELECT COUNT(*) AS total FROM products", (err, results) => {
                    if (err) throw err;

                    if (results[0].total === 0) {
                        const seedSQL = `
                            INSERT INTO products (name, vendor, price, stock) VALUES 
                            ('Vintage Leather Journal', 'ArtisansHub', 25.00, 10),
                            ('Wireless Ergonomic Mouse', 'TechWorld', 45.50, 15),
                            ('Organic Lavender Soap', 'NaturePure', 8.00, 40),
                            ('Handwoven Cotton Throw Blanket', 'ArtisansHub', 60.00, 5);
                        `;
                        connection.query(seedSQL, (err) => {
                            if (err) throw err;
                            console.log("🌱 Seed data populated successfully!");
                            connection.end();
                        });
                    } else {
                        console.log("✨ Products table already has data. Skipping seed.");
                        connection.end();
                    }
                });
            });
        });
    });
});