<?php
// -> get token
$accessToken = require __DIR__ . '/token.php';

// -> load from api
$url = "https://opensky-network.org/api/flights/departure?airport=EDDF&begin=1517227200&end=1517230800";
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer $accessToken"
    ]
]);
$response = curl_exec($ch);
if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => curl_error($ch)]);
    curl_close($ch);
    exit;
}
curl_close($ch);
header('Content-Type: application/json; charset=utf-8');
echo $response;