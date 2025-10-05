(function() {
    'use strict';
    const DESKTOP_W = 1200, TABLET_W = 768, MOBILE_W = 375, EDITOR_H = 1500;
    
    // Функция для применения адаптивных стилей
    function applyResponsive() {
        const width = window.innerWidth;
        const elements = document.querySelectorAll('.el[data-tablet], .el[data-mobile]');
        
        elements.forEach(el => {
            try {
                let styles = {};
                let baseW = DESKTOP_W;
                
                if (width <= 480 && el.dataset.mobile) {
                    // Мобильные устройства
                    styles = JSON.parse(el.dataset.mobile);
                    baseW = MOBILE_W;
                } else if (width <= 768 && width > 480 && el.dataset.tablet) {
    // Планшеты
    styles = JSON.parse(el.dataset.tablet);
    baseW = TABLET_W;
                } else {
                    // Десктоп - восстанавливаем оригинальные стили
                    if (el.dataset.originalStyle) {
                        el.setAttribute('style', el.dataset.originalStyle);
                    }
                    return;
                }
                
                // Сохраняем оригинальные стили
                if (!el.dataset.originalStyle) {
                    el.dataset.originalStyle = el.getAttribute('style');
                }
                
                // Применяем адаптивные стили
                if (styles.left !== undefined) el.style.left = styles.left + '%';
                if (styles.top !== undefined) { el.style.top = ((styles.top / baseW) * 100).toFixed(4) + 'vw'; }
                if (styles.width !== undefined) el.style.width = styles.width + '%';
                if (styles.height !== undefined && el.dataset.type !== 'text') {
                    el.style.height = ((((styles.height / 100) * EDITOR_H) / baseW) * 100).toFixed(4) + 'vw';
                }
                if (styles.fontSize !== undefined) {
                    const textEl = el.querySelector('a, span, div');
                    if (textEl) textEl.style.fontSize = styles.fontSize + 'px';
                }
                if (styles.padding !== undefined) {
                    const padTarget = el.querySelector('a, span, div') || el;
                    padTarget.style.padding = styles.padding + 'px';
                }
                if (styles.radius !== undefined) {
                    el.style.borderRadius = styles.radius + 'px';
                    const rEl = el.querySelector('a');
                    if (rEl) rEl.style.borderRadius = styles.radius + 'px';
                }
                if (styles.rotate !== undefined) {
                    el.style.transform = 'rotate(' + styles.rotate + 'deg)';
                }
            } catch(e) {
                console.error('Error applying responsive styles:', e);
            }
        });
    }
    
    // Функция для обработки высоты контейнера
    function adjustWrapHeight() {
        const wrap = document.querySelector('.wrap');
        if (!wrap) return;
        
        const elements = document.querySelectorAll('.el');
        let maxBottom = 0;
        
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const bottom = el.offsetTop + rect.height;
            if (bottom > maxBottom) {
                maxBottom = bottom;
            }
        });
        
        if (maxBottom > 0) {
            wrap.style.minHeight = Math.max(maxBottom + 100, window.innerHeight) + 'px';
        }
    }
    
    // Функция для плавной прокрутки к якорям
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    // Функция для обработки ленивой загрузки изображений
    function initLazyLoad() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    // Инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', function() {
        applyResponsive();
        adjustWrapHeight();
        initSmoothScroll();
        initLazyLoad();
    });
    
    // Обработка изменения размера окна
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            applyResponsive();
            adjustWrapHeight();
        }, 250);
    });
    
    // Обработка изменения ориентации устройства
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            applyResponsive();
            adjustWrapHeight();
        }, 100);
    });
    
    // Автоопределение языка браузера при первом посещении
    if (!localStorage.getItem('site_lang_set')) {
        const browserLang = navigator.language.substring(0, 2);
        const currentLang = document.documentElement.lang;
        
        // Если язык браузера английский, а страница не английская
        if (browserLang === 'en' && currentLang !== 'en') {
            // Пытаемся найти английскую версию
            const currentPath = window.location.pathname;
            const currentFile = currentPath.split('/').pop() || 'index.html';
            
            // Определяем имя английской версии
            let enFile;
            if (currentFile === 'index.html' || currentFile === '') {
                enFile = '/index.html'; // Если английский основной
            } else if (currentFile.includes('-ru.html')) {
                enFile = currentFile.replace('-ru.html', '.html');
            } else {
                enFile = currentFile.replace('.html', '-en.html');
            }
            
            // Проверяем существование английской версии
            fetch(enFile, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        localStorage.setItem('site_lang_set', 'true');
                        window.location.href = enFile;
                    }
                })
                .catch(() => {
                    localStorage.setItem('site_lang_set', 'true');
                });
        } else {
            localStorage.setItem('site_lang_set', 'true');
        }
    }
})();