require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const db = require("./src/db");

const app = express();
const port = process.env.PORT || 3000;

const imageUploadDir = path.join(__dirname, "public", "images");
if (!fs.existsSync(imageUploadDir)) {
    fs.mkdirSync(imageUploadDir, { recursive: true });
}

const upload = multer({
    storage: multer.diskStorage({
        destination: imageUploadDir,
        filename: (req, file, cb) => {
            const safeName = file.originalname
                .replace(/\s+/g, "-")
                .replace(/[^a-zA-Z0-9._-]/g, "");
            const extension = path.extname(safeName) || ".jpg";
            const base = path.basename(safeName, extension);
            cb(null, `${base}-${Date.now()}${extension}`);
        }
    })
});

const smtpConfigured = Boolean(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
);

let mailTransporter;
let emailTransportReady = false;
let emailTransportDetails = '';

async function initializeMailTransporter() {
    if (smtpConfigured) {
        mailTransporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === "true",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        try {
            await mailTransporter.verify();
            emailTransportReady = true;
            emailTransportDetails = `SMTP:${process.env.EMAIL_HOST}`;
            console.log("SMTP transporter is configured and ready to send emails.");
        } catch (error) {
            console.error("SMTP verification failed:", error);
            emailTransportReady = false;
        }
    } else {
        try {
            const testAccount = await nodemailer.createTestAccount();
            mailTransporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            emailTransportReady = true;
            emailTransportDetails = `Ethereal (${testAccount.user})`;
            console.log("No SMTP settings detected. Using Ethereal test account for email previews.");
        } catch (error) {
            console.error("Could not create Ethereal test account:", error);
            emailTransportReady = false;
        }
    }
}

initializeMailTransporter();

