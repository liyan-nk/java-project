# CampusHub Monorepo 🎓

Next-Gen Campus Intelligence Platform featuring a JDK 21 Virtual Threads embedded backend server and an Apple x Notion styled PWA frontend.

---

## 📁 Repository Structure

```
├── .gitignore
├── README.md
├── docs/
│   ├── API_CONTRACT.md          # Complete REST API specification
│   ├── FRONTEND_BRIEF.md        # Design tokens & AI prompt for Farsin
│   └── ARCHITECTURE.md          # System & backend architecture guide
├── backend/
│   ├── pom.xml                  # Maven Java 21 configuration
│   └── src/
│       └── main/
│           ├── java/com/campushub/
│           │   ├── Launcher.java              # Main application launcher
│           │   ├── MainApp.java               # Service initializer
│           │   ├── config/
│           │   │   ├── DatabaseConfig.java    # Thread-safe HikariCP pool
│           │   │   └── WebServer.java         # Embedded JDK HttpServer
│           │   ├── dao/
│           │   │   ├── UserDAO.java
│           │   │   ├── PlannerDAO.java
│           │   │   ├── MarketplaceDAO.java
│           │   │   └── LostFoundDAO.java
│           │   ├── models/
│           │   │   ├── User.java
│           │   │   ├── TimetableEntry.java
│           │   │   ├── AttendanceRecord.java
│           │   │   ├── MarketplaceItem.java
│           │   │   └── LostFoundItem.java
│           │   └── utils/
│           │       └── PasswordUtil.java      # BCrypt security wrapper
│           └── resources/
│               ├── db.properties              # Database properties
│               └── sql/
│                   └── schema.sql             # MariaDB/MySQL DDL & Seeds
└── frontend/
    ├── index.html               # Mobile-first PWA shell
    ├── manifest.json            # Web App Manifest
    ├── sw.js                    # Service Worker caching script
    ├── css/
    │   └── styles.css           # Apple x Notion CSS Tokens
    └── js/
        ├── theme.js             # Light/Dark mode manager
        └── app.js               # REST API client & view routing
```

---

## 👥 Multi-Stream Development Roles & Branches

- **`main`**: Production-ready monorepo baseline and documentation.
- **`liyan-backend`**: Liyan's backend stream (Java 21, JDBC DAOs, WebServer endpoints).
- **`farsin-frontend`**: Ahamed Farsin's frontend stream (UI/UX, PWA components, CSS tokens).

---

## 🚀 Canonical REST API Endpoints

- `GET /api/user` — User profile endpoint
- `GET, POST /api/timetable` — Course schedule management
- `GET /api/attendance` — Attendance record tracking
- `POST /api/attendance/step` — Attendance increment/decrement logger
- `GET, POST /api/marketplace` — Campus marketplace listings
- `GET /api/lostfound` — Lost & Found item reports
- `POST /api/lostfound/claim` — Item resolution & claim status update

---

## ⚙️ Setup & Run Instructions

### Prerequisites
- JDK 21 LTS or higher
- Apache Maven 3.8+
- MariaDB or MySQL (Optional: Server includes automatic fallback mode if DB is offline)

### 1. Database Setup (Optional)
Import the schema into your MySQL/MariaDB database:
```bash
mysql -u root -p < backend/src/main/resources/sql/schema.sql
```

### 2. Build & Launch Backend Server
```bash
cd backend
mvn clean package
java -jar target/campushub-backend-1.0.0.jar
```
Or directly via Maven:
```bash
cd backend
mvn compile exec:java -Dexec.mainClass="com.campushub.Launcher"
```

The application will start on `http://localhost:8080`, serving both the REST API and the frontend PWA.
