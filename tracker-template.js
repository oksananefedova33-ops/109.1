// Analytics Tracker
(function(){
    'use strict';
    
    const API_URL = '/analytics-tracker.php';
    
    // Получаем fingerprint браузера
    function getBrowserFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Browser fingerprint', 2, 15);
        
        const data = canvas.toDataURL();
        
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(36);
    }
    
    // Отправка события
    function trackEvent(eventType, data = {}) {
        const payload = {
            type: eventType,
            url: window.location.href,
            referrer: document.referrer,
            fingerprint: getBrowserFingerprint(),
            screen: window.screen.width + 'x' + window.screen.height,
            timestamp: Date.now(),
            ...data
        };
        
        // Используем sendBeacon для надежности
        if (navigator.sendBeacon) {
            const formData = new FormData();
            formData.append('data', JSON.stringify(payload));
            navigator.sendBeacon(API_URL, formData);
        } else {
            // Fallback для старых браузеров
            fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        }
    }
    
    // Трекинг просмотра страницы
    trackEvent('pageview');
    
    // Трекинг скачиваний файлов
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a[download]');
        if (target) {
            trackEvent('download', {
                file: target.getAttribute('download') || target.href,
                url: target.href
            });
        }
    });
    
    // Трекинг кликов по ссылкам (кнопки-ссылки)
    document.addEventListener('click', function(e) {
        const target = e.target.closest('.bl-linkbtn, .el.linkbtn a');
        if (target && target.href && !target.hasAttribute('download')) {
            trackEvent('click', {
                url: target.href,
                text: target.textContent.trim()
            });
        }
    });
    
    // Трекинг времени на странице
    let startTime = Date.now();
    window.addEventListener('beforeunload', function() {
        const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
        trackEvent('time_on_page', {
            seconds: timeOnPage
        });
    });
})();