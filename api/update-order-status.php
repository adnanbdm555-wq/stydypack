<?php
// ============================================================
// Study Pack - API to update order status or details
// ============================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rawInput = file_get_contents('php://input');
if (!$rawInput) {
    echo json_encode(["success" => false, "message" => "No data"]);
    exit;
}

$data = json_decode($rawInput, true);
if (!$data || empty($data['id'])) {
    echo json_encode(["success" => false, "message" => "Order ID required"]);
    exit;
}

$ordersFile = __DIR__ . '/orders_data.json';
$existingOrders = [];
if (file_exists($ordersFile)) {
    $existingOrders = json_decode(file_get_contents($ordersFile), true) ?: [];
}

$updated = false;
foreach ($existingOrders as &$ex) {
    if (strval($ex['id']) === strval($data['id'])) {
        $ex = array_merge($ex, $data);
        $updated = true;
        break;
    }
}

$backupFile = __DIR__ . '/orders_backup.json';
if ($updated) {
    $jsonData = json_encode($existingOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    @file_put_contents($ordersFile, $jsonData, LOCK_EX);
    @file_put_contents($backupFile, $jsonData, LOCK_EX);
    echo json_encode(["success" => true, "message" => "Order updated successfully"]);
} else {
    // If not found, add it
    array_unshift($existingOrders, $data);
    $jsonData = json_encode($existingOrders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    @file_put_contents($ordersFile, $jsonData, LOCK_EX);
    @file_put_contents($backupFile, $jsonData, LOCK_EX);
    echo json_encode(["success" => true, "message" => "Order created successfully"]);
}
