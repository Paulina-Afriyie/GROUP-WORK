USE book_shop;

CREATE TABLE IF NOT EXISTS supplier (
    supplier_ID INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    supplier_address VARCHAR(255),
    supplier_phone_number VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS category (
    category_ID INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS product (
    product_ID INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    product_author VARCHAR(100),
    product_price DECIMAL(10, 2) NOT NULL,
    product_quantity_in_stock INT NOT NULL DEFAULT 0,
    supplier_ID INT,
    category_ID INT,
    product_image VARCHAR(255),
    FOREIGN KEY (supplier_ID) REFERENCES supplier(supplier_ID),
    FOREIGN KEY (category_ID) REFERENCES category(category_ID)
);

CREATE TABLE IF NOT EXISTS customer (
    customer_ID INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_address VARCHAR(255),
    customer_phone_number VARCHAR(30),
    customer_email VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS staff (
    staff_ID INT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL,
    staff_username VARCHAR(80) NOT NULL UNIQUE,
    staff_role VARCHAR(50) NOT NULL,
    staff_password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
    sales_ID INT AUTO_INCREMENT PRIMARY KEY,
    sales_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sales_total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    order_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    staff_ID INT,
    customer_ID INT,
    FOREIGN KEY (staff_ID) REFERENCES staff(staff_ID),
    FOREIGN KEY (customer_ID) REFERENCES customer(customer_ID)
);

ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS order_status VARCHAR(30) NOT NULL DEFAULT 'Pending' AFTER sales_total_amount;

CREATE TABLE IF NOT EXISTS sales_details (
    sales_details_ID INT AUTO_INCREMENT PRIMARY KEY,
    sales_ID INT NOT NULL,
    product_ID INT NOT NULL,
    sales_details_quantity INT NOT NULL,
    sales_details_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sales_ID) REFERENCES sales(sales_ID),
    FOREIGN KEY (product_ID) REFERENCES product(product_ID)
);

INSERT INTO customer (customer_name, customer_email)
SELECT fullname, email FROM users
WHERE role = 'user'
ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name);

INSERT INTO staff (staff_name, staff_username, staff_role, staff_password)
SELECT fullname, email, role, password_hash FROM users
WHERE role = 'admin'
ON DUPLICATE KEY UPDATE
    staff_name = VALUES(staff_name),
    staff_role = VALUES(staff_role),
    staff_password = VALUES(staff_password);
