<?php

function createOpenSkyDepartureUrl()
{
    // Use Zurich time for LSZH
    $timezone = new DateTimeZone("Europe/Zurich");

    // Day before at 07:30
    $startDate = new DateTime("yesterday 07:30:00", $timezone);

    // Day before at 23:00
    $endDate = new DateTime("yesterday 23:00:00", $timezone);

    // Unix timestamps in seconds
    $start = $startDate->getTimestamp();
    $end = $endDate->getTimestamp();

    return "https://opensky-network.org/api/flights/departure?airport=LSZH&begin={$start}&end={$end}";
}

// -> get token
$accessToken = require __DIR__ . '/token.php';

// -> load from api
$ch = curl_init(createOpenSkyDepartureUrl());
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