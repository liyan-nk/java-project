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
    seller_department VARCHAR(100),
    seller_year VARCHAR(50),
    seller_phone VARCHAR(50),
    seller_email VARCHAR(100),
    seller_whatsapp VARCHAR(50),
    seller_avatar_url VARCHAR(255),
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
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    contact_instagram VARCHAR(100),
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
INSERT IGNORE INTO marketplace_items (id, seller_id, title, description, price, category, status, image_url, seller_department, seller_year, seller_phone, seller_email, seller_whatsapp, seller_avatar_url) VALUES
(1, 3, 'Calculus - 8th Edition', 'Lightly used textbook, no markings inside. Essential for MATH 201.', 35.00, 'BOOKS', 'AVAILABLE', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', 'Department of Mathematics & Statistics', 'Senior (Year 4 / Sem 7)', '+1 (555) 234-5678', 'jane.smith@campus.edu', '+15552345678', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane'),
(2, 2, 'Casio FX-991EX Calculator', 'Scientific calculator in pristine condition with hard slip case.', 20.00, 'ELECTRONICS', 'AVAILABLE', 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400', 'Computer Science & Engineering', 'Senior (Year 4 / Sem 8)', '+1 (555) 987-6543', 'john.doe@campus.edu', '+15559876543', 'https://api.dicebear.com/7.x/avataaars/svg?seed=John');

-- Seed Lost & Found Items (6 Lost & 6 Found)
INSERT IGNORE INTO lost_found_items (id, reporter_id, type, title, description, location, date_reported, status, image_url, contact_phone, contact_email, contact_instagram) VALUES
(1, 2, 'LOST', 'Blue Hydro Flask Water Bottle', 'Navy blue 32oz Hydro Flask with stainless steel cap. Has a GitHub octocat sticker and campus CS department logo on the side. Left on a dining table around noon.', 'Campus Cafeteria (Near Patio Seating)', '2026-10-24', 'OPEN', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', '+1 (555) 234-8901', 'alex.chen@campus.edu', '@alexchen_campus'),
(2, 2, 'LOST', 'Black Wireless Earbuds', 'Matte black wireless earbuds in a compact oval charging case. Lost between study carrels 34 and 38 during late evening study session.', 'Main Library (3rd Floor Quiet Study)', '2026-10-25', 'OPEN', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800', '+1 (555) 876-5432', 'marcus.v@campus.edu', NULL),
(3, 2, 'LOST', 'Student ID Card', 'University student ID card in a blue lanyard pouch with campus transit pass. Essential for lab access and dorm entry.', 'Computer Science Block (B-Wing Entrance)', '2026-10-25', 'OPEN', 'https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=800', NULL, 'psharma@campus.edu', '@priyasharma_cs'),
(4, 2, 'LOST', 'Black Laptop Backpack', 'Water-resistant black backpack with padded laptop sleeve, containing physics notebooks and stationary pouch. Left after 2 PM lecture.', 'Science Building (Lecture Hall 102)', '2026-10-23', 'OPEN', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', '+1 (555) 432-9876', 'dkim99@campus.edu', NULL),
(5, 2, 'LOST', 'Scientific Calculator', 'Casio FX-991EX scientific calculator with sliding hard cover. Has faint initials J.R. engraved on the rear battery lid. Verified and returned to owner.', 'Examination Hall (Auditorium West)', '2026-10-21', 'RESOLVED', 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800', NULL, 'jordan.reed@campus.edu', NULL),
(6, 2, 'LOST', 'House Keys with Campus Keychain', 'Ring of 3 brass keys with blue woven fabric university keychain and a small brass bottle opener accessory.', 'Campus Parking Lot C (Near Row 4)', '2026-10-26', 'OPEN', 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800', '+1 (555) 765-4321', NULL, NULL),
(7, 3, 'FOUND', 'Wireless Earbuds in Charging Case', 'White noise-cancelling wireless earbuds inside glossy charging case. Found under study seat 14B after morning class. Handed to librarian desk.', 'Library Hall A (Desk 14B)', '2026-10-25', 'OPEN', 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800', '+1 (555) 345-6789', 'library-frontdesk@campus.edu', NULL),
(8, 3, 'FOUND', 'Brown Wallet', 'Genuine brown leather bi-fold wallet found on an outdoor bench. Contains student ID and transit voucher. Safely stored in campus security lockbox.', 'College Canteen (Outdoor Table 6)', '2026-10-25', 'OPEN', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800', '+1 (555) 911-2000', 'security-lostfound@campus.edu', NULL),
(9, 3, 'FOUND', 'USB-C Charger', 'White 65W GaN fast laptop charger with 2m braided cable. Left plugged into the power strip next to workstation 12.', 'Computer Laboratory 4 (Workstation 12)', '2026-10-26', 'OPEN', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800', NULL, 'cs-lab4@campus.edu', NULL),
(10, 3, 'FOUND', 'Notebook with Handwritten Notes', 'Green spiral notebook with circuit schematics and linear algebra lecture summaries. Found on front lecturer podium.', 'Engineering Building (Room 205)', '2026-10-24', 'OPEN', 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800', NULL, 'elena.r@campus.edu', '@elena_engr'),
(11, 3, 'FOUND', 'Umbrella', 'Black compact windproof umbrella with wooden curved handle. Left in the umbrella bucket by the revolving doors. Reunited with owner.', 'Campus Main Entrance (Umbrella Stand B)', '2026-10-22', 'RESOLVED', 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800', NULL, NULL, NULL),
(12, 3, 'FOUND', 'Wristwatch', 'Silver stainless steel analog wristwatch with dark navy dial. Found on the upper bleachers following soccer practice.', 'Sports Ground (Bleachers Section 2)', '2026-10-26', 'OPEN', 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800', '+1 (555) 890-1234', 'athletics@campus.edu', NULL);
