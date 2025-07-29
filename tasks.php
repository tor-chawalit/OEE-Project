<?php
// ===== ป้องกัน output HTML หรือ error ที่ไม่ใช่ JSON =====
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 0); // ไม่แสดง error บนหน้าเว็บ
ini_set('log_errors', 1);
// ini_set('error_log', __DIR__ . '/php-error.log');

include 'db.php';

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
if ($conn === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed', 'details' => sqlsrv_errors()]);
    exit;
}

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
        $sql = "SELECT j.*, m.MachineName, d.DepartmentName, l.ConfirmedAt FROM Jobs j
                JOIN Machines m ON j.MachineID = m.MachineID
                JOIN Departments d ON m.DepartmentID = d.DepartmentID
                LEFT JOIN JobProductionLogs l ON l.JobID = j.JobID
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
            if (isset($row['ConfirmedAt']) && $row['ConfirmedAt'] && is_object($row['ConfirmedAt'])) {
                $row['ConfirmedAt'] = $row['ConfirmedAt']->format('Y-m-d\TH:i:s');
            }
            
            // ถ้ามี MachineIDs ให้แสดงรายการเครื่องจักรทั้งหมด
            if (!empty($row['MachineIDs']) && $row['MachineIDs'] != $row['MachineID']) {
                $machineIds = explode(',', $row['MachineIDs']);
                $machineNames = [];
                foreach ($machineIds as $machineId) {
                    $machineId = trim($machineId);
                    if (!empty($machineId)) {
                        // ดึงชื่อเครื่องจักรแต่ละตัว
                        $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                        $machineStmt = sqlsrv_query($conn, $machineSql, [intval($machineId)]);
                        if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                            $machineNames[] = $machineRow['MachineName'];
                        }
                    }
                }
                if (!empty($machineNames)) {
                    $row['MachineName'] = implode(', ', $machineNames);
                }
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
        
        $fields = ['JobName', 'LotNumber', 'PlannedLotSize', 'ActualOutput', 'MachineID', 'MachineIDs', 'DepartmentID', 'Status', 'Details', 'StartTime', 'EndTime', 'CreatedByUserID'];
        $params = [
            $data['JobName'] ?? '',
            $data['LotNumber'] ?? '',
            (int)($data['PlannedLotSize'] ?? 0),
            (int)($data['ActualOutput'] ?? 0),
            (int)($data['MachineID'] ?? 0),
            $data['MachineIDs'] ?? '',
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
        
        // รายการฟิลด์ที่สามารถอัปเดตได้ (เพิ่ม MachineIDs)
$updatable = ['JobName', 'LotNumber', 'PlannedLotSize', 'ActualOutput', 'MachineID', 'MachineIDs', 'Status', 'StartTime', 'EndTime', 'Details', 'DepartmentID'];
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
    
    // ดึงข้อมูลงานเฉพาะสำหรับหน้า confirm-complete
    if ($action === 'get_task_detail' && isset($_GET['id'])) {
        $jobId = intval($_GET['id']);
        $sql = "SELECT j.*, 
                       ISNULL(m.MachineName, 'ไม่ระบุ') as MachineName, 
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName 
                FROM Jobs j
                LEFT JOIN Machines m ON j.MachineID = m.MachineID
                LEFT JOIN Departments d ON m.DepartmentID = d.DepartmentID
                WHERE j.JobID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$jobId]);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed', 'details' => sqlsrv_errors()]);
            exit;
        }
        
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Job not found']);
            exit;
        }
        
        // แปลง datetime fields
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
        
        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }
    
    // บันทึกข้อมูล OEE และยืนยันจบงาน
    if ($action === 'confirm_complete') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['JobID'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid input data']);
            exit;
        }
        
        $jobId = intval($data['JobID']);
        
        // ตรวจสอบว่างานมีอยู่
        $checkSql = "SELECT JobID, Status FROM Jobs WHERE JobID = ?";
        $checkStmt = sqlsrv_query($conn, $checkSql, [$jobId]);
        if ($checkStmt === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed', 'details' => sqlsrv_errors()]);
            exit;
        }
        
        $job = sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC);
        if (!$job) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Job not found']);
            exit;
        }
        
        // ปิดการตรวจสอบสถานะ completed ชั่วคราว สำหรับการทดสอบ
        /*
        if ($job['Status'] !== 'completed') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Job must be completed before confirmation']);
            exit;
        }
        */
        
        // ตรวจสอบว่ามีการบันทึก OEE ไปแล้วหรือไม่
        $checkOEESql = "SELECT LogID FROM JobProductionLogs WHERE JobID = ?";
        $checkOEEStmt = sqlsrv_query($conn, $checkOEESql, [$jobId]);
        if ($checkOEEStmt === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database OEE query failed', 'details' => sqlsrv_errors()]);
            exit;
        }
        
        $existingLog = sqlsrv_fetch_array($checkOEEStmt, SQLSRV_FETCH_ASSOC);
        
        // เตรียมข้อมูลสำหรับบันทึก (ตรงกับโครงสร้างฐานข้อมูลจริง) - กะ 8 ชั่วโมง (08:00-18:00)
        $actualStartTime = $data['ActualStartTime'] ?? null;
        $actualEndTime = $data['ActualEndTime'] ?? null;
        $shiftHours = floatval($data['ShiftHours'] ?? 8.0);  // 8 ชั่วโมง (08:00-18:00)
        $overtimeMinutes = intval($data['OvertimeMinutes'] ?? 0);
        
        // แปลงเวลาพักจากนาทีเป็น boolean (มีพักหรือไม่)
        $tookBreakMorning = intval($data['TookBreakMorning'] ?? 0) > 0 ? 1 : 0;
        $tookBreakLunch = intval($data['TookBreakLunch'] ?? 0) > 0 ? 1 : 0;
        $tookBreakEvening = intval($data['TookBreakEvening'] ?? 0) > 0 ? 1 : 0;
        
        $idealRunRateUsed = floatval($data['IdealRunRateUsed'] ?? 0);
        $totalPieces = intval($data['TotalPieces'] ?? 0);
        $rejectPieces = intval($data['RejectPieces'] ?? 0);
        $totalDowntimeMinutes = intval($data['TotalDowntimeMinutes'] ?? 0);
        $plannedProductionMinutes = intval($data['PlannedProductionMinutes'] ?? 0);
        $runTimeMinutes = intval($data['RunTimeMinutes'] ?? 0);
        // ตอนนี้สามารถส่งค่าไปยัง GoodPieces และ OEE_Total ได้แล้ว (หลังแก้ไข computed columns)
        $goodPieces = intval($data['GoodPieces'] ?? 0);
        $availability = floatval($data['OEE_Availability'] ?? 0);
        $performance = floatval($data['OEE_Performance'] ?? 0);
        $quality = floatval($data['OEE_Quality'] ?? 0);
        $oeeTotal = floatval($data['OEE_Total'] ?? 0);
        $confirmedByUserID = intval($data['ConfirmedByUserID'] ?? 0);
        
        try {
            // เริ่ม transaction
            if (sqlsrv_begin_transaction($conn) === false) {
                throw new Exception('Failed to begin transaction');
            }
            
            if ($existingLog) {
                // อัปเดตข้อมูล OEE ที่มีอยู่ (รวม GoodPieces และ OEE_Total)
                $updateSql = "UPDATE JobProductionLogs SET
                    ActualStartTime = ?, ActualEndTime = ?, ShiftHours = ?, OvertimeMinutes = ?,
                    TookBreakMorning = ?, TookBreakLunch = ?, TookBreakEvening = ?, IdealRunRateUsed = ?,
                    TotalPieces = ?, RejectPieces = ?, TotalDowntimeMinutes = ?, PlannedProductionMinutes = ?,
                    RunTimeMinutes = ?, GoodPieces = ?, OEE_Availability = ?, OEE_Performance = ?,
                    OEE_Quality = ?, OEE_Total = ?, ConfirmedByUserID = ?
                    WHERE JobID = ?";
                
                $updateParams = [
                    $actualStartTime, $actualEndTime, $shiftHours, $overtimeMinutes,
                    $tookBreakMorning, $tookBreakLunch, $tookBreakEvening, $idealRunRateUsed,
                    $totalPieces, $rejectPieces, $totalDowntimeMinutes, $plannedProductionMinutes,
                    $runTimeMinutes, $goodPieces, $availability, $performance,
                    $quality, $oeeTotal, $confirmedByUserID, $jobId
                ];
                
                $updateStmt = sqlsrv_query($conn, $updateSql, $updateParams);
                if ($updateStmt === false) {
                    throw new Exception('Failed to update production log: ' . print_r(sqlsrv_errors(), true));
                }
            } else {
                // สร้างข้อมูล OEE ใหม่ (รวม GoodPieces และ OEE_Total)
                $insertSql = "INSERT INTO JobProductionLogs (
                    JobID, ActualStartTime, ActualEndTime, ShiftHours, OvertimeMinutes,
                    TookBreakMorning, TookBreakLunch, TookBreakEvening, IdealRunRateUsed,
                    TotalPieces, RejectPieces, TotalDowntimeMinutes, PlannedProductionMinutes,
                    RunTimeMinutes, GoodPieces, OEE_Availability, OEE_Performance,
                    OEE_Quality, OEE_Total, ConfirmedByUserID, ConfirmedAt
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE()
                )";
                
                $insertParams = [
                    $jobId, $actualStartTime, $actualEndTime, $shiftHours, $overtimeMinutes,
                    $tookBreakMorning, $tookBreakLunch, $tookBreakEvening, $idealRunRateUsed,
                    $totalPieces, $rejectPieces, $totalDowntimeMinutes, $plannedProductionMinutes,
                    $runTimeMinutes, $goodPieces, $availability, $performance,
                    $quality, $oeeTotal, $confirmedByUserID
                ];
                
                $insertStmt = sqlsrv_query($conn, $insertSql, $insertParams);
                if ($insertStmt === false) {
                    throw new Exception('Failed to insert production log: ' . print_r(sqlsrv_errors(), true));
                }
            }
            
            // อัปเดตสถานะงานเป็น 'complete' และอัปเดต ActualOutput
            $updateJobSql = "UPDATE Jobs SET Status = 'completed', ActualOutput = ? WHERE JobID = ?";
            $updateJobStmt = sqlsrv_query($conn, $updateJobSql, [$totalPieces, $jobId]);
            if ($updateJobStmt === false) {
                throw new Exception('Failed to update job status: ' . print_r(sqlsrv_errors(), true));
            }
            
            // Commit transaction
            if (sqlsrv_commit($conn) === false) {   
                throw new Exception('Failed to commit transaction: ' . print_r(sqlsrv_errors(), true));
            }
            
            echo json_encode(['success' => true, 'message' => 'OEE data saved successfully']);
            
        } catch (Exception $e) {
            // Rollback transaction
            sqlsrv_rollback($conn);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        
        exit;
    }
    
    // ไม่รู้จัก action
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
    exit;
}
// ===== END REST API =====
?>
