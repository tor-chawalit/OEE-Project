<?php
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== ทดสอบการเชื่อมต่อฐานข้อมูล ===\n";

include 'db.php';

if (!$conn) {
    echo "❌ เชื่อมต่อฐานข้อมูลไม่สำเร็จ:\n";
    print_r(sqlsrv_errors());
    exit;
}

echo "✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n\n";

// ทดสอบการดึงข้อมูลจากตาราง Jobs
echo "=== ทดสอบการดึงข้อมูลจากตาราง Jobs ===\n";

$sql = "SELECT TOP 5 j.*, m.MachineName, d.DepartmentName FROM Jobs j
        JOIN Machines m ON j.MachineID = m.MachineID
        JOIN Departments d ON m.DepartmentID = d.DepartmentID
        ORDER BY j.CreatedAt DESC";

$stmt = sqlsrv_query($conn, $sql);

if ($stmt === false) {
    echo "❌ Query ไม่สำเร็จ:\n";
    print_r(sqlsrv_errors());
    exit;
}

echo "✅ Query สำเร็จ\n";

$tasks = [];
$count = 0;
while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    $count++;
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

echo "📊 พบข้อมูล $count รายการ\n\n";

if ($count > 0) {
    echo "=== ตัวอย่างข้อมูล ===\n";
    echo json_encode($tasks[0], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    echo "\n\n";
}

// ทดสอบการตรวจสอบคอลัมน์ StartTime และ EndTime
echo "=== ทดสอบการตรวจสอบคอลัมน์ ===\n";

$checkColumns = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Jobs' AND COLUMN_NAME IN ('StartTime', 'EndTime')";
$checkStmt = sqlsrv_query($conn, $checkColumns);
$hasDateTime = false;
if ($checkStmt) {
    $columnCount = 0;
    while ($row = sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC)) {
        echo "✅ พบคอลัมน์: " . $row['COLUMN_NAME'] . "\n";
        $columnCount++;
    }
    $hasDateTime = ($columnCount >= 2);
    echo "📋 จำนวนคอลัมน์ datetime: $columnCount\n";
    echo "🔧 HasDateTime: " . ($hasDateTime ? 'true' : 'false') . "\n";
} else {
    echo "❌ ตรวจสอบคอลัมน์ไม่สำเร็จ:\n";
    print_r(sqlsrv_errors());
}

echo "\n=== ทดสอบเสร็จสิ้น ===\n";
?>