async function sendCustomerEmail(to, subject, html) {
    if (!to) {
        console.warn("No recipient email provided, skipping email send.");
        return;
    }
    if (!emailTransportReady || !mailTransporter) {
        console.warn("Email transport is not ready. Skipping email send.");
        return;
    }
    try {
        const info = await mailTransporter.sendMail({
            from: process.env.EMAIL_FROM || "Bookshop <no-reply@bookshop.com>",
            to,
            subject,
            html
        });
        console.log(`Email sent to ${to} (${subject}) - messageId=${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`Preview URL: ${previewUrl}`);
        }
    } catch (error) {
        console.error("Email send error:", error);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/version", (req, res) => {
    res.json({
        application: "bookshop",
        version: "2.0",
        supportsImageUpload: true,
        supportsEmail: true
    });
});

function emptyToNull(value) {
    return value === "" || value === undefined ? null : value;
}

app.get("/api/books", async (req, res) => {
    try {
        const [books] = await db.query(`
            SELECT
                product.product_ID AS id,
                product.product_name AS title,
                COALESCE(product.product_author, 'Unknown Author') AS author,
                product.product_price AS price,
                category.category_name AS category,
                COALESCE(product.product_image, 'images/dd.jpg') AS image,
                product.product_quantity_in_stock AS stock
            FROM product
            LEFT JOIN category ON category.category_ID = product.category_ID
            ORDER BY product.product_ID DESC
        `);
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: "Could not load books." });
    }
});

app.post("/api/signup", async (req, res) => {
    try {
        const { fullname, email, password, role = "user" } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({ message: "Full name, email, and password are required." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users (fullname, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [fullname, email, passwordHash, role === "admin" ? "admin" : "user"]
        );

        if (role === "admin") {
            await db.query(
                `INSERT INTO staff (staff_name, staff_username, staff_role, staff_password)
                 VALUES (?, ?, 'admin', ?)
                 ON DUPLICATE KEY UPDATE staff_name = VALUES(staff_name), staff_password = VALUES(staff_password)`,
                [fullname, email, passwordHash]
            );
        } else {
            await db.query(
                `INSERT INTO customer (customer_name, customer_email)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name)`,
                [fullname, email]
            );

            const welcomeHtml = `
                <h2>Welcome to Bookshop, ${fullname}!</h2>
                <p>Your account has been created successfully.</p>
                <p>Start shopping now and enjoy great book deals.</p>
            `;
            await sendCustomerEmail(email, 'Welcome to Bookshop', welcomeHtml);
        }

        res.status(201).json({ message: "Account created successfully." });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Email already exists." });
        }

        res.status(500).json({ message: "Could not create account." });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const [users] = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
        const user = users[0];

        if (!user || user.role !== role) {
            return res.status(401).json({ message: "Invalid login details." });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({ message: "Invalid login details." });
        }

        res.json({
            message: "Login successful.",
            user: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                role: user.role
            }
        });

        const loginEmailHtml = `
            <h2>Welcome back, ${user.fullname || 'Bookshop Customer'}!</h2>
            <p>You have successfully signed in to Bookshop Online Checkout System.</p>
            <p>If this wasn't you, please contact support immediately.</p>
        `;
        sendCustomerEmail(user.email, 'Bookshop Login Notification', loginEmailHtml);
    } catch (error) {
        res.status(500).json({ message: "Could not log in." });
    }
});

const adminLists = {
    staff: `
        SELECT staff_ID, staff_name, staff_username, staff_role
        FROM staff
        ORDER BY staff_ID DESC
    `,
    products: `
        SELECT
            product.product_ID,
            product.product_name,
            product.product_author,
            product.product_price,
            product.product_quantity_in_stock,
            product.supplier_ID,
            product.category_ID,
            product.product_image
        FROM product
        ORDER BY product.product_ID DESC
    `,
    category: `
        SELECT category_ID, category_name
        FROM category
        ORDER BY category_ID DESC
    `,
    suppliers: `
        SELECT supplier_ID, supplier_name, supplier_address, supplier_phone_number
        FROM supplier
        ORDER BY supplier_ID DESC
    `,
    customers: `
        SELECT customer_ID, customer_name, customer_address, customer_phone_number, customer_email
        FROM customer
        ORDER BY customer_ID DESC
    `,
    sales: `
        SELECT sales_ID, sales_date, sales_total_amount, staff_ID, customer_ID
        FROM sales
        ORDER BY sales_ID DESC
    `,
    salesDetails: `
        SELECT sales_details_ID, sales_ID, product_ID, sales_details_quantity, sales_details_price
        FROM sales_details
        ORDER BY sales_details_ID DESC
    `,
    stock: `
        SELECT product_ID, product_name, product_author, product_quantity_in_stock, product_price
        FROM product
        WHERE product_quantity_in_stock > 0
        ORDER BY product_ID DESC
    `,
    out: `
        SELECT product_ID, product_name, supplier_ID, 'Out of stock' AS status
        FROM product
        WHERE product_quantity_in_stock <= 0
        ORDER BY product_ID DESC
    `
};

app.get("/api/admin/:section", async (req, res) => {
    try {
        const query = adminLists[req.params.section];

        if (!query) {
            return res.status(404).json({ message: "Unknown admin section." });
        }

        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Could not load admin records." });
    }
});

app.post("/api/admin/category", async (req, res) => {
    try {
        const { category_name } = req.body;

        if (!category_name) {
            return res.status(400).json({ message: "Category name is required." });
        }

        await db.query("INSERT INTO category (category_name) VALUES (?)", [category_name]);
        res.status(201).json({ message: "Category added." });
    } catch (error) {
        res.status(500).json({ message: "Could not add category." });
    }
});

app.post("/api/admin/suppliers", async (req, res) => {
    try {
        const { supplier_name, supplier_address, supplier_phone_number } = req.body;

        if (!supplier_name) {
            return res.status(400).json({ message: "Supplier name is required." });
        }

        await db.query(
            "INSERT INTO supplier (supplier_name, supplier_address, supplier_phone_number) VALUES (?, ?, ?)",
            [supplier_name, emptyToNull(supplier_address), emptyToNull(supplier_phone_number)]
        );

        res.status(201).json({ message: "Supplier added." });
    } catch (error) {
        res.status(500).json({ message: "Could not add supplier." });
    }
});

app.post("/api/admin/products", upload.single("product_image"), async (req, res) => {
    try {
        const file = req.file;
        const {
            product_name,
            product_author,
            product_price,
            product_quantity_in_stock,
            supplier_ID,
            category_ID,
            product_image
        } = req.body;

        if (!product_name || product_price === undefined) {
            return res.status(400).json({ message: "Product name and price are required." });
        }

        const storedImagePath = file ? `images/${file.filename}` : product_image;

        const [result] = await db.query(
            `INSERT INTO product (
                product_name,
                product_author,
                product_price,
                product_quantity_in_stock,
                supplier_ID,
                category_ID,
                product_image
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                product_name,
                emptyToNull(product_author),
                product_price,
                product_quantity_in_stock || 0,
                emptyToNull(supplier_ID),
                emptyToNull(category_ID),
                emptyToNull(storedImagePath)
            ]
        );

        const insertedId = result && result.insertId ? result.insertId : null;
        res.status(201).json({ message: "Product added.", product_ID: insertedId, product_image: storedImagePath });
    } catch (error) {
        console.error("Add product error:", error);
        res.status(500).json({ message: "Could not add product." });
    }
});

