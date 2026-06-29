require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function applyMigration() {
    const sql = fs.readFileSync(path.join(__dirname, "erd-migration.sql"), "utf8");

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "book_shop",
        multipleStatements: true
    });

    try {
        await connection.query(sql);
        console.log("ERD migration completed.");
    } finally {
        await connection.end();
    }
}

applyMigration().catch((error) => {
    console.error("ERD migration failed:");
    console.error(error.message);
    process.exit(1);
});
