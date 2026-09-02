package com.campushub.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

public class DatabaseConfig {

    private static final Logger LOGGER = Logger.getLogger(DatabaseConfig.class.getName());
    private static HikariDataSource dataSource;

    static {
        try {
            Properties props = new Properties();
            try (InputStream input = DatabaseConfig.class.getClassLoader().getResourceAsStream("db.properties")) {
                if (input != null) {
                    props.load(input);
                } else {
                    LOGGER.warning("db.properties not found on classpath, loading default configuration.");
                    props.setProperty("db.driverClassName", "com.mysql.cj.jdbc.Driver");
                    props.setProperty("db.url", "jdbc:mysql://localhost:3306/campushub_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC");
                    props.setProperty("db.username", "root");
                    props.setProperty("db.password", "");
                }
            }

            HikariConfig config = new HikariConfig();
            config.setDriverClassName(props.getProperty("db.driverClassName", "com.mysql.cj.jdbc.Driver"));
            config.setJdbcUrl(props.getProperty("db.url", "jdbc:mysql://localhost:3306/campushub_db"));
            config.setUsername(props.getProperty("db.username", "root"));
            config.setPassword(props.getProperty("db.password", ""));
            
            config.setMaximumPoolSize(Integer.parseInt(props.getProperty("db.maximumPoolSize", "10")));
            config.setMinimumIdle(Integer.parseInt(props.getProperty("db.minimumIdle", "2")));
            config.setIdleTimeout(Long.parseLong(props.getProperty("db.idleTimeout", "30000")));
            config.setConnectionTimeout(Long.parseLong(props.getProperty("db.connectionTimeout", "20000")));

            dataSource = new HikariDataSource(config);
            LOGGER.info("HikariCP connection pool successfully initialized for CampusHub.");
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to initialize HikariCP connection pool: " + e.getMessage(), e);
        }
    }

    private DatabaseConfig() {
        // Private constructor for utility / singleton class
    }

    public static Connection getConnection() throws SQLException {
        if (dataSource == null) {
            throw new SQLException("HikariDataSource is not initialized properly.");
        }
        return dataSource.getConnection();
    }

    public static HikariDataSource getDataSource() {
        return dataSource;
    }

    public static void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
            LOGGER.info("HikariCP connection pool closed.");
        }
    }
}
