# API Reference

SquareKeeper exposes a RESTful API for contest and square management.

## Base URL

Development: `http://localhost:5000/api`
Production: `https://your-domain.com/api`

## Authentication

Admin endpoints require authentication via Replit Auth. The session is managed via HTTP-only cookies.

### Public Endpoints
- `GET /api/contests` - List all contests
- `GET /api/contests/:identifier` - Get contest by ID or slug
- `GET /api/contests/:id/squares` - Get squares for a contest
- `GET /api/my-contests/:email` - Get contests for a participant
- `PATCH /api/contests/:contestId/squares/:index` - Claim a square
- `POST /api/contests/:id/squares/random` - Claim random square
- `GET /api/folders` - List all folders

### Admin Endpoints
- `POST /api/contests` - Create contest
- `PATCH /api/contests/:id` - Update contest
- `DELETE /api/contests/:id` - Delete contest
- `POST /api/contests/:id/clone` - Clone contest
- `GET /api/contests/:id/export-csv` - Export to CSV
- `POST /api/contests/:id/test-webhook` - Test webhook
- `POST /api/folders` - Create folder
- `DELETE /api/folders/:id` - Delete folder

---

## Contests

### List All Contests

```http
GET /api/contests
```

Returns all contests with square counts.

**Response:**
```json
[
  {
    "id": "abc123",
    "name": "Super Bowl 2025",
    "slug": "superbowl-2025",
    "eventDate": "2025-02-09T00:00:00.000Z",
    "topTeam": "AFC Champion",
    "leftTeam": "NFC Champion",
    "status": "open",
    "takenSquares": 45,
    "totalSquares": 100,
    ...
  }
]
```

### Get Single Contest

```http
GET /api/contests/:identifier
```

Fetch by ID or slug.

**Parameters:**
- `identifier` - Contest ID (UUID) or slug (string)

**Response:**
```json
{
  "id": "abc123",
  "name": "Super Bowl 2025",
  "slug": "superbowl-2025",
  "eventDate": "2025-02-09T00:00:00.000Z",
  "topTeam": "AFC Champion",
  "leftTeam": "NFC Champion",
  "topAxisNumbers": [[0,1,2,3,4,5,6,7,8,9], ...],
  "leftAxisNumbers": [[0,1,2,3,4,5,6,7,8,9], ...],
  "layerLabels": ["Q1", "Q2", "Q3", "Q4"],
  "layerColors": ["#fda4af", "#93c5fd", "#fcd34d", "#6ee7b7"],
  "showRedHeaders": false,
  "prizes": [{"label": "Q1", "amount": "$100"}, ...],
  "winners": [{"label": "Q1", "squareNumber": 42}],
  "status": "open"
}
```

### Create Contest (Admin)

```http
POST /api/contests
```

**Request Body:**
```json
{
  "name": "Super Bowl 2025",
  "slug": "superbowl-2025",
  "eventDate": "2025-02-09",
  "topTeam": "AFC Champion",
  "leftTeam": "NFC Champion",
  "topAxisNumbers": [[0,1,2,3,4,5,6,7,8,9], ...],
  "leftAxisNumbers": [[0,1,2,3,4,5,6,7,8,9], ...],
  "layerLabels": ["Q1", "Q2", "Q3", "Q4"],
  "redRowsCount": 4,
  "availableSquares": [1, 2, 3, ...],
  "reservedSquares": [
    {
      "squareNumber": 1,
      "entryName": "VIP Entry",
      "holderName": "John Doe",
      "holderEmail": "john@example.com"
    }
  ],
  "prizes": [{"label": "Q1", "amount": "$100"}],
  "webhookUrl": "https://n8n.example.com/webhook/xxx"
}
```

**Response:** `201 Created` with contest object

### Update Contest (Admin)

```http
PATCH /api/contests/:id
```

Partial update - only include fields to change.

