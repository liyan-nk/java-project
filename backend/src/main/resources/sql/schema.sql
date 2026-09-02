-- CampusHub Schema Definition & Seed Data
CREATE DATABASE IF NOT EXISTS campushub_db;
USE campushub_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Timetable Schedule Table
CREATE TABLE IF NOT EXISTS timetable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    room VARCHAR(50) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    instructor VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Attendance Tracking Table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    total_classes INT DEFAULT 0,
    attended_classes INT DEFAULT 0,
    target_percentage DOUBLE DEFAULT 75.0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Marketplace Items Table
CREATE TABLE IF NOT EXISTS marketplace_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Lost & Found Items Table
CREATE TABLE IF NOT EXISTS lost_found_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    type ENUM('LOST', 'FOUND') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(150) NOT NULL,
    date_reported VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Initial Users (Password: 'password123' -> BCrypt Hash: '$2a$10$e0MYzXyjpJS7Pd0RVvHwHe1V01p2.rQY6z9T5dM4z5M4z5M4z5M4z')
INSERT IGNORE INTO users (id, name, email, password_hash, role, avatar_url) VALUES
(1, 'Admin User', 'admin@campushub.com', '$2a$10$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWM/6', 'ADMIN', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'),
(2, 'John Doe', 'john@campushub.com', '$2a$10$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWM/6', 'STUDENT', 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'),
(3, 'Jane Smith', 'jane@campushub.com', '$2a$10$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWM/6', 'STUDENT', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane');

-- Seed Timetable for John Doe
INSERT IGNORE INTO timetable (id, user_id, day_of_week, subject, room, start_time, end_time, instructor) VALUES
(1, 2, 'MONDAY', 'Data Structures & Algorithms', 'Room 301', '09:00', '10:30', 'Dr. Alan Turing'),
(2, 2, 'MONDAY', 'Database Systems', 'Lab 2', '11:00', '12:30', 'Prof. Edgar Codd'),
(3, 2, 'TUESDAY', 'Computer Networks', 'Room 204', '14:00', '15:30', 'Dr. Vint Cerf');

-- Seed Attendance for John Doe
INSERT IGNORE INTO attendance (id, user_id, subject, total_classes, attended_classes, target_percentage) VALUES
(1, 2, 'Data Structures & Algorithms', 24, 21, 75.0),
(2, 2, 'Database Systems', 20, 18, 80.0),
(3, 2, 'Computer Networks', 18, 14, 75.0);

-- Seed Marketplace Items
INSERT IGNORE INTO marketplace_items (id, seller_id, title, description, price, category, status, image_url) VALUES
(1, 3, 'Calculus - 8th Edition', 'Lightly used textbook, no markings inside.', 35.00, 'BOOKS', 'AVAILABLE', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'),
(2, 2, 'Casio FX-991EX Calculator', 'Scientific calculator in pristine condition.', 20.00, 'ELECTRONICS', 'AVAILABLE', 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400');

-- Seed Lost & Found Items
INSERT IGNORE INTO lost_found_items (id, reporter_id, type, title, description, location, date_reported, status, image_url) VALUES
(1, 2, 'LOST', 'Blue Hydroflask Bottle', 'Navy blue with laptop stickers near campus cafeteria.', 'Student Union', '2026-09-01', 'OPEN', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'),
(2, 3, 'FOUND', 'Sony Wireless Earbuds', 'Black charging case found under seat 14B.', 'Library Hall A', '2026-09-02', 'OPEN', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400');
