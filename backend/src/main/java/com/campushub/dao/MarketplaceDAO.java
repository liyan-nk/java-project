package com.campushub.dao;

import com.campushub.config.DatabaseConfig;
import com.campushub.models.MarketplaceItem;

import java.math.BigDecimal;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

public class MarketplaceDAO {

    private static final Logger LOGGER = Logger.getLogger(MarketplaceDAO.class.getName());

    // In-memory thread-safe fallback list matching LostFoundDAO pattern
    private static final List<MarketplaceItem> FALLBACK_ITEMS = new java.util.concurrent.CopyOnWriteArrayList<>();
    private static final java.util.concurrent.atomic.AtomicInteger ID_GENERATOR = new java.util.concurrent.atomic.AtomicInteger(100);

    static {
        initFallbackItems();
    }

    public List<MarketplaceItem> getAllItems() {
        List<MarketplaceItem> list = new ArrayList<>();
        String sql = "SELECT m.id, m.seller_id, u.name AS seller_name, u.avatar_url AS user_avatar, m.title, m.description, m.price, m.category, m.status, m.image_url, " +
                     "m.seller_department, m.seller_year, m.seller_phone, m.seller_email, m.seller_whatsapp, m.seller_avatar_url, m.created_at " +
                     "FROM marketplace_items m JOIN users u ON m.seller_id = u.id ORDER BY m.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapItem(rs));
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database lookup failed for marketplace items, using fallback: " + e.getMessage());
            return new ArrayList<>(FALLBACK_ITEMS);
        }
        return list.isEmpty() ? new ArrayList<>(FALLBACK_ITEMS) : list;
    }

    public MarketplaceItem createItem(MarketplaceItem item) {
        String sql = "INSERT INTO marketplace_items (seller_id, title, description, price, category, status, image_url, " +
                     "seller_department, seller_year, seller_phone, seller_email, seller_whatsapp, seller_avatar_url) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, item.getSellerId());
            stmt.setString(2, item.getTitle());
            stmt.setString(3, item.getDescription());
            stmt.setBigDecimal(4, item.getPrice());
            stmt.setString(5, item.getCategory() != null ? item.getCategory() : "GENERAL");
            stmt.setString(6, item.getStatus() != null ? item.getStatus() : "AVAILABLE");
            stmt.setString(7, item.getImageUrl());
            stmt.setString(8, item.getSellerDepartment());
            stmt.setString(9, item.getSellerYear());
            stmt.setString(10, item.getSellerPhone());
            stmt.setString(11, item.getSellerEmail());
            stmt.setString(12, item.getSellerWhatsapp());
            stmt.setString(13, item.getSellerAvatarUrl());
            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    item.setId(rs.getInt(1));
                }
            }
            item.setCreatedAt(new Timestamp(System.currentTimeMillis()));
            FALLBACK_ITEMS.add(0, item);
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database insert failed for marketplace item, using in-memory store: " + e.getMessage());
            int newId = ID_GENERATOR.incrementAndGet();
            item.setId(newId);
            item.setCreatedAt(new Timestamp(System.currentTimeMillis()));
            FALLBACK_ITEMS.add(0, item);
        }
        return item;
    }

    private MarketplaceItem mapItem(ResultSet rs) throws SQLException {
        MarketplaceItem item = new MarketplaceItem();
        item.setId(rs.getInt("id"));
        item.setSellerId(rs.getInt("seller_id"));
        item.setSellerName(rs.getString("seller_name"));
        item.setTitle(rs.getString("title"));
        item.setDescription(rs.getString("description"));
        item.setPrice(rs.getBigDecimal("price"));
        item.setCategory(rs.getString("category"));
        item.setStatus(rs.getString("status"));
        item.setImageUrl(rs.getString("image_url"));
        item.setCreatedAt(rs.getTimestamp("created_at"));

        try { item.setSellerDepartment(rs.getString("seller_department")); } catch (Exception ignored) {}
        try { item.setSellerYear(rs.getString("seller_year")); } catch (Exception ignored) {}
        try { item.setSellerPhone(rs.getString("seller_phone")); } catch (Exception ignored) {}
        try { item.setSellerEmail(rs.getString("seller_email")); } catch (Exception ignored) {}
        try { item.setSellerWhatsapp(rs.getString("seller_whatsapp")); } catch (Exception ignored) {}
        try {
            String av = rs.getString("seller_avatar_url");
            if (av == null || av.isBlank()) {
                av = rs.getString("user_avatar");
            }
            item.setSellerAvatarUrl(av);
        } catch (Exception ignored) {}

        return item;
    }

    private static void initFallbackItems() {
        FALLBACK_ITEMS.add(new MarketplaceItem(1, 3, "Jane Smith", "Calculus - 8th Edition (Stewart)",
                "Clean copy with minimal highlighting. Essential for MATH 201. Includes complete study solutions manual.",
                new BigDecimal("35.00"), "TEXTBOOKS", "AVAILABLE",
                "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500",
                new Timestamp(System.currentTimeMillis()),
                "Department of Mathematics & Statistics", "Senior (Year 4 / Sem 7)",
                "+1 (555) 234-5678", "jane.smith@campus.edu", "+15552345678",
                "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane"));

        FALLBACK_ITEMS.add(new MarketplaceItem(2, 2, "John Doe", "Casio FX-991EX Scientific Calculator",
                "High-speed scientific calculator in pristine condition with hard slip case and fresh solar cell.",
                new BigDecimal("20.00"), "TECH", "AVAILABLE",
                "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=500",
                new Timestamp(System.currentTimeMillis()),
                "Computer Science & Engineering", "Senior (Year 4 / Sem 8)",
                "+1 (555) 987-6543", "john.doe@campus.edu", "+15559876543",
                "https://api.dicebear.com/7.x/avataaars/svg?seed=John"));

        FALLBACK_ITEMS.add(new MarketplaceItem(3, 1, "Campus Store", "Adjustable LED Desk Study Lamp",
                "USB-C powered lamp with 3 color temperatures, touch dimmer, and phone mount. Official campus store item.",
                new BigDecimal("15.00"), "DORM", "AVAILABLE",
                "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500",
                new Timestamp(System.currentTimeMillis()),
                "Student Union & Campus Services", "Official Campus Store",
                "+1 (555) 789-0123", "store@campushub.edu", null,
                "https://api.dicebear.com/7.x/avataaars/svg?seed=Store"));

        FALLBACK_ITEMS.add(new MarketplaceItem(4, 4, "Alex Rivera", "North Face 28L Campus Backpack",
                "Spacious water-resistant backpack with padded 15\" laptop sleeve and dual bottle pockets. Selling after graduation.",
                new BigDecimal("45.00"), "GENERAL", "AVAILABLE",
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500",
                new Timestamp(System.currentTimeMillis()),
                "Electrical & Electronic Engineering", "Senior (Year 4 / Sem 7)",
                "+1 (555) 432-8765", "a.rivera@campus.edu", "+15554328765",
                "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"));

        FALLBACK_ITEMS.add(new MarketplaceItem(5, 5, "Priya Sharma", "Sony WH-1000XM4 Noise Canceling Headphones",
                "Like new with original travel case, audio cable, and USB-C cable. Perfect for library deep work.",
                new BigDecimal("95.00"), "TECH", "AVAILABLE",
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
                new Timestamp(System.currentTimeMillis()),
                "Biomedical Engineering", "Senior (Year 3 / Sem 6)",
                null, "psharma@campus.edu", "+15556781234",
                "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"));

        FALLBACK_ITEMS.add(new MarketplaceItem(6, 6, "Anonymous Senior", "Organic Chemistry: Structure & Function (6th Ed)",
                "Hardcover textbook in great condition with study guide summary. Left at locker desk for junior pickup.",
                new BigDecimal("40.00"), "TEXTBOOKS", "AVAILABLE",
                "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=500",
                new Timestamp(System.currentTimeMillis()),
                null, null, null, null, null, null));
    }
}
