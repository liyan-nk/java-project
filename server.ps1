# CampusHub Integrated Local Development Server
# Serves both the static frontend PWA and full REST API on http://localhost:8080/

param (
    [int]$Port = 8080
)

$frontendPath = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Error "Frontend directory not found at $frontendPath"
    exit 1
}

# In-memory Seed State matching WebServer.java and schema.sql
$userState = @{
    id = 2
    name = "John Doe"
    email = "john@campushub.com"
    role = "STUDENT"
    avatarUrl = "https://api.dicebear.com/7.x/avataaars/svg?seed=John"
}

$timetableState = [System.Collections.ArrayList]@(
    [ordered]@{ id = 1; userId = 2; dayOfWeek = "MONDAY"; subject = "Data Structures & Algorithms"; room = "Room 301"; startTime = "09:00"; endTime = "10:30"; instructor = "Dr. Alan Turing" },
    [ordered]@{ id = 2; userId = 2; dayOfWeek = "MONDAY"; subject = "Database Systems"; room = "Lab 2"; startTime = "11:00"; endTime = "12:30"; instructor = "Prof. Edgar Codd" },
    [ordered]@{ id = 3; userId = 2; dayOfWeek = "TUESDAY"; subject = "Computer Networks"; room = "Room 204"; startTime = "14:00"; endTime = "15:30"; instructor = "Dr. Vint Cerf" },
    [ordered]@{ id = 4; userId = 2; dayOfWeek = "WEDNESDAY"; subject = "Operating Systems"; room = "Hall B"; startTime = "10:00"; endTime = "11:30"; instructor = "Dr. Linus Torvalds" },
    [ordered]@{ id = 5; userId = 2; dayOfWeek = "THURSDAY"; subject = "Web Engineering"; room = "Lab 4"; startTime = "13:00"; endTime = "14:30"; instructor = "Dr. Tim Berners-Lee" }
)

$attendanceState = [System.Collections.ArrayList]@(
    [ordered]@{ id = 1; userId = 2; subject = "Data Structures & Algorithms"; totalClasses = 24; attendedClasses = 21; targetPercentage = 75.0 },
    [ordered]@{ id = 2; userId = 2; subject = "Database Systems"; totalClasses = 20; attendedClasses = 18; targetPercentage = 80.0 },
    [ordered]@{ id = 3; userId = 2; subject = "Computer Networks"; totalClasses = 18; attendedClasses = 12; targetPercentage = 75.0 },
    [ordered]@{ id = 4; userId = 2; subject = "Operating Systems"; totalClasses = 22; attendedClasses = 19; targetPercentage = 75.0 }
)

