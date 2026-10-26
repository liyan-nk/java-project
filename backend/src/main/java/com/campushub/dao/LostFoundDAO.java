package com.campushub.dao;

import com.campushub.config.DatabaseConfig;
import com.campushub.models.LostFoundItem;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;

public class LostFoundDAO {

    private static final Logger LOGGER = Logger.getLogger(LostFoundDAO.class.getName());

    // In-memory thread-safe storage for fallback / demonstration mode
    private static final List<LostFoundItem> FALLBACK_ITEMS = new CopyOnWriteArrayList<>();
    private static final AtomicInteger ID_GENERATOR = new AtomicInteger(100);

    static {
        initFallbackItems();
    }

    private static void initFallbackItems() {
        Timestamp now = new Timestamp(System.currentTimeMillis());

        // 6 Lost Items
        FALLBACK_ITEMS.add(new LostFoundItem(
                1, 2, "Alex Chen", "LOST",
                "Blue Hydro Flask Water Bottle",
                "Navy blue 32oz Hydro Flask with stainless steel cap. Has a GitHub octocat sticker and campus CS department logo on the side. Left on a dining table around noon.",
                "Campus Cafeteria (Near Patio Seating)",
                "2026-10-24", "OPEN",
                "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
                "+1 (555) 234-8901", "alex.chen@campus.edu", "@alexchen_campus", now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                2, 4, "Marcus Vance", "LOST",
                "Black Wireless Earbuds",
                "Matte black wireless earbuds in a compact oval charging case. Lost between study carrels 34 and 38 during late evening study session.",
                "Main Library (3rd Floor Quiet Study)",
                "2026-10-25", "OPEN",
                "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800",
                "+1 (555) 876-5432", "marcus.v@campus.edu", null, now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                3, 5, "Priya Sharma", "LOST",
                "Student ID Card",
                "University student ID card in a blue lanyard pouch with campus transit pass. Essential for lab access and dorm entry.",
                "Computer Science Block (B-Wing Entrance)",
                "2026-10-25", "OPEN",
                "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=800",
                null, "psharma@campus.edu", "@priyasharma_cs", now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                4, 6, "David Kim", "LOST",
                "Black Laptop Backpack",
                "Water-resistant black backpack with padded laptop sleeve, containing physics notebooks and stationary pouch. Left after 2 PM lecture.",
                "Science Building (Lecture Hall 102)",
                "2026-10-23", "OPEN",
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
                "+1 (555) 432-9876", "dkim99@campus.edu", null, now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                5, 7, "Jordan Reed", "LOST",
                "Scientific Calculator",
                "Casio FX-991EX scientific calculator with sliding hard cover. Has faint initials 'J.R.' engraved on the rear battery lid. Verified and returned to owner.",
                "Examination Hall (Auditorium West)",
                "2026-10-21", "RESOLVED",
                "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800",
                null, "jordan.reed@campus.edu", null, now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                6, 8, "Samantha Taylor", "LOST",
                "House Keys with Campus Keychain",
                "Ring of 3 brass keys with blue woven fabric university keychain and a small brass bottle opener accessory.",
                "Campus Parking Lot C (Near Row 4)",
                "2026-10-26", "OPEN",
                "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800",
                "+1 (555) 765-4321", null, null, now
        ));

        // 6 Found Items
        FALLBACK_ITEMS.add(new LostFoundItem(
                7, 3, "Jane Smith", "FOUND",
                "Wireless Earbuds in Charging Case",
                "White noise-cancelling wireless earbuds inside glossy charging case. Found under study seat 14B after morning class. Handed to librarian desk.",
                "Library Hall A (Desk 14B)",
                "2026-10-25", "OPEN",
                "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800",
                "+1 (555) 345-6789", "library-frontdesk@campus.edu", null, now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                8, 9, "Campus Security Office", "FOUND",
                "Brown Wallet",
                "Genuine brown leather bi-fold wallet found on an outdoor bench. Contains student ID and transit voucher. Safely stored in campus security lockbox.",
                "College Canteen (Outdoor Table 6)",
                "2026-10-25", "OPEN",
                "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800",
                "+1 (555) 911-2000", "security-lostfound@campus.edu", null, now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                9, 10, "Lab Assistant Mark", "FOUND",
                "USB-C Charger",
                "White 65W GaN fast laptop charger with 2m braided cable. Left plugged into the power strip next to workstation 12.",
                "Computer Laboratory 4 (Workstation 12)",
                "2026-10-26", "OPEN",
                "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800",
                null, "cs-lab4@campus.edu", null, now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                10, 11, "Elena Rostova", "FOUND",
                "Notebook with Handwritten Notes",
                "Green spiral notebook with circuit schematics and linear algebra lecture summaries. Found on front lecturer podium.",
                "Engineering Building (Room 205)",
                "2026-10-24", "OPEN",
                "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800",
                null, "elena.r@campus.edu", "@elena_engr", now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                11, 12, "Facilities Staff", "FOUND",
                "Umbrella",
                "Black compact windproof umbrella with wooden curved handle. Left in the umbrella bucket by the revolving doors. Reunited with owner.",
                "Campus Main Entrance (Umbrella Stand B)",
                "2026-10-22", "RESOLVED",
                "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800",
                null, null, null, now
        ));

        FALLBACK_ITEMS.add(new LostFoundItem(
                12, 13, "Coach Henderson", "FOUND",
                "Wristwatch",
                "Silver stainless steel analog wristwatch with dark navy dial. Found on the upper bleachers following soccer practice.",
                "Sports Ground (Bleachers Section 2)",
                "2026-10-26", "OPEN",
                "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800",
                "+1 (555) 890-1234", "athletics@campus.edu", null, now
        ));
    }

