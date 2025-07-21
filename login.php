<?php
// login.php
header('Content-Type: application/json; charset=utf-8');
session_start();

// ตรวจสอบ action=check
if (isset($_GET['action']) && $_GET['action'] === 'check') {
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        echo json_encode(["loggedIn" => true]);
    } else {
        echo json_encode(["loggedIn" => false]);
    }
    exit;
}

require_once 'db.php';
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => htmlspecialchars('เชื่อมต่อฐานข้อมูลล้มเหลว')]);
    exit;
}
$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';
if (!$username || !$password) {
    echo json_encode(['success' => false, 'message' => htmlspecialchars('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')]);
    exit;
}
$sql = "SELECT id, username, password, role FROM users WHERE username = ?";
$params = array($username);
$stmt = sqlsrv_query($conn, $sql, $params);
if ($stmt === false) {
    echo json_encode(['success' => false, 'message' => htmlspecialchars('เกิดข้อผิดพลาดในการค้นหาผู้ใช้')]);
    exit;
}
$user = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
if ($user && password_verify($password, $user['password'])) {
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    echo json_encode(['success' => true, 'message' => htmlspecialchars('เข้าสู่ระบบสำเร็จ')]);
} else {
    echo json_encode(['success' => false, 'message' => htmlspecialchars('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')]);
}
sqlsrv_free_stmt($stmt);
sqlsrv_close($conn);
