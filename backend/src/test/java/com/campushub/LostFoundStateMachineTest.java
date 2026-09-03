package com.campushub;

import com.campushub.models.LostFoundItem;
import com.campushub.models.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class LostFoundStateMachineTest {

    private User adminUser;
    private User studentReporter;
    private User studentOther;

    @BeforeEach
    public void setUp() {
        adminUser = new User(1, "Admin User", "admin@campushub.com", "hash", "ADMIN", null, null);
        studentReporter = new User(2, "John Doe", "john@campushub.com", "hash", "STUDENT", null, null);
        studentOther = new User(3, "Jane Smith", "jane@campushub.com", "hash", "STUDENT", null, null);
    }

    public static class TransitionResult {
        public int statusCode;
        public String errorMessage;
        public boolean success;

        public TransitionResult(int statusCode, String errorMessage, boolean success) {
            this.statusCode = statusCode;
            this.errorMessage = errorMessage;
            this.success = success;
        }
    }

    public TransitionResult validateTransition(LostFoundItem item, User user, String newStatus) {
        String currentStatus = item.getClaimStatus() != null ? item.getClaimStatus() : item.getStatus();
        if (currentStatus == null) currentStatus = "OPEN";

        if ("RESOLVED".equalsIgnoreCase(currentStatus)) {
            return new TransitionResult(400, "Resolved items cannot change status", false);
        }

        if ("PENDING_VERIFICATION".equalsIgnoreCase(newStatus)) {
            if (!"OPEN".equalsIgnoreCase(currentStatus)) {
                return new TransitionResult(400, "Invalid state transition from " + currentStatus + " to " + newStatus, false);
            }
        } else if ("RESOLVED".equalsIgnoreCase(newStatus) || "OPEN".equalsIgnoreCase(newStatus)) {
            boolean isAuthorized = user != null && ("ADMIN".equalsIgnoreCase(user.getRole()) || user.getId() == item.getReporterId());
            if (!isAuthorized) {
                return new TransitionResult(403, "Only an ADMIN or the original reporter can verify and resolve claims", false);
            }
            if (!"PENDING_VERIFICATION".equalsIgnoreCase(currentStatus)) {
                return new TransitionResult(400, "Invalid state transition from " + currentStatus + " to " + newStatus, false);
            }
        } else {
            return new TransitionResult(400, "Invalid state transition from " + currentStatus + " to " + newStatus, false);
        }

        item.setClaimStatus(newStatus);
        return new TransitionResult(200, null, true);
    }

    @Test
    @DisplayName("Test 1: Transition OPEN -> PENDING_VERIFICATION is allowed for student")
    public void testOpenToPendingVerificationAllowedForStudent() {
        LostFoundItem item = new LostFoundItem(1, studentReporter.getId(), "John Doe", "LOST", "Hydroflask", "Desc", "Union", "2026-09-01", "OPEN", null, null);
        TransitionResult res = validateTransition(item, studentOther, "PENDING_VERIFICATION");
        assertEquals(200, res.statusCode);
        assertTrue(res.success);
        assertEquals("PENDING_VERIFICATION", item.getClaimStatus());
    }

    @Test
    @DisplayName("Test 2: Transition PENDING_VERIFICATION -> RESOLVED is rejected for unauthorized student (HTTP 403)")
    public void testPendingToResolvedRejectedForUnauthorizedStudent() {
        LostFoundItem item = new LostFoundItem(1, studentReporter.getId(), "John Doe", "LOST", "Hydroflask", "Desc", "Union", "2026-09-01", "PENDING_VERIFICATION", null, null);
        TransitionResult res = validateTransition(item, studentOther, "RESOLVED");
        assertEquals(403, res.statusCode);
        assertFalse(res.success);
        assertEquals("Only an ADMIN or the original reporter can verify and resolve claims", res.errorMessage);
        assertEquals("PENDING_VERIFICATION", item.getClaimStatus());
    }

    @Test
    @DisplayName("Test 3: Transition PENDING_VERIFICATION -> RESOLVED is allowed for ADMIN")
    public void testPendingToResolvedAllowedForAdmin() {
        LostFoundItem item = new LostFoundItem(1, studentReporter.getId(), "John Doe", "LOST", "Hydroflask", "Desc", "Union", "2026-09-01", "PENDING_VERIFICATION", null, null);
        TransitionResult res = validateTransition(item, adminUser, "RESOLVED");
        assertEquals(200, res.statusCode);
        assertTrue(res.success);
        assertEquals("RESOLVED", item.getClaimStatus());
    }

    @Test
    @DisplayName("Test 4: Transition RESOLVED -> OPEN is rejected as invalid (HTTP 400)")
    public void testResolvedToOpenRejectedAsInvalid() {
        LostFoundItem item = new LostFoundItem(1, studentReporter.getId(), "John Doe", "LOST", "Hydroflask", "Desc", "Union", "2026-09-01", "RESOLVED", null, null);
        TransitionResult res = validateTransition(item, adminUser, "OPEN");
        assertEquals(400, res.statusCode);
        assertFalse(res.success);
        assertEquals("Resolved items cannot change status", res.errorMessage);
        assertEquals("RESOLVED", item.getClaimStatus());
    }
}