app.post("/api/admin/customers", async (req, res) => {
    try {
        const { customer_name, customer_address, customer_phone_number, customer_email } = req.body;

        if (!customer_name || !customer_email) {
            return res.status(400).json({ message: "Customer name and email are required." });
        }

        await db.query(
            `INSERT INTO customer (
                customer_name,
                customer_address,
                customer_phone_number,
                customer_email
            ) VALUES (?, ?, ?, ?)`,
            [
                customer_name,
                emptyToNull(customer_address),
                emptyToNull(customer_phone_number),
                customer_email
            ]
        );

        res.status(201).json({ message: "Customer added." });
    } catch (error) {
        res.status(500).json({ message: "Could not add customer." });
    }
});

app.post("/api/admin/staff", async (req, res) => {
    try {
        const { staff_name, staff_username, staff_role, staff_password } = req.body;

        if (!staff_name || !staff_username || !staff_role || !staff_password) {
            return res.status(400).json({ message: "All staff fields are required." });
        }

        const passwordHash = await bcrypt.hash(staff_password, 10);

        await db.query(
            `INSERT INTO staff (staff_name, staff_username, staff_role, staff_password)
             VALUES (?, ?, ?, ?)`,
            [staff_name, staff_username, staff_role, passwordHash]
        );

        await db.query(
            `INSERT INTO users (fullname, email, password_hash, role)
             VALUES (?, ?, ?, 'admin')
             ON DUPLICATE KEY UPDATE
                fullname = VALUES(fullname),
                password_hash = VALUES(password_hash),
                role = 'admin'`,
            [staff_name, staff_username, passwordHash]
        );

        res.status(201).json({ message: "Staff member added." });
    } catch (error) {
        res.status(500).json({ message: "Could not add staff member." });
    }
});

