<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

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
$sql = "SELECT id FROM users WHERE username = ? OR email = ?";
$params = [$username, $email];
$stmt = sqlsrv_query($conn, $sql, $params);
if ($stmt === false) {
    echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด']);
    exit;
}
if (sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    echo json_encode(['success' => false, 'message' => 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว']);
    exit;
}
sqlsrv_free_stmt($stmt);

// hash password
$hash = password_hash($password, PASSWORD_DEFAULT);

// insert user
$sql = "INSERT INTO users (username, password, role, fullname, email, created_at)
        VALUES (?, ?, ?, ?, ?, GETDATE())";
$params = [$username, $hash, 'user', $fullname, $email];
$stmt = sqlsrv_query($conn, $sql, $params);
if ($stmt === false) {
    echo json_encode(['success' => false, 'message' => 'สมัครสมาชิกไม่สำเร็จ']);
    exit;
}
echo json_encode(['success' => true]);
sqlsrv_free_stmt($stmt);
sqlsrv_close($conn);
?>