$marketplaceState = [System.Collections.ArrayList]@(
    [ordered]@{ id = 1; sellerId = 2; sellerName = "John Doe"; title = "Calculus 4th Edition (Stewart)"; description = "Clean copy, minimal highlighting, required for MATH 201."; price = 35.00; category = "TEXTBOOKS"; status = "AVAILABLE"; imageUrl = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400" },
    [ordered]@{ id = 2; sellerId = 1; sellerName = "Campus Store"; title = "TI-84 Plus CE Graphing Calculator"; description = "Great battery life, includes charging cable."; price = 65.00; category = "TECH"; status = "AVAILABLE"; imageUrl = "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=400" },
    [ordered]@{ id = 3; sellerId = 3; sellerName = "Sarah Jenkins"; title = "LED Desk Lamp with USB Charging"; description = "Adjustable warmth and brightness, perfect for study."; price = 15.00; category = "DORM"; status = "AVAILABLE"; imageUrl = "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400" }
)

$lostfoundState = [System.Collections.ArrayList]@(
    [ordered]@{ id = 1; reporterId = 2; reporterName = "John Doe"; type = "LOST"; title = "Blue Hydroflask Bottle"; description = "Navy blue 32oz bottle with stickers"; location = "Student Union Lounge"; dateReported = "2026-09-01"; status = "OPEN"; imageUrl = "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400" },
    [ordered]@{ id = 2; reporterId = 1; reporterName = "Campus Security"; type = "FOUND"; title = "AirPods Pro Case (White)"; description = "Found on 2nd floor library study desk near window"; location = "Library 2nd Floor"; dateReported = "2026-09-02"; status = "OPEN"; imageUrl = "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400" },
    [ordered]@{ id = 3; reporterId = 4; reporterName = "Alex Rivera"; type = "LOST"; title = "Black North Face Backpack"; description = "Contains notebooks and engineering textbooks"; location = "Engineering Quad Bench"; dateReported = "2026-09-03"; status = "OPEN"; imageUrl = "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400" }
)

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Could not bind to $prefix. Trying 127.0.0.1..."
    $listener = New-Object System.Net.HttpListener
    $prefix = "http://127.0.0.1:$Port/"
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "=========================================================="
Write-Host "  CampusHub Server is LIVE at: $prefix"
Write-Host "  PWA URL: $prefix"
Write-Host "  Serving Static Assets & REST APIs"
Write-Host "=========================================================="

function Send-Json([System.Net.HttpListenerResponse]$response, [int]$statusCode, $obj) {
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $response.ContentType = "application/json; charset=utf-8"
    $response.StatusCode = $statusCode

    $json = $obj | ConvertTo-Json -Depth 10 -Compress
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
}

function Read-JsonBody([System.Net.HttpListenerRequest]$request) {
    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
    $body = $reader.ReadToEnd()
    $reader.Close()
    if ([string]::IsNullOrWhiteSpace($body)) { return @{} }
    return $body | ConvertFrom-Json
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.AbsolutePath
        $method = $request.HttpMethod

        # CORS preflight
        if ($method -eq "OPTIONS") {
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            $response.StatusCode = 204
            $response.OutputStream.Close()
            continue
        }

        # ------------------- REST API ROUTER -------------------
        if ($path.StartsWith("/api/")) {
            if ($path -eq "/api/user" -and $method -eq "GET") {
                Send-Json $response 200 $userState
                continue
            }

            if ($path -eq "/api/timetable") {
                if ($method -eq "GET") {
                    Send-Json $response 200 $timetableState
                    continue
                } elseif ($method -eq "POST") {
                    $body = Read-JsonBody $request
                    $newId = [int](Get-Date -UFormat %s)
                    $newEntry = [ordered]@{
                        id = $newId
                        userId = if ($body.userId) { [int]$body.userId } else { 2 }
                        dayOfWeek = [string]$body.dayOfWeek
                        subject = [string]$body.subject
                        room = [string]$body.room
                        startTime = [string]$body.startTime
                        endTime = [string]$body.endTime
                        instructor = [string]$body.instructor
                    }
                    [void]$timetableState.Add($newEntry)
                    Send-Json $response 201 @{ id = $newId; status = "CREATED" }
                    continue
                }
            }

            if ($path -eq "/api/attendance") {
                if ($method -eq "GET") {
                    Send-Json $response 200 $attendanceState
                    continue
                }
            }

            if ($path -eq "/api/attendance/step" -and $method -eq "POST") {
                $body = Read-JsonBody $request
                $id = [int]$body.id
                $attended = [bool]$body.attended
                $found = $null

                foreach ($rec in $attendanceState) {
                    if ($rec.id -eq $id) {
                        $rec.totalClasses += 1
                        if ($attended) { $rec.attendedClasses += 1 }
                        $found = $rec
                        break
                    }
                }

                if ($found) {
                    Send-Json $response 200 $found
                } else {
                    Send-Json $response 404 @{ error = "Attendance record not found" }
                }
                continue
            }

            if ($path -eq "/api/marketplace") {
                if ($method -eq "GET") {
                    $category = $request.QueryString["category"]
                    if ($category -and $category -ne "ALL") {
                        $filtered = $marketplaceState | Where-Object { $_.category -eq $category }
                        Send-Json $response 200 @($filtered)
                    } else {
                        Send-Json $response 200 $marketplaceState
                    }
                    continue
                } elseif ($method -eq "POST") {
                    $body = Read-JsonBody $request
                    $newId = [int](Get-Date -UFormat %s)
                    $newItem = [ordered]@{
                        id = $newId
                        sellerId = if ($body.sellerId) { [int]$body.sellerId } else { 2 }
                        sellerName = "John Doe"
                        title = [string]$body.title
                        description = [string]$body.description
                        price = [double]$body.price
                        category = if ($body.category) { [string]$body.category } else { "GENERAL" }
                        status = "AVAILABLE"
                        imageUrl = if ($body.imageUrl) { [string]$body.imageUrl } else { "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400" }
                        createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                    }
                    [void]$marketplaceState.Insert(0, $newItem)
                    Send-Json $response 201 @{ id = $newId; status = "CREATED" }
                    continue
                }
            }

            if ($path -eq "/api/lostfound") {
                if ($method -eq "GET") {
                    $type = $request.QueryString["type"]
                    if ($type -and $type -ne "ALL") {
                        $filtered = $lostfoundState | Where-Object { $_.type -eq $type }
                        Send-Json $response 200 @($filtered)
                    } else {
                        Send-Json $response 200 $lostfoundState
                    }
                    continue
                }
            }

            if ($path -eq "/api/lostfound/claim" -and $method -eq "POST") {
                $body = Read-JsonBody $request
                $id = [int]$body.id
                $status = if ($body.status) { [string]$body.status } else { "CLAIMED" }
                $found = $null

                foreach ($item in $lostfoundState) {
                    if ($item.id -eq $id) {
                        $item.status = $status
                        $found = $item
                        break
                    }
                }

                if ($found) {
                    Send-Json $response 200 $found
                } else {
                    Send-Json $response 404 @{ error = "Lost/Found item not found" }
                }
                continue
            }

            Send-Json $response 404 @{ error = "Endpoint not found" }
            continue
        }

        # ------------------- STATIC FILE ROUTER -------------------
        $relPath = $path.TrimStart('/')
        if ([string]::IsNullOrEmpty($relPath) -or $relPath -eq "/") {
            $relPath = "index.html"
        }

        $filePath = Join-Path $frontendPath $relPath

        # SPA Fallback
        if (-not (Test-Path $filePath) -or (Test-Path $filePath -PathType Container)) {
            $filePath = Join-Path $frontendPath "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.ContentType = $contentType
            $response.StatusCode = 200

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            $response.OutputStream.Close()
        }
    } catch {
        # Catch unexpected errors to keep loop alive
        Write-Host "Request error: $_"
    }
}
