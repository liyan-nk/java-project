package com.campushub.utils;

import org.mindrot.jbcrypt.BCrypt;

public class PasswordUtil {

    private PasswordUtil() {
        // Utility class constructor
    }

    /**
     * Hashes a plain-text password using BCrypt.
     *
     * @param plainTextPassword The raw password string.
     * @return Hashed password string.
     */
    public static String hashPassword(String plainTextPassword) {
        if (plainTextPassword == null || plainTextPassword.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be null or empty.");
        }
        return BCrypt.hashpw(plainTextPassword, BCrypt.gensalt(10));
    }

    /**
     * Verifies a plain-text password against a hashed BCrypt password.
     *
     * @param plainTextPassword Raw password string.
     * @param hashedPassword    Hashed BCrypt string.
     * @return true if password matches, false otherwise.
     */
    public static boolean checkPassword(String plainTextPassword, String hashedPassword) {
        if (plainTextPassword == null || hashedPassword == null) {
            return false;
        }
        try {
            return BCrypt.checkpw(plainTextPassword, hashedPassword);
        } catch (Exception e) {
            return false;
        }
    }
}
