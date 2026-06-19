require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) throw err;
    
    const createUsersTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'buyer'
        );
    `;

    connection.query(createUsersTableSQL, (err) => {
        if (err) throw err;
        console.log("🔒 Table 'users' verified and ready in marketplace_db!");
        connection.end();
    });
});