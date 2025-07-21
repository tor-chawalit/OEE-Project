<?php
$serverName = "localhost";
$connectionOptions = array(
    "Database" => "ProductionDB",
    "Uid" => "",
    "PWD" => "",
    "CharacterSet" => "UTF-8"
);

$conn = sqlsrv_connect($serverName, $connectionOptions);

if (!$conn) {
    // ไม่ echo หรือ die เพื่อให้ login.php จัดการ error เอง
    // สามารถเช็ค $conn == false ใน login.php ได้เลย
}
?>
