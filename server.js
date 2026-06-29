require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./src/db");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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
    } catch (error) {
        res.status(500).json({ message: "Could not log in." });
    }
});

app.listen(port, () => {
    console.log(`Book shop server running at http://localhost:${port}`);
});
