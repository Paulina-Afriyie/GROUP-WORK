require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function setupDatabase() {
    const sql = fs.readFileSync(path.join(__dirname, "database.sql"), "utf8");

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        multipleStatements: true
    });

    try {
        await connection.query(sql);
        console.log("Database setup completed.");
    } finally {
        await connection.end();
    }
}

setupDatabase().catch((error) => {
    console.error("Database setup failed:");
    console.error(error.message);
    process.exit(1);
});
