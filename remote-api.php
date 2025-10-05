<?php
// Remote Management API for exported site
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$action = $_REQUEST["action"] ?? "";

switch($action) {
    case "ping":
        echo json_encode(["ok" => true, "version" => "1.0"]);
        break;
        
    case "list_files":
        $files = [];
        foreach(glob("*.html") as $htmlFile) {
            $content = file_get_contents($htmlFile);
            
            // Ищем кнопки-файлы (класс filebtn) - ВАЖНО: порядок атрибутов может меняться!
            // Паттерн 1: href перед download
            preg_match_all('/<div[^>]+class="[^"]*filebtn[^"]*"[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*download="([^"]*)"[^>]*>/is', $content, $matches1);
            
            for($i = 0; $i < count($matches1[0]); $i++) {
                $url = $matches1[1][$i];
                $fileName = $matches1[2][$i] ?: basename($url);
                
                if ($url !== "#") {
                    $files[] = [
                        "name" => $fileName,
                        "url" => $url,
                        "type" => "filebtn"
                    ];
                }
            }
            
            // Паттерн 2: download перед href
            preg_match_all('/<div[^>]+class="[^"]*filebtn[^"]*"[^>]*>.*?<a[^>]+download="([^"]*)"[^>]*href="([^"]+)"[^>]*>/is', $content, $matches2);
            
            for($i = 0; $i < count($matches2[0]); $i++) {
                $url = $matches2[2][$i];
                $fileName = $matches2[1][$i] ?: basename($url);
                
                if ($url !== "#") {
                    $files[] = [
                        "name" => $fileName,
                        "url" => $url,
                        "type" => "filebtn"
                    ];
                }
            }
            
            // Паттерн 3: Простые ссылки с download
            preg_match_all('/<a[^>]+download="([^"]+)"[^>]*href="([^"]+)"/i', $content, $matches3);
            
            for($i = 0; $i < count($matches3[0]); $i++) {
                $files[] = [
                    "name" => $matches3[1][$i],
                    "url" => $matches3[2][$i],
                    "type" => "simple"
                ];
            }
        }
        
        // Удаляем дубликаты по URL
        $unique = [];
        foreach($files as $file) {
            $key = $file["url"];
            if (!isset($unique[$key])) {
                $unique[$key] = $file;
            }
        }
        
        echo json_encode(["ok" => true, "items" => array_values($unique)]);
        break;
        
    case "list_links":
        $links = [];
        foreach(glob("*.html") as $htmlFile) {
            $content = file_get_contents($htmlFile);
            
            // Ищем кнопки-ссылки
            preg_match_all('/<div[^>]+class="[^"]*linkbtn[^"]*"[^>]*>.*?<a[^>]+href="([^"]+)"/is', $content, $matches);
            
            foreach($matches[1] as $url) {
                if ($url !== "#") {
                    $links[] = ["url" => $url];
                }
            }
        }
        
        // Удаляем дубликаты
        $unique = [];
        foreach($links as $link) {
            $key = $link["url"];
            if (!isset($unique[$key])) {
                $unique[$key] = $link;
            }
        }
        
        echo json_encode(["ok" => true, "items" => array_values($unique)]);
        break;
        
    case "replace_file":
        $oldUrl = $_POST["old_url"] ?? "";
        $fileName = $_POST["file_name"] ?? "";
        $fileContent = $_POST["file_content"] ?? "";
        
        if (!$oldUrl || !$fileName || !$fileContent) {
            echo json_encode(["ok" => false, "error" => "Missing parameters"]);
            break;
        }
        
        // Сохраняем новый файл
        $uploadDir = "assets/uploads/";
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }
        
        $newFileName = basename($fileName);
        $newPath = $uploadDir . $newFileName;
        
        // Декодируем и сохраняем файл
        $decodedContent = base64_decode($fileContent);
        if ($decodedContent === false) {
            echo json_encode(["ok" => false, "error" => "Failed to decode file content"]);
            break;
        }
        
        file_put_contents($newPath, $decodedContent);
        
        if (!file_exists($newPath)) {
            echo json_encode(["ok" => false, "error" => "Failed to save file"]);
            break;
        }
        
        // СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ ЗАМЕНЫ ФАЙЛОВ
        $replaced = 0;
        $totalFiles = 0;
        $debugInfo = [];
        
        // Экранируем специальные символы для регулярных выражений
        $oldUrlEscaped = preg_quote($oldUrl, '/');
        $oldFileName = basename($oldUrl);
        $oldFileNameEscaped = preg_quote($oldFileName, '/');
        
        foreach(glob("*.html") as $htmlFile) {
            $totalFiles++;
            $content = file_get_contents($htmlFile);
            $originalContent = $content;
            $localReplacements = 0;
            
            // МЕТОД 1: Замена в кнопках-файлах (filebtn) - ищем весь блок и заменяем href и download
            $pattern = '/<div[^>]+class="[^"]*filebtn[^"]*"[^>]*>(.*?)<\/div>/is';
            $content = preg_replace_callback($pattern, function($matches) use ($oldUrl, $newPath, $newFileName, &$localReplacements) {
                $block = $matches[0];
                $innerHtml = $matches[1];
                
                // Проверяем, содержит ли этот блок наш старый URL
                if (strpos($innerHtml, $oldUrl) !== false || strpos($innerHtml, basename($oldUrl)) !== false) {
                    // Заменяем href
                    $innerHtml = preg_replace('/href="[^"]*"/', 'href="' . $newPath . '"', $innerHtml);
                    // Заменяем download
                    $innerHtml = preg_replace('/download="[^"]*"/', 'download="' . $newFileName . '"', $innerHtml);
                    $localReplacements++;
                    return str_replace($matches[1], $innerHtml, $block);
                }
                return $block;
            }, $content);
            
            // МЕТОД 2: Прямая замена старого URL на новый во всем документе
            if (strpos($content, $oldUrl) !== false) {
                $content = str_replace($oldUrl, $newPath, $content);
                $localReplacements++;
            }
            
            // МЕТОД 3: Замена по имени файла в href (если путь отличается)
            $content = preg_replace(
                '/href="[^"]*' . $oldFileNameEscaped . '"/i',
                'href="' . $newPath . '"',
                $content
            );
            
            // МЕТОД 4: Замена в download атрибутах
            $content = preg_replace(
                '/download="[^"]*' . $oldFileNameEscaped . '"/i',
                'download="' . $newFileName . '"',
                $content
            );
            
            // МЕТОД 5: Супер агрессивная замена - ищем любое упоминание файла и заменяем весь атрибут
            // Для href
            $content = preg_replace(
                '/(href=")([^"]*)' . $oldFileNameEscaped . '([^"]*")/i',
                '$1' . $newPath . '$3',
                $content
            );
            
            // Сохраняем файл если были изменения
            if ($content !== $originalContent) {
                file_put_contents($htmlFile, $content);
                $replaced++;
                $debugInfo[] = [
                    "file" => $htmlFile,
                    "replacements" => $localReplacements,
                    "old_found" => strpos($originalContent, $oldUrl) !== false,
                    "old_filename_found" => strpos($originalContent, $oldFileName) !== false
                ];
            } else {
                // Даже если не заменили, проверяем наличие старого URL для отладки
                $debugInfo[] = [
                    "file" => $htmlFile,
                    "replacements" => 0,
                    "old_found" => strpos($originalContent, $oldUrl) !== false,
                    "old_filename_found" => strpos($originalContent, $oldFileName) !== false,
                    "filebtn_found" => strpos($originalContent, "filebtn") !== false
                ];
            }
        }
        
        // Если первый проход не дал результатов, пробуем еще более агрессивный подход
        if ($replaced === 0 && $totalFiles > 0) {
            foreach(glob("*.html") as $htmlFile) {
                $content = file_get_contents($htmlFile);
                $originalContent = $content;
                
                // Находим ВСЕ href атрибуты и проверяем каждый
                $content = preg_replace_callback(
                    '/href="([^"]+)"/i',
                    function($matches) use ($oldFileName, $newPath) {
                        $currentHref = $matches[1];
                        // Если текущий href содержит имя старого файла - заменяем весь href
                        if (strpos($currentHref, $oldFileName) !== false) {
                            return 'href="' . $newPath . '"';
                        }
                        return $matches[0];
                    },
                    $content
                );
                
                // То же самое для download атрибутов
                $content = preg_replace_callback(
                    '/download="([^"]+)"/i',
                    function($matches) use ($oldFileName, $newFileName) {
                        $currentDownload = $matches[1];
                        if (strpos($currentDownload, $oldFileName) !== false) {
                            return 'download="' . $newFileName . '"';
                        }
                        return $matches[0];
                    },
                    $content
                );
                
                if ($content !== $originalContent) {
                    file_put_contents($htmlFile, $content);
                    $replaced++;
                }
            }
        }
        
        echo json_encode([
            "ok" => true,
            "replaced" => $replaced,
            "new_path" => $newPath,
            "total_files" => $totalFiles,
            "debug" => [
                "old_url" => $oldUrl,
                "old_filename" => $oldFileName,
                "new_file" => $newFileName,
                "new_path" => $newPath,
                "file_saved" => file_exists($newPath),
                "file_size" => file_exists($newPath) ? filesize($newPath) : 0,
                "details" => $debugInfo
            ]
        ]);
        break;
        
    case "replace_link":
        $oldUrl = $_POST["old_url"] ?? "";
        $newUrl = $_POST["new_url"] ?? "";
        
        if (!$oldUrl || !$newUrl) {
            echo json_encode(["ok" => false, "error" => "Missing parameters"]);
            break;
        }
        
        // Заменяем во всех HTML файлах
        $replaced = 0;
        foreach(glob("*.html") as $htmlFile) {
            $content = file_get_contents($htmlFile);
            $originalContent = $content;
            
            // Метод 1: Прямая замена
            $content = str_replace('href="' . $oldUrl . '"', 'href="' . $newUrl . '"', $content);
            
            // Метод 2: Замена в кнопках-ссылках
            $pattern = '/<div[^>]+class="[^"]*linkbtn[^"]*"[^>]*>(.*?)<\/div>/is';
            $content = preg_replace_callback($pattern, function($matches) use ($oldUrl, $newUrl) {
                $block = $matches[0];
                if (strpos($block, $oldUrl) !== false) {
                    return str_replace($oldUrl, $newUrl, $block);
                }
                return $block;
            }, $content);
            
            if ($content !== $originalContent) {
                file_put_contents($htmlFile, $content);
                $replaced++;
            }
        }
        
        echo json_encode(["ok" => true, "replaced" => $replaced]);
        break;
        
    default:
        echo json_encode(["ok" => false, "error" => "Unknown action"]);
}
?>