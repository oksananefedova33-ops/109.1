<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$action = $_REQUEST['action'] ?? '';

switch($action) {
    case 'get_stats':
        getStats();
        break;
        
    default:
        echo json_encode(['ok' => false, 'error' => 'Unknown action']);
}

function getStats() {
    $domain = $_POST['domain'] ?? '';
    $dateFrom = $_POST['date_from'] ?? '';
    $dateTo = $_POST['date_to'] ?? '';
    
    if (!$domain) {
        echo json_encode(['ok' => false, 'error' => 'Domain not specified']);
        return;
    }
    
    // Запрашиваем статистику с удаленного домена
    $domain = rtrim($domain, '/');
    $apiUrl = $domain . '/analytics-api.php';
    
    $params = [
        'action' => 'get_stats',
        'date_from' => $dateFrom,
        'date_to' => $dateTo
    ];
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if ($data) {
            echo json_encode($data);
        } else {
            echo json_encode(['ok' => true, 'stats' => getEmptyStats()]);
        }
    } else {
        echo json_encode(['ok' => true, 'stats' => getEmptyStats()]);
    }
}

function getEmptyStats() {
    return [
        'unique_visitors' => 0,
        'pageviews' => 0,
        'downloads' => 0,
        'clicks' => 0,
        'countries' => [],
        'sources' => []
    ];
}