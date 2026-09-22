<?php
// ============================================================
// Study Pack - Instant Order Email Alert Handler
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
    echo json_encode(["success" => false, "message" => "No data received"]);
    exit;
}

$data = json_decode($rawInput, true);
if (!$data || empty($data['id'])) {
    echo json_encode(["success" => false, "message" => "Invalid order data"]);
    exit;
}

$orderId     = htmlspecialchars($data['id'] ?? 'N/A');
$customer    = htmlspecialchars($data['customer'] ?? 'Customer');
$phone       = htmlspecialchars($data['phone'] ?? 'N/A');
$email       = htmlspecialchars($data['email'] ?? 'N/A');
$address     = htmlspecialchars($data['address'] ?? 'N/A');
$city        = htmlspecialchars($data['city'] ?? 'N/A');
$province    = htmlspecialchars($data['province'] ?? 'N/A');
$notes       = htmlspecialchars($data['notes'] ?? 'None');
$payTitle    = htmlspecialchars($data['paymentMethodTitle'] ?? 'Cash on Delivery');
$subtotal    = number_format(floatval($data['subtotal'] ?? 0));
$total       = number_format(floatval($data['total'] ?? 0));
$dateStr     = date('d M Y, h:i A');

// Build Items Table
$itemsHtml = '';
if (!empty($data['items']) && is_array($data['items'])) {
    foreach ($data['items'] as $item) {
        $title = htmlspecialchars($item['title'] ?? 'Item');
        $qty   = intval($item['qty'] ?? 1);
        $price = number_format(floatval($item['price'] ?? 0));
        $itemTotal = number_format(floatval(($item['price'] ?? 0) * $qty));
        $itemsHtml .= "
        <tr>
            <td style='padding: 10px; border-bottom: 1px solid #E2E8F0; color: #1E293B; font-size: 14px;'><strong>{$title}</strong></td>
            <td style='padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 14px;'>{$qty}</td>
            <td style='padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #1E293B; font-size: 14px;'>Rs {$price}</td>
            <td style='padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #1565C0; font-weight: bold; font-size: 14px;'>Rs {$itemTotal}</td>
        </tr>";
    }
}

// Full HTML Email Template
$emailBody = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>New Order Alert</title>
</head>
<body style='margin: 0; padding: 20px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;'>
    <div style='max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;'>
        <!-- Header -->
        <div style='background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%); padding: 24px 28px; text-align: center;'>
            <h1 style='color: #ffffff; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;'>Study Pack Store</h1>
            <p style='color: #FDE047; margin: 0; font-size: 15px; font-weight: 700;'>🎉 Naya Order Mosool Hua Hai!</p>
        </div>

        <div style='padding: 24px 28px;'>
            <!-- Order ID Banner -->
            <div style='background: #EFF6FF; border-left: 4px solid #2563EB; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;'>
                <div style='font-size: 13px; color: #475569;'>Order Number:</div>
                <div style='font-size: 20px; font-weight: 800; color: #1E3A8A;'>#{$orderId}</div>
                <div style='font-size: 12px; color: #64748B; margin-top: 4px;'>Date: {$dateStr} | Payment: <strong>{$payTitle}</strong></div>
            </div>

            <!-- Customer Details -->
            <h3 style='margin: 0 0 10px 0; font-size: 16px; color: #0F172A; border-bottom: 2px solid #F1F5F9; padding-bottom: 6px;'>Customer Info</h3>
            <table style='width: 100%; margin-bottom: 20px; font-size: 14px;'>
                <tr><td style='color: #64748B; padding: 4px 0; width: 110px;'>Name:</td><td style='color: #0F172A; font-weight: 600;'>{$customer}</td></tr>
                <tr><td style='color: #64748B; padding: 4px 0;'>Phone:</td><td style='color: #0F172A; font-weight: 600;'><a href='tel:{$phone}' style='color: #2563EB; text-decoration: none;'>{$phone}</a></td></tr>
                <tr><td style='color: #64748B; padding: 4px 0;'>Email:</td><td style='color: #0F172A;'>{$email}</td></tr>
                <tr><td style='color: #64748B; padding: 4px 0;'>Address:</td><td style='color: #0F172A;'>{$address}, {$city}, {$province}</td></tr>
                <tr><td style='color: #64748B; padding: 4px 0;'>Notes:</td><td style='color: #D97706;'>{$notes}</td></tr>
            </table>

            <!-- Order Items -->
            <h3 style='margin: 0 0 10px 0; font-size: 16px; color: #0F172A; border-bottom: 2px solid #F1F5F9; padding-bottom: 6px;'>Ordered Items</h3>
            <table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>
                <thead>
                    <tr style='background: #F8FAFC;'>
                        <th style='padding: 8px 10px; text-align: left; color: #475569; font-size: 12px;'>Product</th>
                        <th style='padding: 8px 10px; text-align: center; color: #475569; font-size: 12px;'>Qty</th>
                        <th style='padding: 8px 10px; text-align: right; color: #475569; font-size: 12px;'>Price</th>
                        <th style='padding: 8px 10px; text-align: right; color: #475569; font-size: 12px;'>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {$itemsHtml}
                </tbody>
            </table>

            <!-- Total -->
            <div style='background: #F8FAFC; padding: 14px 18px; border-radius: 8px; border: 1px solid #E2E8F0;'>
                <div style='display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #64748B;'>
                    <span>Subtotal:</span><span>Rs {$subtotal}</span>
                </div>
                <div style='display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #64748B;'>
                    <span>Delivery Charges:</span><span style='color: #16A34A; font-weight: 600;'>Weight ke mutabiq</span>
                </div>
                <div style='display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #0F172A; border-top: 1px dashed #CBD5E1; padding-top: 8px; margin-top: 4px;'>
                    <span>Bill Amount:</span><span style='color: #2563EB;'>Rs {$total}</span>
                </div>
            </div>

            <!-- WhatsApp Direct Link -->
            <div style='margin-top: 24px; text-align: center;'>
                <a href='https://wa.me/92" . preg_replace('/[^0-9]/', '', substr($phone, 1)) . "' style='background: #25D366; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;'>
                    💬 Customer ko WhatsApp par Message Karein
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style='background: #F1F5F9; padding: 14px; text-align: center; font-size: 12px; color: #64748B;'>
            Study Pack - Taleemi Hub • Automated Order Alert System
        </div>
    </div>
</body>
</html>";

// Email Setup
$recipients = "info@taleemihub.com, taleemihub2020@gmail.com";
$subject    = "📦 Naya Order! #{$orderId} - Rs {$total} ({$customer})";

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: Study Pack Store <noreply@taleemihub.com>\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = @mail($recipients, $subject, $emailBody, $headers);

echo json_encode([
    "success" => $sent,
    "message" => $sent ? "Order alert email sent successfully to info@taleemihub.com" : "Mail transfer queued"
]);
