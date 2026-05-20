<?php

function createOpenSkyDepartureUrl(string $airport): string
{
    $timezone = new DateTimeZone("Europe/Zurich");

    $startDate = new DateTime("yesterday 07:30:00", $timezone);
    $endDate = new DateTime("yesterday 23:00:00", $timezone);

    $start = $startDate->getTimestamp();
    $end = $endDate->getTimestamp();

    return "https://opensky-network.org/api/flights/departure?" . http_build_query([
        "airport" => strtoupper($airport),
        "begin" => $start,
        "end" => $end,
    ]);
}

function fetchOpenSkyDepartures(string $airport, string $accessToken): array
{
    $url = createOpenSkyDepartureUrl($airport);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $accessToken"
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);

        return [
            "airport" => $airport,
            "error" => $error,
            "flights" => [],
        ];
    }

    curl_close($ch);

    $decoded = json_decode($response, true);

    return [
        "airport" => $airport,
        "httpCode" => $httpCode,
        "url" => $url,
        "flights" => is_array($decoded) ? $decoded : [],
    ];
}

$accessToken = require __DIR__ . '/token.php';

$result = [
    "LSZH" => fetchOpenSkyDepartures("LSZH", $accessToken),
    "LFSB" => fetchOpenSkyDepartures("LSGG", $accessToken),
];

header('Content-Type: application/json; charset=utf-8');
echo json_encode($result);