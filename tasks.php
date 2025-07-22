<?php
// ===== ป้องกัน output HTML หรือ error ที่ไม่ใช่ JSON =====
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0); // ไม่แสดง error บนหน้าเว็บ
ini_set('log_errors', 1);
// ini_set('error_log', __DIR__ . '/php-error.log');

include 'db.php';

// ===== REST API (JSON) =====
if (isset($_GET['action'])) {
    $action = $_GET['action'];
    // ดึงงานเดี่ยวด้วย JobID
    if ($action === 'get' && isset($_GET['JobID'])) {
        $jobId = intval($_GET['JobID']);
        $sql = "SELECT j.*, m.MachineName, d.DepartmentName FROM Jobs j
                JOIN Machines m ON j.MachineID = m.MachineID
                JOIN Departments d ON m.DepartmentID = d.DepartmentID
                WHERE j.JobID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$jobId]);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if ($row) {
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['StartTime']) && $row['StartTime'] && is_object($row['StartTime'])) {
                $row['StartTime'] = $row['StartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['EndTime']) && $row['EndTime'] && is_object($row['EndTime'])) {
                $row['EndTime'] = $row['EndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
            }
        }
        echo $row ? json_encode($row) : json_encode(['error' => 'ไม่พบข้อมูลงาน']);
        exit;
    }
    // ดึงงานทั้งหมด (รวมทั้งที่เสร็จแล้ว)
    if ($action === 'get_tasks') {
        $sql = "SELECT j.*, m.MachineName, d.DepartmentName FROM Jobs j
                JOIN Machines m ON j.MachineID = m.MachineID
                JOIN Departments d ON m.DepartmentID = d.DepartmentID
                ORDER BY j.CreatedAt ASC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $tasks = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['StartTime']) && $row['StartTime'] && is_object($row['StartTime'])) {
                $row['StartTime'] = $row['StartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['EndTime']) && $row['EndTime'] && is_object($row['EndTime'])) {
                $row['EndTime'] = $row['EndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
            }
            $tasks[] = $row;
        }
        echo json_encode($tasks);
        exit;
    }
    // ดึงงานที่เสร็จแล้ว (ประวัติ)
    if ($action === 'get_history') {
        $sql = "SELECT j.*, m.MachineName, d.DepartmentName, l.OEE_Availability, l.OEE_Performance, l.OEE_Quality, l.OEE_Total
                FROM Jobs j
                JOIN Machines m ON j.MachineID = m.MachineID
                JOIN Departments d ON m.DepartmentID = d.DepartmentID
                LEFT JOIN JobProductionLogs l ON l.JobID = j.JobID
                WHERE j.Status = 'completed' ORDER BY j.CreatedAt DESC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $history = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['StartTime']) && $row['StartTime'] && is_object($row['StartTime'])) {
                $row['StartTime'] = $row['StartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['EndTime']) && $row['EndTime'] && is_object($row['EndTime'])) {
                $row['EndTime'] = $row['EndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
            }
            $history[] = $row;
        }
        echo json_encode($history);
        exit;
    }
    // เพิ่มงานใหม่
    if ($action === 'add') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // สร้าง SQL statement พร้อมข้อมูลทุกคอลัมน์
        $fields = ['JobName', 'LotNumber', 'PlannedLotSize', 'MachineID', 'DepartmentID', 'Status', 'Details', 'StartTime', 'EndTime', 'CreatedByUserID'];
        $params = [
            $data['JobName'] ?? '',
            $data['LotNumber'] ?? '',
            (int)($data['PlannedLotSize'] ?? 0),
            (int)($data['MachineID'] ?? 0),
            (int)($data['DepartmentID'] ?? 0),
            $data['Status'] ?? 'planning',
            $data['Details'] ?? '',
            $data['StartTime'] ?? null,
            $data['EndTime'] ?? null,
            (int)($data['CreatedByUserID'] ?? 0)
        ];
        
        $placeholders = str_repeat('?,', count($fields) - 1) . '?';
        $sql = "INSERT INTO Jobs (" . implode(', ', $fields) . ") VALUES ($placeholders)";
        
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        
        // ดึง JobID ที่เพิ่งสร้างขึ้น
        $newJobId = null;
        $lastIdSql = "SELECT SCOPE_IDENTITY() as LastID";
        $lastIdStmt = sqlsrv_query($conn, $lastIdSql);
        if ($lastIdStmt) {
            $lastIdRow = sqlsrv_fetch_array($lastIdStmt, SQLSRV_FETCH_ASSOC);
            if ($lastIdRow) {
                $newJobId = intval($lastIdRow['LastID']);
            }
        }
        
        echo json_encode(['success' => true, 'jobId' => $newJobId]);
        exit;
    }
    // อัปเดตงาน
    if ($action === 'update') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            error_log('DEBUG: update $data is not array: ' . var_export($data, true));
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            exit;
        }
        
        $jobId = isset($data['JobID']) ? intval($data['JobID']) : intval($data['id'] ?? 0);
        if ($jobId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JobID']);
            exit;
        }
        
        $fields = [];
        $params = [];
        
        // รายการฟิลด์ที่สามารถอัปเดตได้
        $updatable = ['JobName', 'LotNumber', 'PlannedLotSize', 'MachineID', 'Status', 'StartTime', 'EndTime', 'Details', 'DepartmentID'];
            
        foreach ($updatable as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field=?";
                $params[] = $data[$field];
            }
        }
        
        // เพิ่ม debug logging
        error_log('DEBUG: Update JobID=' . $jobId);
        error_log('DEBUG: Update fields: ' . print_r($fields, true));
        error_log('DEBUG: Update params: ' . print_r($params, true));
        
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }
        
        $sql = "UPDATE Jobs SET ".implode(", ", $fields)." WHERE JobID=?";
        $params[] = $jobId;
        
        // เพิ่ม debug SQL
        error_log('DEBUG: Update SQL: ' . $sql);
        
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            $errors = sqlsrv_errors();
            error_log('DEBUG: Update SQL Error: ' . print_r($errors, true));
            http_response_code(500);
            echo json_encode(['error' => 'Update failed', 'details' => $errors]);
            exit;
        }
        
        // ตรวจสอบว่ามีการอัปเดตจริงหรือไม่
        $rowsAffected = sqlsrv_rows_affected($stmt);
        if ($rowsAffected === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get affected rows']);
            exit;
        }
        
        if ($rowsAffected === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Job not found or no changes made']);
            exit;
        }
        
        echo json_encode(['success' => true, 'rowsAffected' => $rowsAffected]);
        exit;
    }
    // ลบงาน
    if ($action === 'delete') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "DELETE FROM Jobs WHERE JobID=?";
        $params = [ $data['id'] ?? 0 ];
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        echo json_encode(['success' => true]);
        exit;
    }
    // ไม่รู้จัก action
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
    exit;
}
// ===== END REST API =====
?>
