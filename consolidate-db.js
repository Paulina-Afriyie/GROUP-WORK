require("dotenv").config();

const mysql = require("mysql2/promise");

async function tableExists(connection, tableName) {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
    );

    return rows[0].total > 0;
}

async function columnExists(connection, tableName, columnName) {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );

    return rows[0].total > 0;
}

async function addColumnIfMissing(connection, tableName, columnName, definition) {
    if (await columnExists(connection, tableName, columnName)) return;
    await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
}

async function consolidateDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "book_shop",
        multipleStatements: true
    });

    try {
        await addColumnIfMissing(connection, "product", "product_author", "VARCHAR(100) NULL");
        await addColumnIfMissing(connection, "product", "product_image", "VARCHAR(255) NULL");

        if (await tableExists(connection, "categories")) {
            await connection.query(`
                INSERT INTO category (category_name)
                SELECT name FROM categories
                ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)
            `);
        }

        if (await tableExists(connection, "suppliers")) {
            await connection.query(`
                INSERT INTO supplier (supplier_name, supplier_address, supplier_phone_number)
                SELECT supplier_name, address, phone_number FROM suppliers
                WHERE NOT EXISTS (
                    SELECT 1 FROM supplier WHERE supplier.supplier_name = suppliers.supplier_name
                )
            `);
        }

        if (await tableExists(connection, "books")) {
            await connection.query(`
                INSERT INTO product (
                    product_name,
                    product_author,
                    product_price,
                    product_quantity_in_stock,
                    product_image,
                    category_ID
                )
                SELECT
                    books.title,
                    books.author,
                    books.price,
                    books.stock,
                    books.image,
                    category.category_ID
                FROM books
                LEFT JOIN category ON category.category_name = books.category
                WHERE NOT EXISTS (
                    SELECT 1 FROM product WHERE product.product_name = books.title
                )
            `);

            await connection.query(`
                UPDATE product
                INNER JOIN books ON books.title = product.product_name
                SET
                    product.product_author = books.author,
                    product.product_image = books.image,
                    product.product_price = books.price,
                    product.product_quantity_in_stock = books.stock
            `);
        }

        await connection.query(`
            INSERT INTO customer (customer_name, customer_email)
            SELECT fullname, email FROM users
            WHERE role = 'user'
            ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name)
        `);

        await connection.query(`
            INSERT INTO staff (staff_name, staff_username, staff_role, staff_password)
            SELECT fullname, email, role, password_hash FROM users
            WHERE role = 'admin'
            ON DUPLICATE KEY UPDATE
                staff_name = VALUES(staff_name),
                staff_role = VALUES(staff_role),
                staff_password = VALUES(staff_password)
        `);

        await connection.query("DROP TABLE IF EXISTS books");
        await connection.query("DROP TABLE IF EXISTS categories");
        await connection.query("DROP TABLE IF EXISTS suppliers");

        console.log("Database consolidated. Old duplicate tables removed.");
    } finally {
        await connection.end();
    }
}

consolidateDatabase().catch((error) => {
    console.error("Database consolidation failed:");
    console.error(error.message);
    process.exit(1);
});
