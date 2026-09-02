package com.campushub.config;

import com.campushub.dao.LostFoundDAO;
import com.campushub.dao.MarketplaceDAO;
import com.campushub.dao.PlannerDAO;
import com.campushub.dao.UserDAO;
import com.campushub.models.AttendanceRecord;
import com.campushub.models.LostFoundItem;
import com.campushub.models.MarketplaceItem;
import com.campushub.models.TimetableEntry;
import com.campushub.models.User;
import com.campushub.utils.FileStorageUtil;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.logging.Level;
import java.util.logging.Logger;

public class WebServer {

    private static final Logger LOGGER = Logger.getLogger(WebServer.class.getName());
    private static final int PORT = 8080;
    private static final Gson gson = new Gson();

    private final UserDAO userDAO = new UserDAO();
    private final PlannerDAO plannerDAO = new PlannerDAO();
    private final MarketplaceDAO marketplaceDAO = new MarketplaceDAO();
    private final LostFoundDAO lostFoundDAO = new LostFoundDAO();

    private HttpServer server;

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // JDK 21 VirtualThreadPerTaskExecutor for concurrency
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        // Context Handlers for API
        server.createContext("/api/user", new UserHandler());
        server.createContext("/api/timetable", new TimetableHandler());
        server.createContext("/api/attendance/step", new AttendanceStepHandler());
        server.createContext("/api/attendance", new AttendanceHandler());
        server.createContext("/api/marketplace", new MarketplaceHandler());
        server.createContext("/api/lostfound/claim", new LostFoundClaimHandler());
        server.createContext("/api/lostfound", new LostFoundHandler());

        // Static Storage Handler for Uploaded Files
        server.createContext("/storage/", new StorageFileHandler());

        // Static File Handler for Frontend PWA
        server.createContext("/", new StaticFileHandler());

