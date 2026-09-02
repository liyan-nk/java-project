package com.campushub;

import com.campushub.config.DatabaseConfig;
import com.campushub.config.WebServer;

import java.util.logging.Level;
import java.util.logging.Logger;

public class MainApp {

    private static final Logger LOGGER = Logger.getLogger(MainApp.class.getName());

    public static void startApp() {
        LOGGER.info("Starting CampusHub Application Services...");
        try {
            // Test DB Connection
            try {
                DatabaseConfig.getConnection();
                LOGGER.info("Connected to CampusHub Database.");
            } catch (Exception e) {
                LOGGER.warning("Running without active MySQL instance. DAO fallbacks enabled: " + e.getMessage());
            }

            // Start Web Server
            WebServer server = new WebServer();
            server.start();

            // Shutdown Hook
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                LOGGER.info("Shutting down CampusHub...");
                server.stop();
                DatabaseConfig.close();
            }));

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Fatal error during CampusHub startup: " + e.getMessage(), e);
        }
    }
}
