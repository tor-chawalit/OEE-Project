<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
if (!$conn) {
    echo json_encode(['success' => false, 'message' => 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';
$fullname = trim($input['fullname'] ?? '');
$email = trim($input['email'] ?? '');

if (!$username || !$password || !$fullname || !$email) {
    echo json_encode(['success' => false, 'message' => 'กรุณากรอกข้อมูลให้ครบถ้วน']);
    exit;
}

// ตรวจสอบซ้ำ username หรือ email

$sql = "SELECT UserID FROM Users WHERE Username = ?";
$params = [$username];
$stmt = sqlsrv_query($conn, $sql, $params);

if ($stmt === false) {
    error_log(print_r(sqlsrv_errors(), true));
    echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการตรวจสอบชื่อผู้ใช้']);
    exit;
}

if (sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    echo json_encode(['success' => false, 'message' => 'ชื่อผู้ใช้นี้ถูกใช้แล้ว']);
    exit;
}
sqlsrv_free_stmt($stmt);


// hash password
$hash = password_hash($password, PASSWORD_DEFAULT);

// insert user
$sql = "INSERT INTO Users (Username, PasswordHash, Role, FullName) VALUES (?, ?, ?, ?)";
$params = [$username, $hash, 'user', $fullname];
$stmt = sqlsrv_query($conn, $sql, $params);

if ($stmt === false) {
    // Log the error for debugging
    error_log(print_r(sqlsrv_errors(), true));
    echo json_encode(['success' => false, 'message' => 'สมัครสมาชิกไม่สำเร็จ เกิดข้อผิดพลาดบางอย่าง']);
    exit;
}
echo json_encode(['success' => true]);
sqlsrv_free_stmt($stmt);
sqlsrv_close($conn);
?>