**Request Body:**
```json
{
  "name": "Updated Name",
  "showRedHeaders": true,
  "winners": [{"label": "Q1", "squareNumber": 42}]
}
```

**Response:** `200 OK` with updated contest

### Delete Contest (Admin)

```http
DELETE /api/contests/:id
```

**Response:** `204 No Content`

### Clone Contest (Admin)

```http
POST /api/contests/:id/clone
```

**Request Body:**
```json
{
  "name": "Super Bowl 2025 (Copy)",
  "eventDate": "2025-02-09"
}
```

**Response:** `201 Created` with new contest object

### Export CSV

```http
GET /api/contests/:id/export-csv
```

**Response:** CSV file download
```csv
Square Number,Row,Column,Status,Entry Name,Holder Name,Holder Email
1,0,0,taken,"Lucky 7","John Doe","john@example.com"
2,0,1,available,"","",""
...
```

### Test Webhook

```http
POST /api/contests/:id/test-webhook
```

Sends a test payload to the configured webhook URL.

**Response:**
```json
{
  "success": true,
  "message": "Test webhook sent successfully",
  "payload": { ... }
}
```

---

## Squares

### Get Contest Squares

```http
GET /api/contests/:id/squares
```

**Response:**
```json
[
  {
    "id": "square-id",
    "contestId": "contest-id",
    "index": 1,
    "row": 0,
    "col": 0,
    "status": "available",
    "entryName": null,
    "holderName": null,
    "holderEmail": null
  },
  ...
]
```

### Claim Square

```http
PATCH /api/contests/:contestId/squares/:index
```

**Parameters:**
- `contestId` - Contest UUID
- `index` - Square number (1-100)

**Request Body:**
```json
{
  "status": "taken",
  "entryName": "Lucky 7",
  "holderName": "John Doe",
  "holderEmail": "john@example.com"
}
```

**Response:** Updated square object

### Claim Random Square

```http
POST /api/contests/:id/squares/random
```

**Request Body:**
```json
{
  "entryName": "Random Pick",
  "holderName": "Jane Smith",
  "holderEmail": "jane@example.com"
}
```

**Response:**
```json
{
  "squareNumber": 42,
  "entryName": "Random Pick"
}
```

---

## My Contests

### Get Participant's Contests

```http
GET /api/my-contests/:email
```

Returns all contests where the email has claimed squares.

**Response:**
```json
[
  {
    "contestId": "abc123",
    "contestName": "Super Bowl 2025",
    "eventDate": "2025-02-09T00:00:00.000Z",
    "topTeam": "AFC Champion",
    "leftTeam": "NFC Champion",
    "squareNumber": 42,
    "entryName": "Lucky 7"
  }
]
```

---

## Folders

### List Folders

```http
GET /api/folders
```

**Response:**
```json
[
  {
    "id": "folder-id",
    "name": "2024 Season",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Create Folder (Admin)

```http
POST /api/folders
```

**Request Body:**
```json
{
  "name": "2025 Season"
}
```

**Response:** `201 Created` with folder object

### Delete Folder (Admin)

```http
DELETE /api/folders/:id
```

**Response:** `204 No Content`

---

## Authentication

### Get Current User

```http
GET /api/auth/user
```

Requires authentication.

**Response:**
```json
{
  "id": "user-id",
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "isAdmin": true
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": [...] // Optional, for validation errors
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden (not admin) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Webhook Payload

When webhooks are configured, this payload is sent on square claims:

```json
{
  "event": "square_claimed",
  "timestamp": "2024-11-28T12:00:00.000Z",
  "data": {
    "contestName": "Super Bowl 2025",
    "contestId": "abc123",
    "entryName": "Lucky 7",
    "holderEmail": "john@example.com",
    "holderName": "John Doe",
    "squareNumber": 42,
    "topTeam": "AFC Champion",
    "leftTeam": "NFC Champion",
    "eventDate": "2025-02-09T00:00:00.000Z"
  }
}
```
