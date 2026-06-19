require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) {
        console.log("\n=============================================");
        console.log("❌ CONNECTION FAILED!");
        console.log("Error Code:", err.code);
        console.log("Error Message:", err.message);
        console.log("=============================================\n");
    } else {
        console.log('\n🎉 SUCCESS! Connected to MySQL perfectly on Port 3307!\n');
    }
    try { connection.destroy(); } catch(e) {}
});