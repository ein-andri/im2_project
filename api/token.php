<?php

// -> load credentials
$config = require __DIR__ . '/config.php';
$clientId = $config['client_id'];
$clientSecret = $config['client_secret'];
if (!$clientId || !$clientSecret) {
    die('Missing credentials');
}

// -> load token
$authUrl = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
$ch = curl_init($authUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/x-www-form-urlencoded"
    ],
    CURLOPT_POSTFIELDS => http_build_query([
        'grant_type' => 'client_credentials',
        'client_id' => $clientId,
        'client_secret' => $clientSecret
    ]),
]);
$response = curl_exec($ch);
if ($response === false) {
    curl_close($ch);
    die('Token request failed');
}
curl_close($ch);
$data = json_decode($response, true);
if (!isset($data['access_token'])) {
    die('No token received');
}

// -> return token
return $data['access_token'];