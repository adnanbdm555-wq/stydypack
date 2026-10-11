<?php
// ============================================================
// Study Pack - API to fetch all orders for Admin Dashboard
// ============================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$ordersFile = __DIR__ . '/orders_data.json';
if (file_exists($ordersFile)) {
    $content = file_get_contents($ordersFile);
    if (!empty($content)) {
        echo $content;
        exit;
    }
}

// Fallback to empty array
echo json_encode([]);
