package com.campushub.utils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

public class FileStorageUtil {

    private static final Logger LOGGER = Logger.getLogger(FileStorageUtil.class.getName());

    static {
        try {
            Path basePath = Paths.get(System.getProperty("user.dir"));
            Files.createDirectories(basePath.resolve(Paths.get("storage", "marketplace")));
            Files.createDirectories(basePath.resolve(Paths.get("storage", "lostfound")));
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to create storage directories: " + e.getMessage(), e);
        }
    }

    public static String saveBase64Image(String base64Data, String subFolder) {
        String fallbackPath = "storage/" + subFolder + "/placeholder.png";
        if (base64Data == null || base64Data.trim().isEmpty()) {
            return fallbackPath;
        }

        try {
            String extension = ".png";
            String rawBase64 = base64Data.trim();

            if (rawBase64.contains(";base64,")) {
                String header = rawBase64.substring(0, rawBase64.indexOf(";base64,")).toLowerCase();
                if (header.contains("jpeg") || header.contains("jpg")) {
                    extension = ".jpg";
                } else if (header.contains("png")) {
                    extension = ".png";
                } else if (header.contains("webp")) {
                    extension = ".webp";
                } else if (header.contains("gif")) {
                    extension = ".gif";
                }
                rawBase64 = rawBase64.substring(rawBase64.indexOf(";base64,") + 8);
            } else if (rawBase64.contains(",")) {
                rawBase64 = rawBase64.substring(rawBase64.indexOf(",") + 1);
            }

            rawBase64 = rawBase64.trim();
            if (rawBase64.isEmpty()) {
                return fallbackPath;
            }

            byte[] decodedBytes = Base64.getDecoder().decode(rawBase64);
            String fileName = UUID.randomUUID().toString() + extension;

            Path storageDir = Paths.get(System.getProperty("user.dir"), "storage", subFolder);
            Files.createDirectories(storageDir);

            Path targetPath = storageDir.resolve(fileName);
            Files.write(targetPath, decodedBytes);

            return "storage/" + subFolder + "/" + fileName;
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Error saving base64 image to " + subFolder + ": " + e.getMessage(), e);
            return fallbackPath;
        }
    }
}
