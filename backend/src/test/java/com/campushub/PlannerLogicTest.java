package com.campushub;

import com.campushub.models.AttendanceRecord;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class PlannerLogicTest {

    @Test
    @DisplayName("Verify attendance percentage and low warning threshold calculation")
    public void testAttendancePercentageAndLowThreshold() {
        // 15/20 = 75.0% -> isLow = false
        AttendanceRecord rec1 = new AttendanceRecord(1, 2, "Mathematics", 20, 15, 75.0);
        assertEquals(75.0, rec1.getPercentage(), 0.01, "15/20 should equal 75.0%");
        assertFalse(rec1.isLow(), "15/20 (75.0%) must not trigger low attendance warning (isLow = false)");

        // 14/20 = 70.0% -> isLow = true
        AttendanceRecord rec2 = new AttendanceRecord(2, 2, "Physics", 20, 14, 75.0);
        assertEquals(70.0, rec2.getPercentage(), 0.01, "14/20 should equal 70.0%");
        assertTrue(rec2.isLow(), "14/20 (70.0%) must trigger low attendance warning (isLow = true)");
    }

    @Test
    @DisplayName("Verify absent stepping effects on attendance percentage and warning threshold")
    public void testAbsentSteppingThresholds() {
        // 21/24 (87.5%) + absent step -> 21/25 (84.0%) -> isLow = false
        AttendanceRecord rec3 = new AttendanceRecord(3, 2, "Data Structures", 24, 21, 75.0);
        assertEquals(87.5, rec3.getPercentage(), 0.01, "21/24 initial percentage should be 87.5%");
        assertFalse(rec3.isLow(), "21/24 (87.5%) should not be low");

        // Simulate absent step (totalClasses incremented by 1)
        rec3.setTotalClasses(rec3.getTotalClasses() + 1);
        assertEquals(25, rec3.getTotalClasses());
        assertEquals(21, rec3.getAttendedClasses());
        assertEquals(84.0, rec3.getPercentage(), 0.01, "21/25 percentage should be 84.0%");
        assertFalse(rec3.isLow(), "21/25 (84.0%) should not trigger low warning");

        // 14/18 (77.78%) + absent step -> 14/19 (73.68%) -> isLow = true (Alert triggered)
        AttendanceRecord rec4 = new AttendanceRecord(4, 2, "Computer Networks", 18, 14, 75.0);
        assertEquals(77.78, rec4.getPercentage(), 0.01, "14/18 initial percentage should be 77.78%");
        assertFalse(rec4.isLow(), "14/18 (77.78%) should not be low");

        // Simulate absent step (totalClasses incremented by 1)
        rec4.setTotalClasses(rec4.getTotalClasses() + 1);
        assertEquals(19, rec4.getTotalClasses());
        assertEquals(14, rec4.getAttendedClasses());
        assertEquals(73.68, rec4.getPercentage(), 0.01, "14/19 percentage should be 73.68%");
        assertTrue(rec4.isLow(), "14/19 (73.68%) must trigger low attendance alert");
    }

    @Test
    @DisplayName("Verify present stepping effects on attendance percentage and warning threshold")
    public void testPresentSteppingThresholds() {
        // 14/20 (70.0%, low) + present step -> 15/21 (71.43%, low)
        AttendanceRecord rec = new AttendanceRecord(5, 2, "Operating Systems", 20, 14, 75.0);
        assertTrue(rec.isLow());

        // Simulate present step (both totalClasses and attendedClasses incremented by 1)
        rec.setAttendedClasses(rec.getAttendedClasses() + 1);
        rec.setTotalClasses(rec.getTotalClasses() + 1);
        assertEquals(21, rec.getTotalClasses());
        assertEquals(15, rec.getAttendedClasses());
        assertEquals(71.43, rec.getPercentage(), 0.01);
        assertTrue(rec.isLow());
    }
}
