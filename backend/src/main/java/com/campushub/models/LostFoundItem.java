package com.campushub.models;

import java.sql.Timestamp;

public class LostFoundItem {
    private int id;
    private int reporterId;
    private String reporterName;
    private String type; // 'LOST' or 'FOUND'
    private String title;
    private String description;
    private String location;
    private String dateReported;
    private String status; // 'OPEN', 'PENDING_VERIFICATION', 'RESOLVED'
    private String claimStatus;
    private String imageUrl;
    private Timestamp createdAt;

    public LostFoundItem() {
    }

    public LostFoundItem(int id, int reporterId, String reporterName, String type, String title, String description, String location, String dateReported, String status, String imageUrl, Timestamp createdAt) {
        this.id = id;
        this.reporterId = reporterId;
        this.reporterName = reporterName;
        this.type = type;
        this.title = title;
        this.description = description;
        this.location = location;
        this.dateReported = dateReported;
        this.status = status;
        this.claimStatus = status;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getReporterId() {
        return reporterId;
    }

    public void setReporterId(int reporterId) {
        this.reporterId = reporterId;
    }

    public String getReporterName() {
        return reporterName;
    }

    public void setReporterName(String reporterName) {
        this.reporterName = reporterName;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDateReported() {
        return dateReported;
    }

    public void setDateReported(String dateReported) {
        this.dateReported = dateReported;
    }

    public String getStatus() {
        return status != null ? status : claimStatus;
    }

    public void setStatus(String status) {
        this.status = status;
        this.claimStatus = status;
    }

    public String getClaimStatus() {
        return claimStatus != null ? claimStatus : status;
    }

    public void setClaimStatus(String claimStatus) {
        this.claimStatus = claimStatus;
        this.status = claimStatus;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }
}
