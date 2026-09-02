# CampusHub Technical Architecture Specification

## Overview

CampusHub is built as a high-performance monorepo application using **Java 21 LTS**, **HikariCP**, **MariaDB / MySQL**, and an **Embedded JDK HttpServer** operating on **Virtual Threads (`Executors.newVirtualThreadPerTaskExecutor()`)**. The frontend is a light-weight progressive web application (PWA) using standard HTML5, CSS tokens, and JavaScript modules.

---

## 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------+
|                             Browser / PWA                             |
|        (index.html, styles.css, app.js, theme.js, sw.js)             |
+-----------------------------------------------------------------------+
                                   |
                          HTTP / REST API / Static
                                   v
+-----------------------------------------------------------------------+
|                       JDK HttpServer (Port 8080)                      |
|                  VirtualThreadPerTaskExecutor (Java 21)               |
+-----------------------------------------------------------------------+
            |                                           |
    Static File Handler                          REST API Context Handler
      (frontend/)                          (/api/user, /api/timetable, etc.)
                                                        |
                                                        v
                                          +-----------------------------+
                                          |          DAOs               |
                                          |  (User, Planner, Market...) |
                                          +-----------------------------+
                                                        |
                                                        v
                                          +-----------------------------+
                                          |     HikariCP Pool Singleton |
                                          +-----------------------------+
                                                        |
                                                        v
                                          +-----------------------------+
                                          |       MariaDB / MySQL       |
                                          +-----------------------------+
```

---

## 2. Core Backend Technologies

1. **Java 21 LTS**:
   - Utilizes Project Loom's Virtual Threads (`Executors.newVirtualThreadPerTaskExecutor()`) to handle concurrent HTTP requests with minimal OS thread overhead.
2. **Embedded JDK HttpServer (`com.sun.net.httpserver.HttpServer`)**:
   - Zero framework overhead (no Spring Boot / Tomcat bloat).
   - Serves both static frontend assets and REST API endpoints over HTTP 8080.
3. **HikariCP 5.1.0 Connection Pool**:
   - Thread-safe singleton (`DatabaseConfig.java`) providing database connections with connection testing and lifecycle management.
4. **BCrypt Password Hashing (`jbcrypt 0.4`)**:
   - Secure salted password hashing for stored credentials.
5. **Gson 2.10.1**:
   - Fast JSON serialization and deserialization across REST endpoints.

---

## 3. Database Layer & DAOs

The database schema (`backend/src/main/resources/sql/schema.sql`) contains 5 relational tables with cascading foreign keys:
- `users`: Core account details and authentication records.
- `timetable`: Schedule entries linked to `users(id) ON DELETE CASCADE`.
- `attendance`: Class tracking stats linked to `users(id) ON DELETE CASCADE`.
- `marketplace_items`: Campus store listings linked to `users(id) ON DELETE CASCADE`.
- `lost_found_items`: Lost and found reports linked to `users(id) ON DELETE CASCADE`.

DAO classes utilize standard JDBC `PreparedStatement` and `try-with-resources` blocks to prevent connection leaks.

---

## 4. REST Endpoints Architecture

Canonical routes defined in `WebServer.java`:
- `/api/user` -> `UserDAO`
- `/api/timetable` -> `PlannerDAO`
- `/api/attendance` -> `PlannerDAO`
- `/api/attendance/step` -> `PlannerDAO`
- `/api/marketplace` -> `MarketplaceDAO`
- `/api/lostfound` -> `LostFoundDAO`
- `/api/lostfound/claim` -> `LostFoundDAO`
