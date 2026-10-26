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
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
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
            if (handlePreflightOptions(exchange))
                return;
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
            if (handlePreflightOptions(exchange))
                return;
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                List<TimetableEntry> entries = plannerDAO.getTimetableByUserId(2);
                sendJsonResponse(exchange, 200, entries);
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(exchange);
                TimetableEntry entry = gson.fromJson(body, TimetableEntry.class);
                if (entry.getUserId() == 0)
                    entry.setUserId(2);
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
            if (handlePreflightOptions(exchange))
                return;
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
            if (handlePreflightOptions(exchange))
                return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
                return;
            }
            String body = readRequestBody(exchange);
            JsonObject json = gson.fromJson(body, JsonObject.class);
            int id = (json != null && json.has("id")) ? json.get("id").getAsInt() : 1;
            boolean present = true;
            if (json != null) {
                if (json.has("present")) {
                    present = json.get("present").getAsBoolean();
                } else if (json.has("attended")) {
                    present = json.get("attended").getAsBoolean();
                }
            }

            AttendanceRecord record = plannerDAO.stepAttendance(id, present);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("id", record.getId());
            response.put("attendedClasses", record.getAttendedClasses());
            response.put("totalClasses", record.getTotalClasses());
            response.put("percentage", record.getPercentage());
            response.put("isLow", record.isLow());

            sendJsonResponse(exchange, 200, response);
        }
    }

    // 5. GET, POST /api/marketplace
    private class MarketplaceHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange))
                return;
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                String query = exchange.getRequestURI().getQuery();
                List<MarketplaceItem> items = marketplaceDAO.getAllItems();
                if (query != null && query.contains("category=")) {
                    String categoryParam = "";
                    for (String param : query.split("&")) {
                        String[] pair = param.split("=");
                        if (pair.length == 2 && pair[0].equalsIgnoreCase("category")) {
                            categoryParam = pair[1].toUpperCase();
                        }
                    }
                    if (!categoryParam.isEmpty() && !categoryParam.equals("ALL")) {
                        final String cat = categoryParam;
                        items = items.stream().filter(i -> {
                            String ic = i.getCategory() != null ? i.getCategory().toUpperCase() : "";
                            return ic.equals(cat) 
                                || (cat.equals("TEXTBOOKS") && (ic.equals("BOOKS") || ic.equals("BOOK")))
                                || (cat.equals("TECH") && (ic.equals("ELECTRONICS") || ic.equals("GADGETS")))
                                || (cat.equals("DORM") && (ic.equals("FURNITURE")))
                                || (cat.equals("GENERAL") && (ic.equals("OTHER")));
                        }).toList();
                    }
                }
                sendJsonResponse(exchange, 200, items);
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(exchange);
                MarketplaceItem item = gson.fromJson(body, MarketplaceItem.class);
                if (item == null) {
                    item = new MarketplaceItem();
                }
                if (item.getSellerId() == 0) {
                    item.setSellerId(2);
                }
                String imagePath = item.getImageUrl();
                if (imagePath != null && imagePath.startsWith("data:image")) {
                    imagePath = FileStorageUtil.saveBase64Image(imagePath, "marketplace");
                    item.setImageUrl(imagePath);
                }
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

    // 6. GET & POST /api/lostfound
    private class LostFoundHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handlePreflightOptions(exchange))
                return;
            String method = exchange.getRequestMethod();
            if ("GET".equalsIgnoreCase(method)) {
                String query = exchange.getRequestURI().getQuery();
                List<LostFoundItem> items = lostFoundDAO.getAllItems();
                if (query != null && query.contains("type=")) {
                    String type = query.split("type=")[1].split("&")[0].toUpperCase();
                    if (!type.equals("ALL")) {
                        items = items.stream().filter(i -> i.getType() != null && i.getType().equalsIgnoreCase(type)).toList();
                    }
                }
                sendJsonResponse(exchange, 200, items);
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(exchange);
                LostFoundItem item = gson.fromJson(body, LostFoundItem.class);
                if (item == null) {
                    item = new LostFoundItem();
                }
                if (item.getReporterId() == 0) {
                    item.setReporterId(2);
                }
                if (item.getReporterName() == null || item.getReporterName().isBlank()) {
                    item.setReporterName("Campus Student");
                }
                if (item.getImageUrl() != null && item.getImageUrl().startsWith("data:image")) {
                    String imagePath = FileStorageUtil.saveBase64Image(item.getImageUrl(), "lostfound");
                    item.setImageUrl(imagePath);
                }
                LostFoundItem created = lostFoundDAO.createItem(item);
                sendJsonResponse(exchange, 201, created);
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
            if (!Files.exists(basePath)) {
                basePath = Paths.get(System.getProperty("user.dir"), "..", "storage").normalize();
            }
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
            if (handlePreflightOptions(exchange))
                return;
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJsonResponse(exchange, 405, Map.of("error", "Method not allowed"));
                return;
            }
            String body = readRequestBody(exchange);
            JsonObject json = gson.fromJson(body, JsonObject.class);

            int itemId = 0;
            if (json != null) {
                if (json.has("itemId")) {
                    itemId = json.get("itemId").getAsInt();
                } else if (json.has("id")) {
                    itemId = json.get("id").getAsInt();
                }
            }

            String newStatus = null;
            if (json != null) {
                if (json.has("newStatus")) {
                    newStatus = json.get("newStatus").getAsString();
                } else if (json.has("status")) {
                    newStatus = json.get("status").getAsString();
                }
            }

            int userId = (json != null && json.has("userId")) ? json.get("userId").getAsInt() : 2;

            User actingUser = userDAO.getUserById(userId);
            if (actingUser == null) {
                actingUser = userDAO.getUserById(2);
            }

            LostFoundItem item = lostFoundDAO.getItemById(itemId);
            if (item == null) {
                sendJsonResponse(exchange, 404, Map.of("error", "Item not found"));
                return;
            }

            String currentStatus = item.getClaimStatus() != null ? item.getClaimStatus() : item.getStatus();
            if (currentStatus == null) {
                currentStatus = "OPEN";
            }

            // State Machine Rules
            if ("RESOLVED".equalsIgnoreCase(currentStatus)) {
                sendJsonResponse(exchange, 400, Map.of("error", "Resolved items cannot change status"));
                return;
            }

            if ("PENDING_VERIFICATION".equalsIgnoreCase(newStatus)) {
                if (!"OPEN".equalsIgnoreCase(currentStatus)) {
                    sendJsonResponse(exchange, 400, Map.of("error", "Invalid state transition from " + currentStatus + " to " + newStatus));
                    return;
                }
            } else if ("RESOLVED".equalsIgnoreCase(newStatus)) {
                boolean isAuthorized = actingUser != null && ("ADMIN".equalsIgnoreCase(actingUser.getRole()) || actingUser.getId() == item.getReporterId());
                if (!isAuthorized) {
                    sendJsonResponse(exchange, 403, Map.of("error", "Only an ADMIN or the original reporter can verify and resolve claims"));
                    return;
                }
                if (!"PENDING_VERIFICATION".equalsIgnoreCase(currentStatus)) {
                    sendJsonResponse(exchange, 400, Map.of("error", "Invalid state transition from " + currentStatus + " to " + newStatus));
                    return;
                }
            } else if ("OPEN".equalsIgnoreCase(newStatus)) {
                boolean isAuthorized = actingUser != null && ("ADMIN".equalsIgnoreCase(actingUser.getRole()) || actingUser.getId() == item.getReporterId());
                if (!isAuthorized) {
                    sendJsonResponse(exchange, 403, Map.of("error", "Only an ADMIN or the original reporter can verify and resolve claims"));
                    return;
                }
                if (!"PENDING_VERIFICATION".equalsIgnoreCase(currentStatus)) {
                    sendJsonResponse(exchange, 400, Map.of("error", "Invalid state transition from " + currentStatus + " to " + newStatus));
                    return;
                }
            } else {
                sendJsonResponse(exchange, 400, Map.of("error", "Invalid state transition from " + currentStatus + " to " + newStatus));
                return;
            }

            lostFoundDAO.updateClaimStatus(itemId, newStatus);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("itemId", itemId);
            response.put("previousStatus", currentStatus);
            response.put("claimStatus", newStatus);
            response.put("verifiedBy", actingUser != null ? actingUser.getName() : "System");

            sendJsonResponse(exchange, 200, response);
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
            if (pathStr.equals("/"))
                pathStr = "/index.html";

            // Resolve frontend path (check user.dir/frontend, then fallback to parent user.dir/../frontend)
            Path basePath = Paths.get(System.getProperty("user.dir"), "frontend").normalize();
            if (!Files.exists(basePath)) {
                Path altPath = Paths.get(System.getProperty("user.dir"), "..", "frontend").normalize();
                if (Files.exists(altPath)) {
                    basePath = altPath;
                }
            }
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
