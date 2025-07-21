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
    // ดึงงานเดี่ยวด้วย MachineID หรือ id
    if ($action === 'get' && (isset($_GET['MachineID']) || isset($_GET['id']))) {
        $machineId = isset($_GET['MachineID']) ? intval($_GET['MachineID']) : intval($_GET['id']);
        $sql = "SELECT * FROM Machines WHERE MachineID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$machineId]);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if ($row) {
            if (isset($row['StartTime']) && $row['StartTime'] instanceof DateTime) $row['StartTime'] = $row['StartTime']->format('Y-m-d H:i:s');
            if (isset($row['EndTime']) && $row['EndTime'] instanceof DateTime) $row['EndTime'] = $row['EndTime']->format('Y-m-d H:i:s');
            echo json_encode($row);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'ไม่พบข้อมูลงาน']);
        }
        exit;
    }
    $action = $_GET['action'];
    if ($action === 'get_tasks') {
        $sql = "SELECT * FROM Machines WHERE status != 'completed' ORDER BY StartTime ASC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $tasks = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            if (isset($row['StartTime']) && $row['StartTime'] instanceof DateTime) $row['StartTime'] = $row['StartTime']->format('Y-m-d H:i:s');
            if (isset($row['EndTime']) && $row['EndTime'] instanceof DateTime) $row['EndTime'] = $row['EndTime']->format('Y-m-d H:i:s');
            $tasks[] = $row;
        }
        echo json_encode($tasks);
        exit;
    }
    if ($action === 'get_history') {
        $sql = "SELECT * FROM Machines WHERE status = 'completed' ORDER BY EndTime DESC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $history = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            if (isset($row['StartTime']) && $row['StartTime'] instanceof DateTime) $row['StartTime'] = $row['StartTime']->format('Y-m-d H:i:s');
            if (isset($row['EndTime']) && $row['EndTime'] instanceof DateTime) $row['EndTime'] = $row['EndTime']->format('Y-m-d H:i:s');
            // Ensure status field is always present
            if (!isset($row['status'])) $row['status'] = 'completed';
            $history[] = $row;
        }
        echo json_encode($history);
        exit;
    }
    if ($action === 'add') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "INSERT INTO Machines (
        JobTitle, Department, MachineType, LotNumber, LotSize, DurationInHours, StartTime, EndTime, 
        ProducedQuantity, Details, status, ActualStartTime, ActualEndTime, GoodProduct, Downtime )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $params = [
            $data['JobTitle'] ?? '',
            $data['Department'] ?? '',
            $data['MachineType'] ?? '',
            $data['LotNumber'] ?? '',
            (int)($data['LotSize'] ?? 0),
            (float)($data['DurationInHours'] ?? 0),
            $data['StartTime'] ?? '',
            $data['EndTime'] ?? '',
            isset($data['ProducedQuantity']) ? (int)$data['ProducedQuantity'] : null,
            $data['Details'] ?? '',
            $data['status'] ?? 'planning',
            $data['ActualStartTime'] ?? null,
            $data['ActualEndTime'] ?? null,
            isset($data['GoodProduct']) ? (int)$data['GoodProduct'] : null,
            isset($data['Downtime']) ? (int)$data['Downtime'] : null
        ];
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        echo json_encode(['success' => true]);
        exit;
    }
    if ($action === 'update') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            error_log('DEBUG: update $data is not array: ' . var_export($data, true));
            $data = [];
        }
        $machineId = isset($data['MachineID']) ? intval($data['MachineID']) : intval($data['id'] ?? 0);
        // Only update fields that are present in the request
        $fields = [];
        $params = [];
        $updatable = [
            'JobTitle', 'Department', 'MachineType', 'LotNumber', 'LotSize', 'DurationInHours',
            'StartTime', 'EndTime', 'ProducedQuantity', 'Details', 'status',
            'ActualStartTime', 'ActualEndTime', 'GoodProduct', 'Downtime'
        ];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field=?";
                if ($field === 'LotSize' || $field === 'ProducedQuantity' || $field === 'GoodProduct' || $field === 'Downtime') {
                    $params[] = ($data[$field] === '' || $data[$field] === null) ? null : (int)$data[$field];
                } else if ($field === 'DurationInHours') {
                    $params[] = ($data[$field] === '' || $data[$field] === null) ? null : (float)$data[$field];
                } else if ($field === 'ActualStartTime' || $field === 'ActualEndTime') {
                    // Convert 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DDTHH:MM:SS' to 'YYYY-MM-DD HH:MM:SS'
                    $val = $data[$field];
                    if (is_string($val) && strpos($val, 'T') !== false) {
                        $val = str_replace('T', ' ', $val);
                        // If seconds are missing, add ':00'
                        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $val)) {
                            $val .= ':00';
                        }
                    }
                    $params[] = $val;
                } else {
                    $params[] = $data[$field];
                }
            }
        }
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }
        $sql = "UPDATE Machines SET ".implode(", ", $fields)." WHERE MachineID=?";
        $params[] = $machineId;
        error_log('DEBUG: update SQL: ' . $sql);
        error_log('DEBUG: update params: ' . var_export($params, true));
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            error_log('DEBUG: update sqlsrv_errors: ' . var_export(sqlsrv_errors(), true));
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        echo json_encode(['success' => true]);
        exit;
    }
    if ($action === 'delete') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "DELETE FROM Machines WHERE MachineID=?";
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
