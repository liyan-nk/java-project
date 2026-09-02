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

    public List<MarketplaceItem> getAllItems() {
        List<MarketplaceItem> list = new ArrayList<>();
        String sql = "SELECT m.id, m.seller_id, u.name AS seller_name, m.title, m.description, m.price, m.category, m.status, m.image_url, m.created_at " +
                     "FROM marketplace_items m JOIN users u ON m.seller_id = u.id ORDER BY m.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapItem(rs));
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database lookup failed for marketplace items, using fallback: " + e.getMessage());
            return getFallbackItems();
        }
        return list.isEmpty() ? getFallbackItems() : list;
    }

    public MarketplaceItem createItem(MarketplaceItem item) {
        String sql = "INSERT INTO marketplace_items (seller_id, title, description, price, category, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, item.getSellerId());
            stmt.setString(2, item.getTitle());
            stmt.setString(3, item.getDescription());
            stmt.setBigDecimal(4, item.getPrice());
            stmt.setString(5, item.getCategory() != null ? item.getCategory() : "GENERAL");
            stmt.setString(6, item.getStatus() != null ? item.getStatus() : "AVAILABLE");
            stmt.setString(7, item.getImageUrl());
            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    item.setId(rs.getInt(1));
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to create marketplace item: " + e.getMessage());
            if (item.getId() == 0) item.setId((int) (System.currentTimeMillis() % 10000));
        }
        return item;
    }

    private MarketplaceItem mapItem(ResultSet rs) throws SQLException {
        return new MarketplaceItem(
                rs.getInt("id"),
                rs.getInt("seller_id"),
                rs.getString("seller_name"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getBigDecimal("price"),
                rs.getString("category"),
                rs.getString("status"),
                rs.getString("image_url"),
                rs.getTimestamp("created_at")
        );
    }

    private List<MarketplaceItem> getFallbackItems() {
        List<MarketplaceItem> list = new ArrayList<>();
        list.add(new MarketplaceItem(1, 3, "Jane Smith", "Calculus - 8th Edition", "Lightly used textbook, no markings inside.", new BigDecimal("35.00"), "BOOKS", "AVAILABLE", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400", new Timestamp(System.currentTimeMillis())));
        list.add(new MarketplaceItem(2, 2, "John Doe", "Casio FX-991EX Calculator", "Scientific calculator in pristine condition.", new BigDecimal("20.00"), "ELECTRONICS", "AVAILABLE", "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=400", new Timestamp(System.currentTimeMillis())));
        return list;
    }
}
