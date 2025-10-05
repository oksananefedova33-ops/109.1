<?php
header('Content-Type: application/xml; charset=utf-8');

// Автоопределение текущего домена
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = "{$scheme}://{$host}";

// Данные страниц и языков встроены в скрипт
$pages = array (
  0 => 
  array (
    'id' => 58,
    'slug' => '',
    'is_home' => true,
  ),
);
$languages = array (
  0 => 'ru',
  2 => 'en',
  3 => 'zh-Hans',
  4 => 'es',
  5 => 'fr',
  6 => 'de',
  7 => 'it',
  8 => 'pt',
  9 => 'ja',
  10 => 'ko',
  11 => 'nl',
  12 => 'pl',
  13 => 'tr',
  14 => 'ar',
  15 => 'cs',
  16 => 'da',
  17 => 'el',
  18 => 'fi',
  19 => 'hu',
  20 => 'id',
  21 => 'no',
  22 => 'ro',
  23 => 'sv',
  24 => 'uk',
  25 => 'bg',
  26 => 'et',
  27 => 'lt',
  28 => 'lv',
  29 => 'sk',
  30 => 'sl',
);
$primaryLang = ''en'';

// Функция получения URL страницы
function getPageUrl($page, $lang, $baseUrl, $primaryLang) {
    $isHome = !empty($page['is_home']);
    
    if ($isHome) {
        if ($lang === $primaryLang) {
            return $baseUrl . '/';
        } else {
            return $baseUrl . '/?lang=' . $lang;
        }
    }
    
    $slug = $page['slug'] ?? '';
    if ($slug) {
        $filename = $slug;
    } else {
        $filename = 'page_' . $page['id'];
    }
    
    // Для экспорта используем .html расширение
    if ($lang !== $primaryLang) {
        $filename .= '-' . $lang;
    }
    
    return $baseUrl . '/' . $filename . '.html';
}

// Генерация sitemap
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";

foreach ($pages as $page) {
    foreach ($languages as $lang) {
        $loc = getPageUrl($page, $lang, $baseUrl, $primaryLang);
        $priority = !empty($page['is_home']) ? '1.0' : '0.8';
        if ($lang !== $primaryLang && !empty($page['is_home'])) {
            $priority = '0.9';
        } elseif ($lang !== $primaryLang) {
            $priority = '0.7';
        }
        
        echo "  <url>\n";
        echo "    <loc>" . htmlspecialchars($loc, ENT_XML1) . "</loc>\n";
        
        // Альтернативные языковые версии
        foreach ($languages as $altLang) {
            $altLoc = getPageUrl($page, $altLang, $baseUrl, $primaryLang);
            echo "    <xhtml:link rel=\"alternate\" hreflang=\"{$altLang}\" href=\"" . htmlspecialchars($altLoc, ENT_XML1) . "\"/>\n";
        }
        
        echo "    <changefreq>weekly</changefreq>\n";
        echo "    <priority>{$priority}</priority>\n";
        echo "  </url>\n";
    }
}

echo '</urlset>';