        server.start();
        LOGGER.info("CampusHub WebServer running on port " + PORT + " with JDK 21 Virtual Threads.");
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            LOGGER.info("CampusHub WebServer stopped.");
        }
    }

    private static void applyCorsAndHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static boolean handlePreflightOptions(HttpExchange exchange) throws IOException {
        applyCorsAndHeaders(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return true;
        }
        return false;
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, Object body) throws IOException {
        applyCorsAndHeaders(exchange);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        String jsonStr = gson.toJson(body);
        byte[] bytes = jsonStr.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }

    // 1. GET /api/user
    private class UserHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange)) return;
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 450, Map.of("error", "Method not allowed"));
                return;
            }
            User user = userDAO.findById(2); // John Doe default active user
            sendJsonResponse(exchange, 200, user);
        }
    }

    // 2. GET, POST /api/timetable
    private class TimetableHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange)) return;
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                List<TimetableEntry> entries = plannerDAO.getTimetableByUserId(2);
                sendJsonResponse(exchange, 200, entries);
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(exchange);
                TimetableEntry entry = gson.fromJson(body, TimetableEntry.class);
                if (entry.getUserId() == 0) entry.setUserId(2);
                TimetableEntry created = plannerDAO.addTimetableEntry(entry);
                sendJsonResponse(exchange, 201, created);
            } else {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        }
    }

    // 3. GET /api/attendance
    private class AttendanceHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange)) return;
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
                return;
            }
            List<AttendanceRecord> records = plannerDAO.getAttendanceByUserId(2);
            sendJsonResponse(exchange, 200, records);
        }
    }

    // 4. POST /api/attendance/step
    private class AttendanceStepHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
                return;
            }
            String body = readRequestBody(exchange);
            JsonObject json = gson.fromJson(body, JsonObject.class);
            int id = json.has("id") ? json.get("id").getAsInt() : 1;
            boolean attended = !json.has("attended") || json.get("attended").getAsBoolean();

            AttendanceRecord updated = plannerDAO.stepAttendance(id, attended);
            sendJsonResponse(exchange, 200, updated);
        }
    }

    // 5. GET, POST /api/marketplace
    private class MarketplaceHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange)) return;
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                List<MarketplaceItem> items = marketplaceDAO.getAllItems();
                sendJsonResponse(exchange, 200, items);
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(exchange);
                JsonObject json = gson.fromJson(body, JsonObject.class);

                String imageBase64 = null;
                if (json != null) {
                    if (json.has("imageBase64") && !json.get("imageBase64").isJsonNull()) {
                        imageBase64 = json.get("imageBase64").getAsString();
                    } else if (json.has("imageUrl") && !json.get("imageUrl").isJsonNull()) {
                        imageBase64 = json.get("imageUrl").getAsString();
                    }
                }

                String imagePath = FileStorageUtil.saveBase64Image(imageBase64, "marketplace");

                MarketplaceItem item = new MarketplaceItem();
                item.setSellerId(2);
                item.setTitle(json != null && json.has("title") ? json.get("title").getAsString() : "Untitled Item");
                item.setDescription(json != null && json.has("description") ? json.get("description").getAsString() : "");
                if (json != null && json.has("price") && !json.get("price").isJsonNull()) {
                    item.setPrice(json.get("price").getAsBigDecimal());
                } else {
                    item.setPrice(BigDecimal.ZERO);
                }
                item.setCategory(json != null && json.has("category") ? json.get("category").getAsString() : "GENERAL");
                item.setStatus("AVAILABLE");
                item.setImageUrl(imagePath);

                MarketplaceItem created = marketplaceDAO.createItem(item);

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("id", created.getId());
                response.put("imagePath", imagePath);
                sendJsonResponse(exchange, 201, response);
            } else {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        }
    }

    // 6. GET, POST /api/lostfound
    private class LostFoundHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange)) return;
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                sendJsonResponse(exchange, 200, lostFoundDAO.getAllItems());
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(exchange);
                JsonObject json = gson.fromJson(body, JsonObject.class);

                String imageBase64 = null;
                if (json != null) {
                    if (json.has("imageBase64") && !json.get("imageBase64").isJsonNull()) {
                        imageBase64 = json.get("imageBase64").getAsString();
                    } else if (json.has("imageUrl") && !json.get("imageUrl").isJsonNull()) {
                        imageBase64 = json.get("imageUrl").getAsString();
                    }
                }

                String imagePath = FileStorageUtil.saveBase64Image(imageBase64, "lostfound");

                String title = json != null && json.has("itemName") ? json.get("itemName").getAsString() : (json != null && json.has("title") ? json.get("title").getAsString() : "Reported Item");
                String type = json != null && json.has("itemType") ? json.get("itemType").getAsString() : (json != null && json.has("type") ? json.get("type").getAsString() : "LOST");
                String location = json != null && json.has("locationFoundOrLost") ? json.get("locationFoundOrLost").getAsString() : (json != null && json.has("location") ? json.get("location").getAsString() : "Campus");
                String dateReported = json != null && json.has("dateReported") ? json.get("dateReported").getAsString() : java.time.LocalDate.now().toString();
                String description = json != null && json.has("description") ? json.get("description").getAsString() : "";

                LostFoundItem item = new LostFoundItem();
                item.setReporterId(2);
                item.setTitle(title);
                item.setType(type);
                item.setLocation(location);
                item.setDateReported(dateReported);
                item.setDescription(description);
                item.setStatus("OPEN");
                item.setImageUrl(imagePath);

                LostFoundItem created = lostFoundDAO.createItem(item);

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("id", created.getId());
                response.put("imagePath", imagePath);
                sendJsonResponse(exchange, 201, response);
            } else {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        }
    }

    // Static Storage Route Handler for /storage/
    private static class StorageFileHandler implements HttpHandler {
        private final Map<String, String> mimeTypes = new HashMap<>();

        public StorageFileHandler() {
            mimeTypes.put("png", "image/png");
            mimeTypes.put("jpg", "image/jpeg");
            mimeTypes.put("jpeg", "image/jpeg");
            mimeTypes.put("webp", "image/webp");
            mimeTypes.put("gif", "image/gif");
            mimeTypes.put("svg", "image/svg+xml");
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            applyCorsAndHeaders(exchange);
            if (handlePreflightOptions(exchange)) return;

            String pathStr = exchange.getRequestURI().getPath();
            String subPath = pathStr.startsWith("/storage/") ? pathStr.substring("/storage/".length()) : pathStr.substring(1);

            Path basePath = Paths.get(System.getProperty("user.dir"), "storage").normalize();
            Path filePath = basePath.resolve(subPath).normalize();

            if (filePath.startsWith(basePath) && Files.exists(filePath) && !Files.isDirectory(filePath)) {
                String fileName = filePath.getFileName().toString();
                int i = fileName.lastIndexOf('.');
                String ext = (i > 0) ? fileName.substring(i + 1).toLowerCase() : "";
                String contentType = mimeTypes.getOrDefault(ext, "application/octet-stream");

                exchange.getResponseHeaders().set("Content-Type", contentType);
                byte[] data = Files.readAllBytes(filePath);
                exchange.sendResponseHeaders(200, data.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(data);
                }
            } else {
                sendJsonResponse(exchange, 404, Map.of("error", "File not found"));
            }
        }
    }

    // 7. POST /api/lostfound/claim
    private class LostFoundClaimHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange)) return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
                return;
            }
            String body = readRequestBody(exchange);
            JsonObject json = gson.fromJson(body, JsonObject.class);
            int id = json.has("id") ? json.get("id").getAsInt() : 1;
            String status = json.has("status") ? json.get("status").getAsString() : "CLAIMED";

            sendJsonResponse(exchange, 200, lostFoundDAO.claimItem(id, status));
        }
    }

    // Static Asset Handler for Frontend Files
    private static class StaticFileHandler implements HttpHandler {
        private final Map<String, String> mimeTypes = new HashMap<>();

        public StaticFileHandler() {
            mimeTypes.put("html", "text/html; charset=UTF-8");
            mimeTypes.put("css", "text/css; charset=UTF-8");
            mimeTypes.put("js", "application/javascript; charset=UTF-8");
            mimeTypes.put("json", "application/json; charset=UTF-8");
            mimeTypes.put("png", "image/png");
            mimeTypes.put("jpg", "image/jpeg");
            mimeTypes.put("svg", "image/svg+xml");
            mimeTypes.put("ico", "image/x-icon");
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            applyCorsAndHeaders(exchange);
            String pathStr = exchange.getRequestURI().getPath();
            if (pathStr.equals("/")) pathStr = "/index.html";

            // Resolve frontend path
            Path basePath = Paths.get(System.getProperty("user.dir"), "frontend").normalize();
            Path filePath = basePath.resolve(pathStr.substring(1)).normalize();

            if (!filePath.startsWith(basePath) || !Files.exists(filePath) || Files.isDirectory(filePath)) {
                // Fallback to index.html for SPA routing if file not found
                filePath = basePath.resolve("index.html");
            }

            if (Files.exists(filePath) && !Files.isDirectory(filePath)) {
                String ext = getExtension(filePath.getFileName().toString());
                String contentType = mimeTypes.getOrDefault(ext, "application/octet-stream");
                exchange.getResponseHeaders().set("Content-Type", contentType);

                byte[] data = Files.readAllBytes(filePath);
                exchange.sendResponseHeaders(200, data.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(data);
                }
            } else {
                String errorMsg = "404 Not Found";
                exchange.sendResponseHeaders(404, errorMsg.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorMsg.getBytes(StandardCharsets.UTF_8));
                }
            }
        }

        private String getExtension(String fileName) {
            int i = fileName.lastIndexOf('.');
            return (i > 0) ? fileName.substring(i + 1) : "";
        }
    }
}
