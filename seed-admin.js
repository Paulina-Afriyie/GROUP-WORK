require("dotenv").config();

const bcrypt = require("bcryptjs");
const db = require("./src/db");

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL || "admin@bookshop.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
        `INSERT INTO users (fullname, email, password_hash, role)
         VALUES (?, ?, ?, 'admin')
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
        ["Store Admin", email, passwordHash]
    );

    await db.query(
        `INSERT INTO staff (staff_name, staff_username, staff_role, staff_password)
         VALUES (?, ?, 'admin', ?)
         ON DUPLICATE KEY UPDATE
            staff_name = VALUES(staff_name),
            staff_role = 'admin',
            staff_password = VALUES(staff_password)`,
        ["Store Admin", email, passwordHash]
    );

    console.log(`Admin account ready: ${email}`);
    process.exit(0);
}

seedAdmin().catch((error) => {
    console.error("Admin seed failed:");
    console.error(error.message);
    process.exit(1);
});
