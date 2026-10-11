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

// 1. Primary file: api/orders_data.json
$ordersFile = __DIR__ . '/orders_data.json';
if (file_exists($ordersFile)) {
    $content = @file_get_contents($ordersFile);
    if (!empty($content) && strlen($content) > 10) {
        echo $content;
        exit;
    }
}

// 2. Secondary backup: api/orders_backup.json
$backupFile = __DIR__ . '/orders_backup.json';
if (file_exists($backupFile)) {
    $content = @file_get_contents($backupFile);
    if (!empty($content) && strlen($content) > 10) {
        echo $content;
        exit;
    }
}

// 3. Fallback: dashboard/js/wc_orders_backup.json
$staticFile = __DIR__ . '/../dashboard/js/wc_orders_backup.json';
if (file_exists($staticFile)) {
    $content = @file_get_contents($staticFile);
    if (!empty($content) && strlen($content) > 10) {
        echo $content;
        exit;
    }
}

echo json_encode([]);
