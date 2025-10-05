<?php
declare(strict_types=1);

// Получаем данные
$rawData = file_get_contents('php://input');
$data = null;

// Проверяем формат данных
if (isset($_POST['data'])) {
    $data = json_decode($_POST['data'], true);
} else {
    $data = json_decode($rawData, true);
}

if (!$data) {
    http_response_code(400);
    exit;
}

// Открываем базу данных
$dbPath = __DIR__ . '/analytics.db';
$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Создаем таблицы если их нет
$pdo->exec("CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    url TEXT,
    referrer TEXT,
    fingerprint TEXT,
    ip TEXT,
    country TEXT,
    user_agent TEXT,
    screen TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)");

$pdo->exec("CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)");
$pdo->exec("CREATE INDEX IF NOT EXISTS idx_events_fingerprint ON events(fingerprint)");
$pdo->exec("CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)");

// Получаем IP и страну
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] 
    ?? $_SERVER['HTTP_X_FORWARDED_FOR'] 
    ?? $_SERVER['REMOTE_ADDR'] 
    ?? 'unknown';

// Определяем страну по IP (простая версия)
$country = getCountryByIP($ip);

// Сохраняем событие
$stmt = $pdo->prepare("INSERT INTO events (type, url, referrer, fingerprint, ip, country, user_agent, screen, data) 
                       VALUES (:type, :url, :referrer, :fingerprint, :ip, :country, :ua, :screen, :data)");

$stmt->execute([
    ':type' => $data['type'] ?? 'unknown',
    ':url' => $data['url'] ?? '',
    ':referrer' => $data['referrer'] ?? '',
    ':fingerprint' => $data['fingerprint'] ?? '',
    ':ip' => $ip,
    ':country' => $country,
    ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ':screen' => $data['screen'] ?? '',
    ':data' => json_encode($data)
]);

http_response_code(204);

function getCountryByIP($ip) {
    // Простая проверка на локальные IP
    if (in_array($ip, ['127.0.0.1', '::1', 'unknown'])) {
        return 'Unknown';
    }
    
    // Можно использовать GeoIP сервис
    // Для простоты используем CloudFlare header если доступен
    if (isset($_SERVER['HTTP_CF_IPCOUNTRY'])) {
        return $_SERVER['HTTP_CF_IPCOUNTRY'];
    }
    
    // Или бесплатный API
    try {
        $response = @file_get_contents("http://ip-api.com/json/{$ip}?fields=country");
        if ($response) {
            $data = json_decode($response, true);
            return $data['country'] ?? 'Unknown';
        }
    } catch (Exception $e) {
        // Игнорируем ошибки
    }
    
    return 'Unknown';
}