package com.campushub.models;

import java.math.BigDecimal;
import java.sql.Timestamp;

public class MarketplaceItem {
    private int id;
    private int sellerId;
    private String sellerName;
    private String title;
    private String description;
    private BigDecimal price;
    private String category;
    private String status;
    private String imageUrl;
    private Timestamp createdAt;

    public MarketplaceItem() {
    }

    public MarketplaceItem(int id, int sellerId, String sellerName, String title, String description, BigDecimal price, String category, String status, String imageUrl, Timestamp createdAt) {
        this.id = id;
        this.sellerId = sellerId;
        this.sellerName = sellerName;
        this.title = title;
        this.description = description;
        this.price = price;
        this.category = category;
        this.status = status;
        this.imageUrl = imageUrl;
        this.createdAt = createdAt;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getSellerId() {
        return sellerId;
    }

    public void setSellerId(int sellerId) {
        this.sellerId = sellerId;
    }

    public String getSellerName() {
        return sellerName;
    }

    public void setSellerName(String sellerName) {
        this.sellerName = sellerName;
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

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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
