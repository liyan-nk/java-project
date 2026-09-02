# CampusHub API Contract & Specification

This document details all canonical `/api/` REST endpoints for CampusHub, specifying request/response payloads, query parameters, headers, and HTTP status codes.

---

## Global Headers & Standards

- **Base URL**: `http://localhost:8080`
- **Content-Type**: `application/json`
- **CORS**: `Access-Control-Allow-Origin: *`
- **Preflight**: Options requests handled with `HTTP 204 No Content`.

---

## API Endpoint Matrix

| Method | Endpoint | Description | Query Params | Request Body | Response Body | HTTP Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/user` | Fetch current active user profile | `email` (optional) | None | `{ "id": 1, "name": "John Doe", "email": "john@campushub.com", "role": "STUDENT", "avatarUrl": "..." }` | `200 OK`, `404 Not Found` |
| `GET` | `/api/timetable` | Get timetable entries for user | `userId` (required) | None | `[ { "id": 1, "userId": 1, "dayOfWeek": "MONDAY", "subject": "CS101", "room": "Lab 3", "startTime": "09:00", "endTime": "10:30", "instructor": "Dr. Smith" } ]` | `200 OK`, `400 Bad Request` |
| `POST` | `/api/timetable` | Add a new timetable entry | None | `{ "userId": 1, "dayOfWeek": "MONDAY", "subject": "CS101", "room": "Lab 3", "startTime": "09:00", "endTime": "10:30", "instructor": "Dr. Smith" }` | `{ "id": 2, "status": "created" }` | `201 Created`, `400 Bad Request` |
| `GET` | `/api/attendance` | Fetch attendance records | `userId` (required) | None | `[ { "id": 1, "userId": 1, "subject": "CS101", "totalClasses": 20, "attendedClasses": 17, "targetPercentage": 75.0 } ]` | `200 OK`, `400 Bad Request` |
| `POST` | `/api/attendance/step` | Update/Step attendance record | None | `{ "id": 1, "attended": true }` | `{ "id": 1, "totalClasses": 21, "attendedClasses": 18, "percentage": 85.7 }` | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `GET` | `/api/marketplace` | Fetch all marketplace listings | `category` (optional) | None | `[ { "id": 1, "sellerId": 2, "sellerName": "Jane Doe", "title": "Calculus Textbook", "description": "8th Edition, Like New", "price": 25.50, "category": "BOOKS", "status": "AVAILABLE", "imageUrl": "/storage/marketplace/book.jpg", "createdAt": "2026-09-02T10:00:00" } ]` | `200 OK` |
| `POST` | `/api/marketplace` | Post a new marketplace item | None | `{ "sellerId": 1, "title": "Engineering Physics Notes", "description": "Handwritten semester notes", "price": 10.00, "category": "NOTES", "imageUrl": "/storage/marketplace/notes.jpg" }` | `{ "id": 3, "status": "created" }` | `201 Created`, `400 Bad Request` |
| `GET` | `/api/lostfound` | Fetch lost & found reports | `type` (`LOST` \| `FOUND`) | None | `[ { "id": 1, "reporterId": 3, "reporterName": "John", "type": "LOST", "title": "Blue Water Bottle", "description": "Hydroflask with stickers", "location": "Library 2nd Floor", "dateReported": "2026-09-01", "status": "OPEN", "imageUrl": "/storage/lostfound/bottle.jpg" } ]` | `200 OK` |
| `POST` | `/api/lostfound/claim` | Claim or resolve lost/found item | None | `{ "id": 1, "status": "CLAIMED" }` | `{ "id": 1, "status": "CLAIMED", "updated": true }` | `200 OK`, `404 Not Found` |

---

## Detailed Payload Schemas

### 1. User Object
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@campushub.com",
  "role": "STUDENT",
  "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  "createdAt": "2026-09-02T14:00:00Z"
}
```

### 2. Timetable Entry
```json
{
  "id": 1,
  "userId": 1,
  "dayOfWeek": "MONDAY",
  "subject": "Data Structures & Algorithms",
  "room": "Room 302",
  "startTime": "09:00",
  "endTime": "10:30",
  "instructor": "Dr. Alan Turing"
}
```

### 3. Attendance Record & Step Payload
- **Step Request Payload**:
```json
{
  "id": 1,
  "attended": true
}
```
- **Step Response Payload**:
```json
{
  "id": 1,
  "totalClasses": 21,
  "attendedClasses": 18,
  "percentage": 85.71
}
```

### 4. Marketplace Item Payload
```json
{
  "sellerId": 1,
  "title": "Scientific Calculator FX-991EX",
  "description": "Perfect condition, solar powered",
  "price": 18.50,
  "category": "ELECTRONICS",
  "imageUrl": "/storage/marketplace/calc.jpg"
}
```

### 5. Lost & Found Claim Payload
```json
{
  "id": 1,
  "status": "CLAIMED"
}
```
