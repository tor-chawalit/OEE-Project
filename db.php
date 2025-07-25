<?php
$serverName = "203.154.130.236";
$connectionOptions = array(
    "Database" => "ProductionDB",
    "Uid" => "sa",
    "PWD" => "Journal@25",
    "CharacterSet" => "UTF-8"
);

$conn = sqlsrv_connect($serverName, $connectionOptions);

if (!$conn) {
    // ไม่ echo หรือ die ตรงนี้ เพราะจะทำลาย JSON response
    // ให้ tasks.php จัดการ error เอง
    $conn = false;
}
?>
