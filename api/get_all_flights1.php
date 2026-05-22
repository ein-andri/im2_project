<?php

function createOpenSkyDepartureUrl(): string
{
    $timezone = new DateTimeZone("Europe/Zurich");

    $startDate = new DateTime("yesterday 07:30:00", $timezone);
    $endDate = new DateTime("yesterday 23:00:00", $timezone);

    $start = $startDate->getTimestamp();
    $end = $endDate->getTimestamp();

    return "https://opensky-network.org/api/flights/departure?" . http_build_query([
        "airport" => "LSZH",
        "begin" => $start,
        "end" => $end,
    ]);
}

header('Content-Type: application/json; charset=utf-8');

$accessToken = require __DIR__ . '/token.php';

$ch = curl_init(createOpenSkyDepartureUrl());

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . trim($accessToken),
        "Accept: application/json",
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);

    http_response_code(500);
    echo json_encode([
        "error" => "Curl failed",
        "details" => $error,
        "flights" => [],
    ]);
    exit;
}

curl_close($ch);

$decoded = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(502);
    echo json_encode([
        "error" => "OpenSky did not return valid JSON",
        "httpCode" => $httpCode,
        "rawResponse" => $response,
        "flights" => [],
    ]);
    exit;
}

echo json_encode([
    "airport" => "LSZH",
    "httpCode" => $httpCode,
    "flights" => $decoded,
]);
exit;