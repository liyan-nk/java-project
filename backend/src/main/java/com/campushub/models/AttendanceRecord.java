package com.campushub.models;

public class AttendanceRecord {
    private int id;
    private int userId;
    private String subject;
    private int totalClasses;
    private int attendedClasses;
    private double targetPercentage;

    public AttendanceRecord() {
    }

    public AttendanceRecord(int id, int userId, String subject, int totalClasses, int attendedClasses, double targetPercentage) {
        this.id = id;
        this.userId = userId;
        this.subject = subject;
        this.totalClasses = totalClasses;
        this.attendedClasses = attendedClasses;
        this.targetPercentage = targetPercentage;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public int getTotalClasses() {
        return totalClasses;
    }

    public void setTotalClasses(int totalClasses) {
        this.totalClasses = totalClasses;
    }

    public int getAttendedClasses() {
        return attendedClasses;
    }

    public void setAttendedClasses(int attendedClasses) {
        this.attendedClasses = attendedClasses;
    }

    public double getTargetPercentage() {
        return targetPercentage;
    }

    public void setTargetPercentage(double targetPercentage) {
        this.targetPercentage = targetPercentage;
    }

    public double getPercentage() {
        if (totalClasses == 0) return 0.0;
        return Math.round((double) attendedClasses / totalClasses * 100.0 * 100.0) / 100.0;
    }
}