    public List<LostFoundItem> getAllItems() {
        List<LostFoundItem> list = new ArrayList<>();
        String sql = "SELECT l.id, l.reporter_id, u.name AS reporter_name, l.type, l.title, l.description, l.location, l.date_reported, l.status, l.image_url, " +
                     "l.contact_phone, l.contact_email, l.contact_instagram, l.created_at " +
                     "FROM lost_found_items l JOIN users u ON l.reporter_id = u.id ORDER BY l.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapItem(rs));
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database lookup failed for lost/found items, using fallback: " + e.getMessage());
            return new ArrayList<>(FALLBACK_ITEMS);
        }
        return list.isEmpty() ? new ArrayList<>(FALLBACK_ITEMS) : list;
    }

    public LostFoundItem createItem(LostFoundItem item) {
        String insertSql = "INSERT INTO lost_found_items (reporter_id, type, title, description, location, date_reported, status, image_url, contact_phone, contact_email, contact_instagram) " +
                           "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, item.getReporterId() > 0 ? item.getReporterId() : 2);
            stmt.setString(2, item.getType() != null ? item.getType().toUpperCase() : "LOST");
            stmt.setString(3, item.getTitle());
            stmt.setString(4, item.getDescription());
            stmt.setString(5, item.getLocation());
            stmt.setString(6, item.getDateReported() != null ? item.getDateReported() : "2026-10-26");
            stmt.setString(7, item.getStatus() != null ? item.getStatus().toUpperCase() : "OPEN");
            stmt.setString(8, item.getImageUrl());
            stmt.setString(9, item.getContactPhone());
            stmt.setString(10, item.getContactEmail());
            stmt.setString(11, item.getContactInstagram());
            stmt.executeUpdate();

            try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                if (generatedKeys.next()) {
                    item.setId(generatedKeys.getInt(1));
                }
            }
            item.setCreatedAt(new Timestamp(System.currentTimeMillis()));
            FALLBACK_ITEMS.add(0, item);
            return item;
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database insert failed for lost/found item, using fallback: " + e.getMessage());
            int newId = ID_GENERATOR.incrementAndGet();
            item.setId(newId);
            item.setCreatedAt(new Timestamp(System.currentTimeMillis()));
            FALLBACK_ITEMS.add(0, item);
            return item;
        }
    }

    public LostFoundItem claimItem(int id, String newStatus) {
        String updateSql = "UPDATE lost_found_items SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(updateSql)) {
            stmt.setString(1, newStatus);
            stmt.setInt(2, id);
            stmt.executeUpdate();
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database status update failed for claim item: " + e.getMessage());
        }

        for (LostFoundItem item : FALLBACK_ITEMS) {
            if (item.getId() == id) {
                item.setStatus(newStatus);
                return item;
            }
        }
        return new LostFoundItem(id, 2, "John Doe", "LOST", "Reported Item", "Status updated", "Campus", "2026-10-26", newStatus, null, new Timestamp(System.currentTimeMillis()));
    }

    private LostFoundItem mapItem(ResultSet rs) throws SQLException {
        String phone = getColumnSafely(rs, "contact_phone");
        String email = getColumnSafely(rs, "contact_email");
        String insta = getColumnSafely(rs, "contact_instagram");

        return new LostFoundItem(
                rs.getInt("id"),
                rs.getInt("reporter_id"),
                rs.getString("reporter_name"),
                rs.getString("type"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("location"),
                rs.getString("date_reported"),
                rs.getString("status"),
                rs.getString("image_url"),
                phone,
                email,
                insta,
                rs.getTimestamp("created_at")
        );
    }

    private String getColumnSafely(ResultSet rs, String column) {
        try {
            return rs.getString(column);
        } catch (SQLException ignored) {
            return null;
        }
    }
}
