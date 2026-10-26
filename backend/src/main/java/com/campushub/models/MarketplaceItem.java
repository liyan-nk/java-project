package com.campushub.models;

import com.google.gson.annotations.SerializedName;
import java.math.BigDecimal;
import java.sql.Timestamp;

public class MarketplaceItem {
    private int id;
    private int sellerId;
    private String sellerName;
    private String sellerEmail;
    private String title;
    private String description;
    private BigDecimal price;
    private String category;
    private String status;

    @SerializedName(value = "imageUrl", alternate = {"imagePath"})
    private String imageUrl;

    private Timestamp createdAt;

    private String sellerDepartment;
    private String sellerYear;
    private String sellerPhone;
    private String sellerWhatsapp;
    private String sellerAvatarUrl;

    public MarketplaceItem() {
    }

    public MarketplaceItem(int id, int sellerId, String sellerName, String title, String description, BigDecimal price, String category, String status, String imageUrl, Timestamp createdAt) {
        this(id, sellerId, sellerName, title, description, price, category, status, imageUrl, createdAt, null, null, null, null, null, null);
    }

    public MarketplaceItem(int id, int sellerId, String sellerName, String title, String description, BigDecimal price, String category, String status, String imageUrl, Timestamp createdAt,
                           String sellerDepartment, String sellerYear, String sellerPhone, String sellerEmail, String sellerWhatsapp, String sellerAvatarUrl) {
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
        this.sellerDepartment = sellerDepartment;
        this.sellerYear = sellerYear;
        this.sellerPhone = sellerPhone;
        this.sellerEmail = sellerEmail;
        this.sellerWhatsapp = sellerWhatsapp;
        this.sellerAvatarUrl = sellerAvatarUrl;
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

    public String getSellerEmail() {
        if (sellerEmail != null) return sellerEmail;
        if (sellerName != null) {
            return sellerName.toLowerCase().replace(" ", ".") + "@campushub.com";
        }
        return "seller@campushub.com";
    }

    public void setSellerEmail(String sellerEmail) {
        this.sellerEmail = sellerEmail;
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

    public String getImagePath() {
        return imageUrl;
    }

    public void setImagePath(String imagePath) {
        this.imageUrl = imagePath;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public String getSellerDepartment() {
        return sellerDepartment;
    }

    public void setSellerDepartment(String sellerDepartment) {
        this.sellerDepartment = sellerDepartment;
    }

    public String getSellerYear() {
        return sellerYear;
    }

    public void setSellerYear(String sellerYear) {
        this.sellerYear = sellerYear;
    }

    public String getSellerPhone() {
        return sellerPhone;
    }

    public void setSellerPhone(String sellerPhone) {
        this.sellerPhone = sellerPhone;
    }

    public String getSellerWhatsapp() {
        return sellerWhatsapp;
    }

    public void setSellerWhatsapp(String sellerWhatsapp) {
        this.sellerWhatsapp = sellerWhatsapp;
    }

    public String getSellerAvatarUrl() {
        return sellerAvatarUrl;
    }

    public void setSellerAvatarUrl(String sellerAvatarUrl) {
        this.sellerAvatarUrl = sellerAvatarUrl;
    }
}
