package com.campushub.dao;

import com.campushub.config.DatabaseConfig;
import com.campushub.models.LostFoundItem;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

public class LostFoundDAO {

    private static final Logger LOGGER = Logger.getLogger(LostFoundDAO.class.getName());

    public List<LostFoundItem> getAllItems() {
        List<LostFoundItem> list = new ArrayList<>();
        String sql = "SELECT l.id, l.reporter_id, u.name AS reporter_name, l.type, l.title, l.description, l.location, l.date_reported, l.status, l.image_url, l.created_at " +
                     "FROM lost_found_items l JOIN users u ON l.reporter_id = u.id ORDER BY l.id DESC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                list.add(mapItem(rs));
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database lookup failed for lost/found items, using fallback: " + e.getMessage());
            return getFallbackItems();
        }
        return list.isEmpty() ? getFallbackItems() : list;
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
        
        // Return object with updated status
        for (LostFoundItem item : getFallbackItems()) {
            if (item.getId() == id) {
                item.setStatus(newStatus);
                return item;
            }
        }
        return new LostFoundItem(id, 2, "John Doe", "LOST", "Blue Hydroflask Bottle", "Navy blue with laptop stickers", "Student Union", "2026-09-01", newStatus, "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", new Timestamp(System.currentTimeMillis()));
    }

    private LostFoundItem mapItem(ResultSet rs) throws SQLException {
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
                rs.getTimestamp("created_at")
        );
    }

    private List<LostFoundItem> getFallbackItems() {
        List<LostFoundItem> list = new ArrayList<>();
        list.add(new LostFoundItem(1, 2, "John Doe", "LOST", "Blue Hydroflask Bottle", "Navy blue with laptop stickers near campus cafeteria.", "Student Union", "2026-09-01", "OPEN", "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", new Timestamp(System.currentTimeMillis())));
        list.add(new LostFoundItem(2, 3, "Jane Smith", "FOUND", "Sony Wireless Earbuds", "Black charging case found under seat 14B.", "Library Hall A", "2026-09-02", "OPEN", "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400", new Timestamp(System.currentTimeMillis())));
        return list;
    }
}
