(function(){
    'use strict';
    
    let analyticsData = null;
    let currentDateRange = 'all';
    let dateFrom = '';
    let dateTo = '';
    
    // Добавляем кнопку в тулбар
    function addAnalyticsButton() {
        const toolbar = document.querySelector('.topbar');
        if (!toolbar || document.getElementById('btnAnalytics')) return;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btnAnalytics';
        btn.className = 'btn';
        btn.innerHTML = '📊 Статистика';
        btn.addEventListener('click', openAnalyticsModal);
        
        const remoteSitesBtn = toolbar.querySelector('#btnRemoteSites');
        if (remoteSitesBtn && remoteSitesBtn.nextSibling) {
            toolbar.insertBefore(btn, remoteSitesBtn.nextSibling);
        } else {
            const exportBtn = toolbar.querySelector('#btnExport');
            if (exportBtn) {
                exportBtn.parentNode.insertBefore(btn, exportBtn);
            } else {
                toolbar.appendChild(btn);
            }
        }
    }
    
    // Создаем модальное окно
    function createAnalyticsModal() {
        if (document.getElementById('analyticsBackdrop')) return;
        
        const backdrop = document.createElement('div');
        backdrop.id = 'analyticsBackdrop';
        backdrop.className = 'analytics-backdrop hidden';
        
        backdrop.innerHTML = `
            <div class="analytics-modal">
                <div class="analytics-header">
                    <div class="analytics-title">
                        📊 Статистика посещений
                    </div>
                    <button type="button" class="analytics-close">×</button>
                </div>
                
                <div class="analytics-toolbar">
                    <div class="analytics-filter-group">
                        <span class="analytics-filter-label">Период:</span>
                        <input type="date" class="analytics-date-input" id="analyticsDateFrom">
                        <span class="analytics-filter-label">—</span>
                        <input type="date" class="analytics-date-input" id="analyticsDateTo">
                        <button class="analytics-btn primary" id="analyticsApplyFilter">Применить</button>
                    </div>
                    
                    <div class="analytics-filter-group" style="margin-left: auto;">
                        <button class="analytics-btn" data-range="today">Сегодня</button>
                        <button class="analytics-btn" data-range="week">Неделя</button>
                        <button class="analytics-btn" data-range="month">Месяц</button>
                        <button class="analytics-btn" data-range="all">Все время</button>
                    </div>
                    
                    <button class="analytics-btn primary" id="analyticsRefresh">🔄 Обновить</button>
                </div>
                
                <div class="analytics-body" id="analyticsContent">
                    <div class="analytics-loading">
                        <div class="analytics-spinner"></div>
                        <div>Загрузка статистики...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        
        // Обработчики
        backdrop.querySelector('.analytics-close').addEventListener('click', closeAnalyticsModal);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closeAnalyticsModal();
        });
        
        document.getElementById('analyticsApplyFilter').addEventListener('click', applyDateFilter);
        document.getElementById('analyticsRefresh').addEventListener('click', loadAnalytics);
        
        // Быстрые фильтры
        backdrop.querySelectorAll('[data-range]').forEach(btn => {
            btn.addEventListener('click', function() {
                setQuickRange(this.dataset.range);
            });
        });
        
        // Устанавливаем даты по умолчанию
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        document.getElementById('analyticsDateFrom').valueAsDate = monthAgo;
        document.getElementById('analyticsDateTo').valueAsDate = today;
    }
    
    function openAnalyticsModal() {
        createAnalyticsModal();
        document.getElementById('analyticsBackdrop').classList.remove('hidden');
        loadAnalytics();
    }
    
    function closeAnalyticsModal() {
        document.getElementById('analyticsBackdrop').classList.add('hidden');
    }
    
    function setQuickRange(range) {
        const today = new Date();
        const dateFromInput = document.getElementById('analyticsDateFrom');
        const dateToInput = document.getElementById('analyticsDateTo');
        
        let fromDate = new Date();
        
        switch(range) {
            case 'today':
                fromDate = new Date(today);
                break;
            case 'week':
                fromDate = new Date(today);
                fromDate.setDate(fromDate.getDate() - 7);
                break;
            case 'month':
                fromDate = new Date(today);
                fromDate.setMonth(fromDate.getMonth() - 1);
                break;
            case 'all':
                fromDate = new Date('2020-01-01');
                break;
        }
        
        dateFromInput.valueAsDate = fromDate;
        dateToInput.valueAsDate = today;
        currentDateRange = range;
        
        loadAnalytics();
    }
    
    function applyDateFilter() {
        const dateFromInput = document.getElementById('analyticsDateFrom');
        const dateToInput = document.getElementById('analyticsDateTo');
        
        dateFrom = dateFromInput.value;
        dateTo = dateToInput.value;
        
        loadAnalytics();
    }
    
    async function loadAnalytics() {
        const content = document.getElementById('analyticsContent');
        content.innerHTML = `
            <div class="analytics-loading">
                <div class="analytics-spinner"></div>
                <div>Загрузка статистики...</div>
            </div>
        `;
        
        try {
            // Получаем список доменов
            const domains = JSON.parse(localStorage.getItem('rs_domains') || '[]');
            
            if (domains.length === 0) {
                content.innerHTML = `
                    <div class="analytics-empty">
                        <div class="analytics-empty-icon">🌐</div>
                        <div>Нет подключенных сайтов</div>
                        <div style="margin-top:12px;color:#9fb2c6;font-size:13px;">
                            Добавьте сайты через кнопку "🌐 Мои сайты"
                        </div>
                    </div>
                `;
                return;
            }
            
            // Загружаем статистику для каждого домена
            const allStats = [];
            
            for (let domain of domains) {
                try {
                    const response = await fetch('/ui/analytics/analytics-api.php', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: new URLSearchParams({
                            action: 'get_stats',
                            domain: domain.url,
                            date_from: dateFrom || '',
                            date_to: dateTo || ''
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.ok) {
                        allStats.push({
                            domain: domain.url,
                            stats: data.stats
                        });
                    }
                } catch (error) {
                    console.error('Ошибка загрузки статистики для', domain.url, error);
                }
            }
            
            renderAnalytics(allStats);
            
        } catch (error) {
            content.innerHTML = `
                <div class="analytics-empty">
                    <div class="analytics-empty-icon">❌</div>
                    <div>Ошибка загрузки статистики</div>
                    <div style="margin-top:8px;color:#ef4444;font-size:13px;">${error.message}</div>
                </div>
            `;
        }
    }
    
    function renderAnalytics(allStats) {
        const content = document.getElementById('analyticsContent');
        
        if (allStats.length === 0) {
            content.innerHTML = `
                <div class="analytics-empty">
                    <div class="analytics-empty-icon">📊</div>
                    <div>Нет данных за выбранный период</div>
                </div>
            `;
            return;
        }
        
        // Агрегируем общую статистику
        let totalVisitors = 0;
        let totalPageviews = 0;
        let totalDownloads = 0;
        let totalClicks = 0;
        
        const countriesMap = {};
        const sourcesMap = {};
        
        allStats.forEach(domainData => {
            const s = domainData.stats;
            totalVisitors += s.unique_visitors || 0;
            totalPageviews += s.pageviews || 0;
            totalDownloads += s.downloads || 0;
            totalClicks += s.clicks || 0;
            
            // Агрегируем страны
            if (s.countries) {
                s.countries.forEach(c => {
                    countriesMap[c.country] = (countriesMap[c.country] || 0) + c.count;
                });
            }
            
            // Агрегируем источники
            if (s.sources) {
                s.sources.forEach(src => {
                    sourcesMap[src.source] = (sourcesMap[src.source] || 0) + src.count;
                });
            }
        });
        
        // Формируем HTML
        let html = `
            <div class="analytics-summary">
                <div class="analytics-card">
                    <div class="analytics-card-title">👥 Посетители</div>
                    <div class="analytics-card-value">${formatNumber(totalVisitors)}</div>
                    <div class="analytics-card-change positive">
                        <span>↗</span> уникальных
                    </div>
                </div>
                
                <div class="analytics-card">
                    <div class="analytics-card-title">📄 Просмотры</div>
                    <div class="analytics-card-value">${formatNumber(totalPageviews)}</div>
                    <div class="analytics-card-change">
                        ${totalVisitors > 0 ? (totalPageviews / totalVisitors).toFixed(1) : 0} на посетителя
                    </div>
                </div>
                
                <div class="analytics-card">
                    <div class="analytics-card-title">📥 Скачиваний</div>
                    <div class="analytics-card-value">${formatNumber(totalDownloads)}</div>
                    <div class="analytics-card-change">
                        файлов
                    </div>
                </div>
                
                <div class="analytics-card">
                    <div class="analytics-card-title">🔗 Переходов</div>
                    <div class="analytics-card-value">${formatNumber(totalClicks)}</div>
                    <div class="analytics-card-change">
                        по ссылкам
                    </div>
                </div>
            </div>
            
            <div class="analytics-tabs">
                <button class="analytics-tab active" data-tab="domains">По доменам</button>
                <button class="analytics-tab" data-tab="countries">По странам</button>
                <button class="analytics-tab" data-tab="sources">По источникам</button>
            </div>
            
            <div class="analytics-tab-content" data-content="domains">
                <div class="analytics-domains-grid">
                    ${allStats.map(d => renderDomainCard(d)).join('')}
                </div>
            </div>
            
            <div class="analytics-tab-content" data-content="countries" style="display:none">
                ${renderCountriesTable(countriesMap)}
            </div>
            
            <div class="analytics-tab-content" data-content="sources" style="display:none">
                ${renderSourcesTable(sourcesMap)}
            </div>
        `;
        
        content.innerHTML = html;
        
        // Обработчики табов
        content.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                content.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                content.querySelectorAll('.analytics-tab-content').forEach(c => c.style.display = 'none');
                content.querySelector(`[data-content="${this.dataset.tab}"]`).style.display = 'block';
            });
        });
    }
    
    function renderDomainCard(domainData) {
        const s = domainData.stats;
        
        return `
            <div class="analytics-domain-card">
                <div class="analytics-domain-header">
                    <div class="analytics-domain-name">${domainData.domain}</div>
                    <div class="analytics-domain-status">
                        <div class="analytics-domain-status-dot ${s.unique_visitors > 0 ? 'online' : 'offline'}"></div>
                        ${s.unique_visitors > 0 ? 'Активен' : 'Нет данных'}
                    </div>
                </div>
                
                <div class="analytics-stats-grid">
                    <div class="analytics-stat-item">
                        <div class="analytics-stat-label">Посетители</div>
                        <div class="analytics-stat-value">${s.unique_visitors || 0}</div>
                    </div>
                    
                    <div class="analytics-stat-item">
                        <div class="analytics-stat-label">Просмотры</div>
                        <div class="analytics-stat-value">${s.pageviews || 0}</div>
                    </div>
                    
                    <div class="analytics-stat-item">
                        <div class="analytics-stat-label">Скачивания</div>
                        <div class="analytics-stat-value">${s.downloads || 0}</div>
                    </div>
                    
                    <div class="analytics-stat-item">
                        <div class="analytics-stat-label">Переходы</div>
                        <div class="analytics-stat-value">${s.clicks || 0}</div>
                    </div>
                </div>
                
                ${renderMiniTables(s)}
            </div>
        `;
    }
    
    function renderMiniTables(stats) {
        let html = '';
        
        // Топ страны
        if (stats.countries && stats.countries.length > 0) {
            html += `
                <table class="analytics-table">
                    <thead>
                        <tr>
                            <th>Страна</th>
                            <th style="text-align:right">Визиты</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.countries.slice(0, 5).map(c => `
                            <tr>
                                <td>${getCountryFlag(c.country)} ${c.country}</td>
                                <td style="text-align:right">${c.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        // Топ источники
        if (stats.sources && stats.sources.length > 0) {
            html += `
                <table class="analytics-table" style="margin-top:12px">
                    <thead>
                        <tr>
                            <th>Источник</th>
                            <th style="text-align:right">Переходы</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.sources.slice(0, 5).map(s => `
                            <tr>
                                <td>${getSourceIcon(s.source)} ${s.source}</td>
                                <td style="text-align:right">${s.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        return html;
    }
    
    function renderCountriesTable(countriesMap) {
        const sorted = Object.entries(countriesMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        
        if (sorted.length === 0) {
            return '<div class="analytics-empty">Нет данных</div>';
        }
        
        return `
            <table class="analytics-table">
                <thead>
                    <tr>
                        <th>Страна</th>
                        <th style="text-align:right">Визиты</th>
                        <th style="text-align:right">%</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(([country, count]) => {
                        const total = sorted.reduce((sum, [, c]) => sum + c, 0);
                        const percent = ((count / total) * 100).toFixed(1);
                        return `
                            <tr>
                                <td>${getCountryFlag(country)} ${country}</td>
                                <td style="text-align:right">${count}</td>
                                <td style="text-align:right">${percent}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
    
    function renderSourcesTable(sourcesMap) {
        const sorted = Object.entries(sourcesMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        
        if (sorted.length === 0) {
            return '<div class="analytics-empty">Нет данных</div>';
        }
        
        return `
            <table class="analytics-table">
                <thead>
                    <tr>
                        <th>Источник</th>
                        <th style="text-align:right">Переходы</th>
                        <th style="text-align:right">%</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(([source, count]) => {
                        const total = sorted.reduce((sum, [, c]) => sum + c, 0);
                        const percent = ((count / total) * 100).toFixed(1);
                        return `
                            <tr>
                                <td>${getSourceIcon(source)} ${source}</td>
                                <td style="text-align:right">${count}</td>
                                <td style="text-align:right">${percent}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
    
    function getCountryFlag(country) {
        const flags = {
            'Russia': '🇷🇺',
            'United States': '🇺🇸',
            'Germany': '🇩🇪',
            'France': '🇫🇷',
            'United Kingdom': '🇬🇧',
            'China': '🇨🇳',
            'Japan': '🇯🇵',
            'India': '🇮🇳',
            'Brazil': '🇧🇷',
            'Canada': '🇨🇦',
            'Unknown': '🌐'
        };
        return flags[country] || '🌐';
    }
    
    function getSourceIcon(source) {
        if (source.includes('google')) return '🔍';
        if (source.includes('yandex')) return '🟡';
        if (source.includes('bing')) return '🔷';
        if (source.includes('direct')) return '🌐';
        if (source.includes('social')) return '📱';
        return '🔗';
    }
    
    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    // Инициализация
    document.addEventListener('DOMContentLoaded', function() {
        addAnalyticsButton();
    });
})();