app.put("/api/admin/:section/:id", upload.single("product_image"), async (req, res) => {
    try {
        const { section, id } = req.params;
        const payload = req.body;

        switch (section) {
            case 'category': {
                const { category_name } = payload;
                if (!category_name) return res.status(400).json({ message: 'Category name is required.' });
                await db.query('UPDATE category SET category_name = ? WHERE category_ID = ?', [category_name, id]);
                return res.json({ message: 'Category updated.' });
            }
            case 'suppliers': {
                const { supplier_name, supplier_address, supplier_phone_number } = payload;
                if (!supplier_name) return res.status(400).json({ message: 'Supplier name is required.' });
                await db.query(
                    'UPDATE supplier SET supplier_name = ?, supplier_address = ?, supplier_phone_number = ? WHERE supplier_ID = ?',
                    [supplier_name, emptyToNull(supplier_address), emptyToNull(supplier_phone_number), id]
                );
                return res.json({ message: 'Supplier updated.' });
            }
            case 'products': {
                const { product_name, product_author, product_price, product_quantity_in_stock, supplier_ID, category_ID, product_image } = payload;
                const file = req.file;
                const storedImagePath = file ? `images/${file.filename}` : product_image;
                if (!product_name || product_price === undefined) return res.status(400).json({ message: 'Product name and price are required.' });
                await db.query(
                    `UPDATE product SET
                        product_name = ?,
                        product_author = ?,
                        product_price = ?,
                        product_quantity_in_stock = ?,
                        supplier_ID = ?,
                        category_ID = ?,
                        product_image = COALESCE(?, product_image)
                     WHERE product_ID = ?`,
                    [
                        product_name,
                        emptyToNull(product_author),
                        product_price,
                        product_quantity_in_stock || 0,
                        emptyToNull(supplier_ID),
                        emptyToNull(category_ID),
                        emptyToNull(storedImagePath),
                        id
                    ]
                );
                return res.json({ message: 'Product updated.' });
            }
            case 'customers': {
                const { customer_name, customer_address, customer_phone_number, customer_email } = payload;
                if (!customer_name || !customer_email) return res.status(400).json({ message: 'Customer name and email are required.' });
                await db.query(
                    `UPDATE customer SET
                        customer_name = ?,
                        customer_address = ?,
                        customer_phone_number = ?,
                        customer_email = ?
                     WHERE customer_ID = ?`,
                    [customer_name, emptyToNull(customer_address), emptyToNull(customer_phone_number), customer_email, id]
                );
                return res.json({ message: 'Customer updated.' });
            }
            case 'staff': {
                const { staff_name, staff_username, staff_role, staff_password, original_staff_username } = payload;
                if (!staff_name || !staff_username || !staff_role) return res.status(400).json({ message: 'Staff name, username, and role are required.' });
                const originalEmail = original_staff_username || staff_username;
                await db.query(
                    `UPDATE staff SET
                        staff_name = ?,
                        staff_username = ?,
                        staff_role = ?
                     WHERE staff_ID = ?`,
                    [staff_name, staff_username, staff_role, id]
                );
                if (staff_password) {
                    const passwordHash = await bcrypt.hash(staff_password, 10);
                    await db.query('UPDATE staff SET staff_password = ? WHERE staff_ID = ?', [passwordHash, id]);
                    await db.query(
                        `UPDATE users SET fullname = ?, email = ?, password_hash = ? WHERE email = ?`,
                        [staff_name, staff_username, passwordHash, originalEmail]
                    );
                } else {
                    await db.query(
                        `UPDATE users SET fullname = ?, email = ? WHERE email = ?`,
                        [staff_name, staff_username, originalEmail]
                    );
                }
                return res.json({ message: 'Staff member updated.' });
            }
            case 'sales': {
                const { sales_date, sales_total_amount, staff_ID, customer_ID } = payload;
                if (sales_total_amount === undefined) return res.status(400).json({ message: 'Total amount is required.' });
                await db.query(
                    `UPDATE sales SET
                        sales_date = COALESCE(?, sales_date),
                        sales_total_amount = ?,
                        staff_ID = ?,
                        customer_ID = ?
                     WHERE sales_ID = ?`,
                    [emptyToNull(sales_date), sales_total_amount, emptyToNull(staff_ID), emptyToNull(customer_ID), id]
                );
                return res.json({ message: 'Sale updated.' });
            }
            default:
                return res.status(404).json({ message: 'Update not supported for this section.' });
        }
    } catch (error) {
        console.error('Update error', error);
        res.status(500).json({ message: 'Could not update record.' });
    }
});

function isForeignKeyError(error) {
    return error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451);
}

