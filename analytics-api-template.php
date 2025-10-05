<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$action = $_REQUEST['action'] ?? '';

switch($action) {
    case 'get_stats':
        getStats();
        break;
        
    default:
        echo json_encode(['ok' => false, 'error' => 'Unknown action']);
}

function getStats() {
    $dateFrom = $_POST['date_from'] ?? '';
    $dateTo = $_POST['date_to'] ?? '';
    
    $dbPath = __DIR__ . '/analytics.db';
    
    if (!file_exists($dbPath)) {
        echo json_encode([
            'ok' => true,
            'stats' => getEmptyStats()
        ]);
        return;
    }
    
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Формируем WHERE условие для дат
    $whereDate = '';
    $params = [];
    
    if ($dateFrom && $dateTo) {
        $whereDate = "AND DATE(created_at) BETWEEN :date_from AND :date_to";
        $params[':date_from'] = $dateFrom;
        $params[':date_to'] = $dateTo;
    }
    
    // Уникальные посетители
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT fingerprint) as count 
                           FROM events 
                           WHERE type = 'pageview' $whereDate");
    $stmt->execute($params);
    $uniqueVisitors = $stmt->fetchColumn();
    
    // Просмотры страниц
    $stmt = $pdo->prepare("SELECT COUNT(*) as count 
                           FROM events 
                           WHERE type = 'pageview' $whereDate");
    $stmt->execute($params);
    $pageviews = $stmt->fetchColumn();
    
    // Скачивания
    $stmt = $pdo->prepare("SELECT COUNT(*) as count 
                           FROM events 
                           WHERE type = 'download' $whereDate");
    $stmt->execute($params);
    $downloads = $stmt->fetchColumn();
    
    // Клики
    $stmt = $pdo->prepare("SELECT COUNT(*) as count 
                           FROM events 
                           WHERE type = 'click' $whereDate");
    $stmt->execute($params);
    $clicks = $stmt->fetchColumn();
    
    // Топ стран
    $stmt = $pdo->prepare("SELECT country, COUNT(*) as count 
                           FROM events 
                           WHERE type = 'pageview' AND country != 'Unknown' $whereDate
                           GROUP BY country 
                           ORDER BY count DESC 
                           LIMIT 10");
    $stmt->execute($params);
    $countries = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Топ источники (referrer)
    $stmt = $pdo->prepare("SELECT 
                            CASE 
                                WHEN referrer = '' THEN 'Direct'
                                WHEN referrer LIKE '%google%' THEN 'Google'
                                WHEN referrer LIKE '%yandex%' THEN 'Yandex'
                                WHEN referrer LIKE '%bing%' THEN 'Bing'
                                WHEN referrer LIKE '%facebook%' THEN 'Facebook'
                                WHEN referrer LIKE '%twitter%' THEN 'Twitter'
                                WHEN referrer LIKE '%instagram%' THEN 'Instagram'
                                WHEN referrer LIKE '%vk.com%' THEN 'VK'
                                ELSE 'Other'
                            END as source,
                            COUNT(*) as count 
                           FROM events 
                           WHERE type = 'pageview' $whereDate
                           GROUP BY source 
                           ORDER BY count DESC 
                           LIMIT 10");
    $stmt->execute($params);
    $sources = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'ok' => true,
        'stats' => [
            'unique_visitors' => (int)$uniqueVisitors,
            'pageviews' => (int)$pageviews,
            'downloads' => (int)$downloads,
            'clicks' => (int)$clicks,
            'countries' => $countries,
            'sources' => $sources
        ]
    ]);
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