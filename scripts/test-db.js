require("dotenv").config();

const db = require("../src/db");

async function testConnection() {
    try {
        const [rows] = await db.query("SELECT DATABASE() AS database_name");
        console.log(`Connected to MySQL database: ${rows[0].database_name}`);
        process.exit(0);
    } catch (error) {
        console.error("Database connection failed:");
        console.error(error.message);
        process.exit(1);
    }
}

testConnection();