app.delete("/api/admin/:section/:id", async (req, res) => {
    try {
        const { section, id } = req.params;

        switch (section) {
            case 'category': {
                await db.query('DELETE FROM category WHERE category_ID = ?', [id]);
                return res.json({ message: 'Category deleted.' });
            }
            case 'suppliers': {
                await db.query('DELETE FROM supplier WHERE supplier_ID = ?', [id]);
                return res.json({ message: 'Supplier deleted.' });
            }
            case 'products': {
                await db.query('DELETE FROM product WHERE product_ID = ?', [id]);
                return res.json({ message: 'Product deleted.' });
            }
            case 'customers': {
                await db.query('DELETE FROM customer WHERE customer_ID = ?', [id]);
                return res.json({ message: 'Customer deleted.' });
            }
            case 'staff': {
                const [[userRow]] = await db.query('SELECT staff_username FROM staff WHERE staff_ID = ?', [id]);
                const staffUsername = userRow ? userRow.staff_username : null;
                await db.query('DELETE FROM staff WHERE staff_ID = ?', [id]);
                if (staffUsername) await db.query('DELETE FROM users WHERE email = ?', [staffUsername]);
                return res.json({ message: 'Staff member deleted.' });
            }
            case 'sales': {
                await db.query('DELETE FROM sales_details WHERE sales_ID = ?', [id]);
                const [result] = await db.query('DELETE FROM sales WHERE sales_ID = ?', [id]);
                if (result && result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Sale record not found.' });
                }
                return res.json({ message: 'Sale deleted.' });
            }
            case 'salesDetails': {
                const [result] = await db.query('DELETE FROM sales_details WHERE sales_details_ID = ?', [id]);
                if (result && result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Sale detail record not found.' });
                }
                return res.json({ message: 'Sale detail deleted.' });
            }
            default:
                return res.status(404).json({ message: 'Delete not supported for this section.' });
        }
    } catch (error) {
        console.error('Delete error', error);
        if (isForeignKeyError(error)) {
            return res.status(409).json({
                message: 'Cannot delete this record because it is still referenced by other records. Remove dependent records first.'
            });
        }
        res.status(500).json({ message: 'Could not delete record.' });
    }
});

app.post("/api/admin/sales", async (req, res) => {
    try {
        const { sales_date, sales_total_amount, staff_ID, customer_ID } = req.body;

        const [result] = await db.query(
            `INSERT INTO sales (sales_date, sales_total_amount, staff_ID, customer_ID)
             VALUES (COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)`,
            [
                emptyToNull(sales_date),
                sales_total_amount || 0,
                emptyToNull(staff_ID),
                emptyToNull(customer_ID)
            ]
        );

        const insertedId = result && result.insertId ? result.insertId : null;
        res.status(201).json({ message: "Sale added.", sales_ID: insertedId });
    } catch (error) {
        res.status(500).json({ message: "Could not add sale." });
    }
});

app.post("/api/admin/salesDetails", async (req, res) => {
    try {
        const { sales_ID, product_ID, sales_details_quantity, sales_details_price } = req.body;

        if (!sales_ID || !product_ID || !sales_details_quantity || sales_details_price === undefined) {
            return res.status(400).json({ message: "Sale, product, quantity, and price are required." });
        }

        await db.query(
            `INSERT INTO sales_details (
                sales_ID,
                product_ID,
                sales_details_quantity,
                sales_details_price
            ) VALUES (?, ?, ?, ?)`,
            [sales_ID, product_ID, sales_details_quantity, sales_details_price]
        );

        await db.query(
            `UPDATE product
             SET product_quantity_in_stock = GREATEST(product_quantity_in_stock - ?, 0)
             WHERE product_ID = ?`,
            [sales_details_quantity, product_ID]
        );

        res.status(201).json({ message: "Sale detail added." });
    } catch (error) {
        res.status(500).json({ message: "Could not add sale detail." });
    }
});

