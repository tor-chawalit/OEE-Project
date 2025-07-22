<?php
$serverName = "localhost";
$connectionOptions = array(
    "Database" => "ProductionDB",
    "Uid" => "",
    "PWD" => "",
    "CharacterSet" => "UTF-8",
    "TrustServerCertificate" => true,
    "ReturnDatesAsStrings" => false // เปลี่ยนเป็น false เพื่อได้ DateTime objects
);

$conn = sqlsrv_connect($serverName, $connectionOptions);

if (!$conn) {
    // Log connection errors for debugging
    error_log("Database connection failed: " . print_r(sqlsrv_errors(), true));
    // ไม่ echo หรือ die เพื่อให้ login.php จัดการ error เอง
}
?>
