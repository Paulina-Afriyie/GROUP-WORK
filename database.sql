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

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(100),
    address VARCHAR(255),
    phone_number VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    author VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(80),
    image VARCHAR(255),
    stock INT NOT NULL DEFAULT 0,
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

INSERT INTO categories (name) VALUES
('fiction'),
('tech'),
('self-help')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO books (title, author, price, category, image, stock) VALUES
('Your Uploaded Book Cover', 'Unknown Author', 25.00, 'fiction', 'images/dd.jpg', 10),
('Clean Code', 'Robert C. Martin', 34.99, 'tech', 'images/bb.jpg', 15),
('Atomic Habits', 'James Clear', 18.20, 'self-help', 'images/ss.jpg', 20),
('To Kill a Mockingbird', 'Harper Lee', 14.50, 'fiction', 'images/hh.jpg', 8),
('Eloquent JavaScript', 'Marijn Haverbeke', 28.99, 'tech', 'images/hh (2).jpg', 12),
('Deep Work', 'Cal Newport', 16.99, 'self-help', 'images/The Joys of Motherhood.jpg', 6);