app.post("/api/admin/checkout", async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { cart, sales_total_amount, customer_info } = req.body;

        if (!Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ message: "Cart is empty." });
        }

        if (sales_total_amount === undefined) {
            return res.status(400).json({ message: "Total amount is required." });
        }

        const customerEmail = customer_info && customer_info.email ? customer_info.email : null;
        const customerName = customer_info && customer_info.fullname ? customer_info.fullname : "Customer";

        await connection.beginTransaction();

        let customerId = null;
        if (customerEmail) {
            // Check if customer exists, or insert them if they don't
            await connection.query(
                `INSERT INTO customer (customer_name, customer_email)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE customer_name = COALESCE(customer.customer_name, VALUES(customer_name))`,
                [customerName, customerEmail]
            );
            const [custRows] = await connection.query("SELECT customer_ID FROM customer WHERE customer_email = ? LIMIT 1", [customerEmail]);
            if (custRows.length > 0) {
                customerId = custRows[0].customer_ID;
            }
        }

        const [saleResult] = await connection.query(
            `INSERT INTO sales (sales_date, sales_total_amount, staff_ID, customer_ID)
             VALUES (CURRENT_TIMESTAMP, ?, NULL, ?)`,
            [sales_total_amount, customerId]
        );

        const sales_ID = saleResult.insertId;
        if (!sales_ID) {
            await connection.rollback();
            return res.status(500).json({ message: "Could not create sale record." });
        }

        for (const item of cart) {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            if (!quantity || quantity <= 0) {
                await connection.rollback();
                return res.status(400).json({ message: "Sale items must have valid quantity." });
            }
            if (!item.id) {
                await connection.rollback();
                return res.status(400).json({ message: "Sale items must include a product ID." });
            }

            await connection.query(
                `INSERT INTO sales_details (
                    sales_ID,
                    product_ID,
                    sales_details_quantity,
                    sales_details_price
                ) VALUES (?, ?, ?, ?)`,
                [sales_ID, item.id, quantity, price]
            );

            await connection.query(
                `UPDATE product
                 SET product_quantity_in_stock = GREATEST(product_quantity_in_stock - ?, 0)
                 WHERE product_ID = ?`,
                [quantity, item.id]
            );
        }

        await connection.commit();

        if (customerEmail) {
            const itemsHtml = cart.map(item => `
                <li>${item.title} × ${item.quantity} @ ₵${Number(item.price).toFixed(2)}</li>
            `).join('');
            const html = `
                <h2>Thank you for your purchase, ${customerName}!</h2>
                <p>Your order has been confirmed with order number <strong>#${sales_ID}</strong>.</p>
                <p>Order total: <strong>₵${Number(sales_total_amount).toFixed(2)}</strong></p>
                <p>Items:</p>
                <ul>${itemsHtml}</ul>
                <p>We will notify you once your order is shipped.</p>
            `;
            await sendCustomerEmail(customerEmail, 'Your Bookshop Order Confirmation', html);
        }

        res.status(201).json({ message: "Checkout completed.", sales_ID });
    } catch (error) {
        await connection.rollback();
        console.error("Checkout error:", error);
        res.status(500).json({ message: "Checkout failed." });
    } finally {
        connection.release();
    }
});

// --- Customer API Endpoints ---

// GET /api/customer/orders?email=... — fetch order history for a user
app.get("/api/customer/orders", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: "Email is required." });

        const [customers] = await db.query(
            "SELECT customer_ID FROM customer WHERE customer_email = ? LIMIT 1",
            [email]
        );

        if (!customers.length) {
            return res.json([]); // no orders for this customer
        }

        const customerId = customers[0].customer_ID;

        const [sales] = await db.query(
            `SELECT sales_ID AS id, sales_date AS date, sales_total_amount AS total
             FROM sales WHERE customer_ID = ? ORDER BY sales_date DESC`,
            [customerId]
        );

        // Fetch items for each sale
        const orders = await Promise.all(sales.map(async (sale) => {
            const [items] = await db.query(
                `SELECT sd.sales_details_quantity AS quantity, sd.sales_details_price AS price,
                        p.product_name AS title
                 FROM sales_details sd
                 LEFT JOIN product p ON sd.product_ID = p.product_ID
                 WHERE sd.sales_ID = ?`,
                [sale.id]
            );
            return { ...sale, items };
        }));

        res.json(orders);
    } catch (error) {
        console.error("Customer orders error:", error);
        res.status(500).json({ message: "Could not load orders." });
    }
});

