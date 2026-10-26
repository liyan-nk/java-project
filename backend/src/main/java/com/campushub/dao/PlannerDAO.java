package com.campushub.dao;

import com.campushub.config.DatabaseConfig;
import com.campushub.models.AttendanceRecord;
import com.campushub.models.TimetableEntry;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

public class PlannerDAO {

    private static final Logger LOGGER = Logger.getLogger(PlannerDAO.class.getName());

    // In-memory thread-safe storage for fallback / demonstration mode
    private static final List<TimetableEntry> FALLBACK_TIMETABLE = new java.util.concurrent.CopyOnWriteArrayList<>();
    private static final List<AttendanceRecord> FALLBACK_ATTENDANCE = new java.util.concurrent.CopyOnWriteArrayList<>();
    private static final java.util.concurrent.atomic.AtomicInteger TT_ID_GEN = new java.util.concurrent.atomic.AtomicInteger(10);

    static {
        initFallbackData();
    }

    private static void initFallbackData() {
        FALLBACK_TIMETABLE.add(new TimetableEntry(1, 2, "MONDAY", "Data Structures & Algorithms", "Room 301", "09:00", "10:30", "Dr. Alan Turing"));
        FALLBACK_TIMETABLE.add(new TimetableEntry(2, 2, "MONDAY", "Database Systems", "Lab 2", "11:00", "12:30", "Prof. Edgar Codd"));
        FALLBACK_TIMETABLE.add(new TimetableEntry(3, 2, "TUESDAY", "Computer Networks", "Room 204", "14:00", "15:30", "Dr. Vint Cerf"));
        FALLBACK_TIMETABLE.add(new TimetableEntry(4, 2, "WEDNESDAY", "Operating Systems", "Hall B", "10:00", "11:30", "Dr. Linus Torvalds"));
        FALLBACK_TIMETABLE.add(new TimetableEntry(5, 2, "THURSDAY", "Web Engineering", "Lab 4", "13:00", "14:30", "Dr. Tim Berners-Lee"));

        FALLBACK_ATTENDANCE.add(new AttendanceRecord(1, 2, "Data Structures & Algorithms", 24, 21, 75.0));
        FALLBACK_ATTENDANCE.add(new AttendanceRecord(2, 2, "Database Systems", 20, 18, 80.0));
        FALLBACK_ATTENDANCE.add(new AttendanceRecord(3, 2, "Computer Networks", 18, 14, 75.0));
        FALLBACK_ATTENDANCE.add(new AttendanceRecord(4, 2, "Operating Systems", 22, 19, 75.0));
    }

    public List<TimetableEntry> getTimetableByUserId(int userId) {
        List<TimetableEntry> list = new ArrayList<>();
        String sql = "SELECT id, user_id, day_of_week, subject, room, start_time, end_time, instructor FROM timetable WHERE user_id = ? ORDER BY id ASC";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new TimetableEntry(
                            rs.getInt("id"),
                            rs.getInt("user_id"),
                            rs.getString("day_of_week"),
                            rs.getString("subject"),
                            rs.getString("room"),
                            rs.getString("start_time"),
                            rs.getString("end_time"),
                            rs.getString("instructor")
                    ));
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database lookup failed for timetable, using fallback: " + e.getMessage());
            return new ArrayList<>(FALLBACK_TIMETABLE);
        }
        return list.isEmpty() ? new ArrayList<>(FALLBACK_TIMETABLE) : list;
    }

    public TimetableEntry addTimetableEntry(TimetableEntry entry) {
        String sql = "INSERT INTO timetable (user_id, day_of_week, subject, room, start_time, end_time, instructor) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, entry.getUserId());
            stmt.setString(2, entry.getDayOfWeek());
            stmt.setString(3, entry.getSubject());
            stmt.setString(4, entry.getRoom());
            stmt.setString(5, entry.getStartTime());
            stmt.setString(6, entry.getEndTime());
            stmt.setString(7, entry.getInstructor());
            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    entry.setId(rs.getInt(1));
                }
            }
            FALLBACK_TIMETABLE.add(entry);
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Failed to insert timetable entry, using fallback: " + e.getMessage());
            int newId = TT_ID_GEN.incrementAndGet();
            entry.setId(newId);
            FALLBACK_TIMETABLE.add(entry);
        }
        return entry;
    }

    public List<AttendanceRecord> getAttendanceByUserId(int userId) {
        List<AttendanceRecord> list = new ArrayList<>();
        String sql = "SELECT id, user_id, subject, total_classes, attended_classes, target_percentage FROM attendance WHERE user_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new AttendanceRecord(
                            rs.getInt("id"),
                            rs.getInt("user_id"),
                            rs.getString("subject"),
                            rs.getInt("total_classes"),
                            rs.getInt("attended_classes"),
                            rs.getDouble("target_percentage")
                    ));
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Database lookup failed for attendance, using fallback: " + e.getMessage());
            return new ArrayList<>(FALLBACK_ATTENDANCE);
        }
        return list.isEmpty() ? new ArrayList<>(FALLBACK_ATTENDANCE) : list;
    }

    public AttendanceRecord stepAttendance(int recordId, boolean attended) {
        String updateSql = "UPDATE attendance SET total_classes = total_classes + 1, attended_classes = attended_classes + ? WHERE id = ?";
        String selectSql = "SELECT id, user_id, subject, total_classes, attended_classes, target_percentage FROM attendance WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement updateStmt = conn.prepareStatement(updateSql);
             PreparedStatement selectStmt = conn.prepareStatement(selectSql)) {
            updateStmt.setInt(1, attended ? 1 : 0);
            updateStmt.setInt(2, recordId);
            updateStmt.executeUpdate();

            selectStmt.setInt(1, recordId);
            try (ResultSet rs = selectStmt.executeQuery()) {
                if (rs.next()) {
                    AttendanceRecord updated = new AttendanceRecord(
                            rs.getInt("id"),
                            rs.getInt("user_id"),
                            rs.getString("subject"),
                            rs.getInt("total_classes"),
                            rs.getInt("attended_classes"),
                            rs.getDouble("target_percentage")
                    );
                    syncFallbackAttendance(updated);
                    return updated;
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Step attendance DB operation failed, performing in-memory step: " + e.getMessage());
        }

        // Accurate in-memory step for specific course record
        for (AttendanceRecord rec : FALLBACK_ATTENDANCE) {
            if (rec.getId() == recordId) {
                rec.setTotalClasses(rec.getTotalClasses() + 1);
                if (attended) {
                    rec.setAttendedClasses(rec.getAttendedClasses() + 1);
                }
                return rec;
            }
        }

        AttendanceRecord newRec = new AttendanceRecord(recordId, 2, "Course #" + recordId, 1, attended ? 1 : 0, 75.0);
        FALLBACK_ATTENDANCE.add(newRec);
        return newRec;
    }

    private void syncFallbackAttendance(AttendanceRecord updated) {
        for (int i = 0; i < FALLBACK_ATTENDANCE.size(); i++) {
            if (FALLBACK_ATTENDANCE.get(i).getId() == updated.getId()) {
                FALLBACK_ATTENDANCE.set(i, updated);
                return;
            }
        }
        FALLBACK_ATTENDANCE.add(updated);
    }
}
