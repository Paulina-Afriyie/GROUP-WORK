CREATE DATABASE IF NOT EXISTS book_shop;
USE book_shop;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

INSERT INTO category (category_name) VALUES
('fiction'),
('tech'),
('self-help'),
('text-books'),
('writing-books')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

INSERT INTO product (
    product_name,
    product_author,
    product_price,
    product_quantity_in_stock,
    category_ID,
    product_image
)
SELECT seed.product_name, seed.product_author, seed.product_price, seed.stock, category.category_ID, seed.product_image
FROM (
    SELECT 'Your Uploaded Book Cover' AS product_name, 'Unknown Author' AS product_author, 25.00 AS product_price, 10 AS stock, 'fiction' AS category_name, 'images/dd.jpg' AS product_image
    UNION ALL SELECT 'Clean Code', 'Robert C. Martin', 34.99, 15, 'tech', 'images/bb.jpg'
    UNION ALL SELECT 'Atomic Habits', 'James Clear', 18.20, 20, 'self-help', 'images/ss.jpg'
    UNION ALL SELECT 'To Kill a Mockingbird', 'Harper Lee', 14.50, 8, 'fiction', 'images/hh.jpg'
    UNION ALL SELECT 'Eloquent JavaScript', 'Marijn Haverbeke', 28.99, 12, 'tech', 'images/hh (2).jpg'
    UNION ALL SELECT 'Deep Work', 'Cal Newport', 16.99, 6, 'self-help', 'images/The Joys of Motherhood.jpg'
) AS seed
LEFT JOIN category ON category.category_name = seed.category_name
WHERE NOT EXISTS (
    SELECT 1 FROM product WHERE product.product_name = seed.product_name
);