// PUT /api/customer/profile — update user name and email
app.put("/api/customer/profile", async (req, res) => {
    try {
        const { oldEmail, fullname, email } = req.body;
        if (!oldEmail || !fullname || !email) {
            return res.status(400).json({ message: "oldEmail, fullname, and email are required." });
        }

        await db.query(
            "UPDATE users SET fullname = ?, email = ? WHERE email = ? AND role = 'user'",
            [fullname, email, oldEmail]
        );

        // Keep customer table in sync
        await db.query(
            "UPDATE customer SET customer_name = ?, customer_email = ? WHERE customer_email = ?",
            [fullname, email, oldEmail]
        );

        res.json({ message: "Profile updated." });
    } catch (error) {
        console.error("Profile update error:", error);
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "That email is already in use." });
        }
        res.status(500).json({ message: "Could not update profile." });
    }
});

// PUT /api/customer/change-password — change user password
app.put("/api/customer/change-password", async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({ message: "email, currentPassword, and newPassword are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters." });
        }

        const [users] = await db.query(
            "SELECT id, password_hash FROM users WHERE email = ? AND role = 'user' LIMIT 1",
            [email]
        );
        if (!users.length) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = users[0];
        const matches = await bcrypt.compare(currentPassword, user.password_hash);
        if (!matches) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);

        res.json({ message: "Password changed successfully." });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Could not change password." });
    }
});

// --- Report API Endpoints ---

app.get("/api/admin/reports/daily-sales", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                DATE_FORMAT(sales_date, '%Y-%m-%d') AS date, 
                COUNT(sales_ID) AS total_orders, 
                SUM(sales_total_amount) AS total_sales
            FROM sales
            GROUP BY DATE_FORMAT(sales_date, '%Y-%m-%d')
            ORDER BY date DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Daily sales report error:", error);
        res.status(500).json({ message: "Could not generate daily sales report." });
    }
});

app.get("/api/admin/reports/monthly-sales", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                DATE_FORMAT(sales_date, '%Y-%m') AS month, 
                COUNT(sales_ID) AS total_orders, 
                SUM(sales_total_amount) AS total_sales
            FROM sales
            GROUP BY DATE_FORMAT(sales_date, '%Y-%m')
            ORDER BY month DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Monthly sales report error:", error);
        res.status(500).json({ message: "Could not generate monthly sales report." });
    }
});

app.get("/api/admin/reports/stock-levels", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.product_ID AS id, 
                p.product_name AS name, 
                p.product_quantity_in_stock AS stock, 
                p.product_price AS price,
                COALESCE(c.category_name, 'No Category') AS category,
                COALESCE(s.supplier_name, 'No Supplier') AS supplier
            FROM product p
            LEFT JOIN category c ON p.category_ID = c.category_ID
            LEFT JOIN supplier s ON p.supplier_ID = s.supplier_ID
            ORDER BY p.product_quantity_in_stock ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Stock levels report error:", error);
        res.status(500).json({ message: "Could not generate stock levels report." });
    }
});

app.get("/api/admin/reports/supplier-products", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.supplier_name AS supplier,
                p.product_name AS product,
                p.product_quantity_in_stock AS stock,
                p.product_price AS price
            FROM supplier s
            LEFT JOIN product p ON s.supplier_ID = p.supplier_ID
            ORDER BY s.supplier_name ASC, p.product_name ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Supplier products report error:", error);
        res.status(500).json({ message: "Could not generate supplier products report." });
    }
});

app.get("/api/admin/reports/customers-per-day", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                DATE_FORMAT(sales_date, '%Y-%m-%d') AS date,
                COUNT(DISTINCT customer_ID) AS unique_customers,
                COUNT(sales_ID) AS total_checkouts
            FROM sales
            GROUP BY DATE_FORMAT(sales_date, '%Y-%m-%d')
            ORDER BY date DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Customers per day report error:", error);
        res.status(500).json({ message: "Could not generate customers per day report." });
    }
});

app.listen(port, () => {
    console.log(`Book shop server running at http://localhost:${port}`);
});
