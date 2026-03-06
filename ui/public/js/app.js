// ============ 农场管理系统 - 前端逻辑 ============

window.autoScrollLogs = true; // 日志自动滚动开关

const PHASE_NAMES = ['未知', '种子', '发芽', '小叶', '大叶', '开花', '成熟', '枯死'];

// 植物图片映射（植物名称 -> {seed_id, crop_num}）
const PLANT_IMAGE_MAP = {
    '白萝卜': {id: 29999, crop: 2}, '胡萝卜': {id: 20003, crop: 3}, '玉米': {id: 20004, crop: 4},
    '土豆': {id: 20005, crop: 5}, '茄子': {id: 20006, crop: 6}, '番茄': {id: 20007, crop: 7},
    '豌豆': {id: 20008, crop: 8}, '辣椒': {id: 20009, crop: 9}, '南瓜': {id: 20010, crop: 10},
    '苹果': {id: 20011, crop: 11}, '葡萄': {id: 20013, crop: 13}, '西瓜': {id: 20014, crop: 14},
    '香蕉': {id: 20015, crop: 15}, '菠萝蜜': {id: 20016, crop: 16}, '桃子': {id: 20018, crop: 18},
    '橙子': {id: 20019, crop: 19}, '鳄梨': {id: 20022, crop: 22}, '石榴': {id: 20023, crop: 23},
    '柚子': {id: 20026, crop: 26}, '菠萝': {id: 20027, crop: 27}, '椰子': {id: 20029, crop: 29},
    '葫芦': {id: 20031, crop: 31}, '火龙果': {id: 20033, crop: 33}, '樱桃': {id: 20034, crop: 34},
    '荔枝': {id: 20035, crop: 35}, '箬竹': {id: 20036, crop: 36}, '莲藕': {id: 20037, crop: 37},
    '木瓜': {id: 20038, crop: 38}, '杨桃': {id: 20039, crop: 39}, '红玫瑰': {id: 20041, crop: 41},
    '柠檬': {id: 20042, crop: 42}, '无花果': {id: 20043, crop: 43}, '丝瓜': {id: 20044, crop: 44},
    '猕猴桃': {id: 20045, crop: 45}, '甘蔗': {id: 20047, crop: 47}, '杨梅': {id: 20048, crop: 48},
    '花生': {id: 20049, crop: 49}, '蘑菇': {id: 20050, crop: 50}, '红枣': {id: 20051, crop: 51},
    '金针菇': {id: 20052, crop: 52}, '桂圆': {id: 20053, crop: 53}, '梨': {id: 20054, crop: 54},
    '枇杷': {id: 20055, crop: 55}, '哈密瓜': {id: 20056, crop: 56}, '芒果': {id: 20057, crop: 57},
    '榴莲': {id: 20058, crop: 58}, '大白菜': {id: 20059, crop: 59}, '水稻': {id: 20060, crop: 60},
    '小麦': {id: 20061, crop: 61}, '四叶草': {id: 20062, crop: 62}, '苦瓜': {id: 20063, crop: 63},
    '大葱': {id: 20064, crop: 64}, '大蒜': {id: 20065, crop: 65}, '鲜姜': {id: 20066, crop: 66},
    '香瓜': {id: 20067, crop: 67}, '冬瓜': {id: 20068, crop: 68}, '黄豆': {id: 20070, crop: 70},
    '小白菜': {id: 20071, crop: 71}, '榛子': {id: 20072, crop: 72}, '菠菜': {id: 20073, crop: 73},
    '金桔': {id: 20074, crop: 74}, '桑葚': {id: 20075, crop: 75}, '山竹': {id: 20076, crop: 76},
    '蓝莓': {id: 20077, crop: 77}, '杏子': {id: 20078, crop: 78}, '番石榴': {id: 20079, crop: 79},
    '月柿': {id: 20080, crop: 80}, '红毛丹': {id: 20083, crop: 83}, '芭蕉': {id: 20084, crop: 84},
    '番荔枝': {id: 20085, crop: 85}, '橄榄': {id: 20086, crop: 86}, '百香果': {id: 20087, crop: 87},
    '灯笼果': {id: 20088, crop: 88}, '芦荟': {id: 20089, crop: 89}, '薄荷': {id: 20090, crop: 90},
    '山楂': {id: 20091, crop: 91}, '栗子': {id: 20095, crop: 95}, '生菜': {id: 20096, crop: 96},
    '黄瓜': {id: 20097, crop: 97}, '花菜': {id: 20098, crop: 98}, '油菜': {id: 20099, crop: 99},
    '竹笋': {id: 20100, crop: 100}, '天香百合': {id: 20103, crop: 103}, '非洲菊': {id: 20104, crop: 104},
    '小雏菊': {id: 20105, crop: 105}, '满天星': {id: 20110, crop: 110}, '曼陀罗华': {id: 20116, crop: 116},
    '蒲公英': {id: 20120, crop: 120}, '曼珠沙华': {id: 20126, crop: 126}, '茉莉花': {id: 20128, crop: 128},
    '火绒草': {id: 20135, crop: 135}, '花香根鸢尾': {id: 20141, crop: 141}, '虞美人': {id: 20142, crop: 142},
    '含羞草': {id: 20143, crop: 143}, '向日葵': {id: 20145, crop: 145}, '牵牛花': {id: 20147, crop: 147},
    '秋菊（黄色）': {id: 20161, crop: 161}, '秋菊（红色）': {id: 20162, crop: 162},
    '天山雪莲': {id: 20201, crop: 201}, '金边灵芝': {id: 20202, crop: 202}, '人参': {id: 20204, crop: 204},
    '瓶子树': {id: 20218, crop: 218}, '猪笼草': {id: 20220, crop: 220}, '天堂鸟': {id: 20221, crop: 221},
    '豹皮花': {id: 20222, crop: 222}, '宝华玉兰': {id: 20225, crop: 225}, '依米花': {id: 20226, crop: 226},
    '大王花': {id: 20227, crop: 227}, '人参果': {id: 20228, crop: 228}, '何首乌': {id: 20229, crop: 229},
    '金花茶': {id: 20235, crop: 235}, '似血杜鹃': {id: 20242, crop: 242}, '银莲花': {id: 20259, crop: 259},
    '韭菜': {id: 20305, crop: 305}, '芹菜': {id: 20306, crop: 306}, '核桃': {id: 20308, crop: 308},
    '迎春花': {id: 20396, crop: 396}, '李子': {id: 20413, crop: 413}, '睡莲': {id: 20442, crop: 442},
    '新春红包': {id: 21542, crop: 1542}, '哈哈南瓜': {id: 29998, crop: 9998}
};

function getPlantImageUrl(plantName) {
    const info = PLANT_IMAGE_MAP[plantName];
    if (info) {
        return `/seed_images/${info.id}_${plantName}_Crop_${info.crop}_Seed.png`;
    }
    return null;
}

function getRunTime(startTime) {
    const seconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    if (seconds < 60) return seconds + '秒';
    if (seconds < 3600) return Math.floor(seconds / 60) + '分' + (seconds % 60) + '秒';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
        return days + '天' + hours + '时' + mins + '分' + secs + '秒';
    }
    return hours + '时' + mins + '分' + secs + '秒';
}

let socket = null;
let accounts = [];
let selectedAccountId = null;
let wsConnected = false;
let scanPollTimer = null;
let accountLogs = {};
let currentLandDetailId = null;
let landDetailTimer = null;

// ============ DOM 元素 ============
const connectionStatus = document.getElementById('connection-status');
const accountsGrid = document.getElementById('accounts-grid');
const detailPanel = document.getElementById('detail-panel');
const detailTitle = document.getElementById('detail-title');
const detailStats = document.getElementById('detail-stats');
const landsCount = document.getElementById('lands-count');
const landsGrid = document.getElementById('lands-grid');
const modalAdd = document.getElementById('modal-add');
const modalEdit = document.getElementById('modal-edit');
const toast = document.getElementById('toast');
let landsDataCache = null;
const MAX_LOGS_PER_ACCOUNT = 500;

function loadLogsFromStorage() {
    try {
        const stored = localStorage.getItem('accountLogs');
        if (stored) {
            accountLogs = JSON.parse(stored);
        }
    } catch (e) {
        console.error('加载日志失败:', e);
    }
}

function saveLogsToStorage() {
    try {
        localStorage.setItem('accountLogs', JSON.stringify(accountLogs));
    } catch (e) {
        console.error('保存日志失败:', e);
    }
}

// ============ 初始化 ============
function init() {
    loadLogsFromStorage();
    connectWebSocket();
    setupEventListeners();
    loadAccounts();
    setInterval(updateCountdowns, 1000);
}

function updateCountdowns() {
    if (!landsDataCache) return;
    const now = Math.floor(Date.now() / 1000);
    document.querySelectorAll('.land-cell.growing .land-timer').forEach(timer => {
        const matureTime = parseInt(timer.dataset.matureTime);
        if (matureTime) {
            const remainingSec = matureTime - now;
            if (remainingSec > 0) {
                const hours = Math.floor(remainingSec / 3600);
                const mins = Math.floor((remainingSec % 3600) / 60);
                const secs = remainingSec % 60;
                if (hours > 0) {
                    timer.textContent = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                    timer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            } else {
                timer.textContent = '';
            }
        }
    });
}

async function loadRankingAndSeeds(acc) {
    const level = acc.data?.level || 1;
    const lands = 18;
    
    const rankingDisplay = document.getElementById('ranking-display');
    const seedSelection = document.getElementById('seed-selection');
    
    try {
        const [rankingRes, seedsRes] = await Promise.all([
            fetch(`/api/ranking/${level}/${lands}`),
            fetch(`/api/seeds/${level}/${lands}`)
        ]);
        
        const ranking = await rankingRes.json();
        const seeds = await seedsRes.json();
        
        if (ranking.topNormalFert && ranking.topNormalFert.length > 0) {
            const recommendedSeed = ranking.topNormalFert[0];
            let html = '<div class="ranking-columns">';
            
            html += '<div class="ranking-col"><strong>施肥推荐 ★</strong>';
            ranking.topNormalFert.forEach((r, i) => {
                const isFirst = i === 0;
                html += `<div class="ranking-row ${isFirst ? 'recommended' : ''}">
                    <span class="ranking-rank">${i + 1}</span>
                    <span class="ranking-name">${r.name}${isFirst ? ' ★' : ''}</span>
                    <span class="ranking-exp">${r.expPerHour}/h</span>
                    <span class="ranking-gain">+${r.gainPercent}%</span>
                </div>`;
            });
            html += '</div>';
            
            html += '<div class="ranking-col"><strong>不施肥推荐</strong>';
            ranking.topNoFert.forEach((r, i) => {
                html += `<div class="ranking-row">
                    <span class="ranking-rank">${i + 1}</span>
                    <span class="ranking-name">${r.name}</span>
                    <span class="ranking-exp">${r.expPerHour}/h</span>
                </div>`;
            });
            html += '</div>';
            
            html += '</div>';
            rankingDisplay.innerHTML = html;
        } else {
            rankingDisplay.innerHTML = '<p class="text-muted">无法获取排行榜数据</p>';
        }
        
        if (seeds.candidatesNormalFert && seeds.candidatesNormalFert.length > 0) {
            const selectedSeed = acc.config?.selectedSeed || '';
            
            let html = '<select name="selectedSeed" id="seed-pool-select" class="seed-select">';
            html += '<option value="">推荐种子</option>';
            seeds.candidatesNormalFert.forEach(seed => {
                const isRecommended = seed === seeds.candidatesNormalFert[0];
                html += `<option value="${seed.name}" ${seed.name === selectedSeed ? 'selected' : ''}>
                    ${seed.name} ${isRecommended ? '(推荐)' : ''} - ${seed.expPerHour}exp/h
                </option>`;
            });
            html += '</select>';
            seedSelection.innerHTML = html;
        } else {
            seedSelection.innerHTML = '<p class="text-muted">无法获取种子数据</p>';
        }
    } catch (e) {
        console.error('加载排行榜和种子失败:', e);
        rankingDisplay.innerHTML = '<p class="text-muted">加载失败</p>';
        seedSelection.innerHTML = '<p class="text-muted">加载失败</p>';
    }
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        wsConnected = true;
        updateConnectionStatus(true);
    };
    
    socket.onclose = () => {
        wsConnected = false;
        updateConnectionStatus(false);
        setTimeout(connectWebSocket, 3000);
    };
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (e) {}
    };
}

function handleMessage(data) {
    try {
        switch (data.type) {
            case 'accounts_snapshot':
                accounts = data.accounts || [];
                renderAccounts();
                break;
                
            case 'account_status':
                const accStatus = accounts.find(a => a.id === data.accountId);
                if (accStatus) {
                    accStatus.status = data.status;
                    accStatus.pid = data.pid;
                    if (data.config) {
                        accStatus.config = data.config;
                    }
                }
                renderAccounts();
                if (selectedAccountId === data.accountId) {
                    updateDetailPanel(data.accountId);
                }
                break;
            
            case 'account_data':
                const accData = accounts.find(a => a.id === data.accountId);
                if (accData) {
                    accData.data = data.data;
                }
                renderAccounts();
                if (selectedAccountId === data.accountId) {
                    updateDetailPanel(data.accountId);
                }
                break;

            case 'account_stats':
                const accStats = accounts.find(a => a.id === data.accountId);
                if (accStats) {
                    accStats.stats = data.stats;
                }
                if (selectedAccountId === data.accountId) {
                    updateDetailPanel(data.accountId);
                }
                break;
            
            case 'lands_update':
                const accLands = accounts.find(a => a.id === data.accountId);
                if (accLands) {
                    accLands.lands = data.data;
                }
                if (selectedAccountId === data.accountId) {
                    renderLands(data.data);
                }
                break;
            
            case 'lands_notify':
                if (selectedAccountId === data.accountId) {
                    const acc = accounts.find(a => a.id === data.accountId);
                    if (acc && acc.lands) {
                        for (const changed of data.changedLands) {
                            const idx = acc.lands.lands.findIndex(l => l.id === changed.id);
                            if (idx >= 0) {
                                acc.lands.lands[idx] = { ...acc.lands.lands[idx], ...changed };
                            }
                        }
                        renderLands(acc.lands);
                    }
                }
                break;
            
            case 'log':
                if (!accountLogs[data.accountId]) {
                    accountLogs[data.accountId] = [];
                }
                accountLogs[data.accountId].push({
                    level: data.level,
                    message: data.message,
                    timestamp: data.timestamp
                });
                // 限制日志数量，避免localStorage满
                if (accountLogs[data.accountId].length > MAX_LOGS_PER_ACCOUNT) {
                    accountLogs[data.accountId] = accountLogs[data.accountId].slice(-MAX_LOGS_PER_ACCOUNT);
                }
                saveLogsToStorage();
                if (selectedAccountId === data.accountId) {
                    appendLog(data.accountId, data.level, data.message, data.timestamp);
                }
                break;
        }
    } catch (e) {}
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.textContent = '已连接';
        connectionStatus.className = 'status-connected';
    } else {
        connectionStatus.textContent = '未连接';
        connectionStatus.className = 'status-disconnected';
    }
}

async function loadAccounts() {
    try {
        const res = await fetch('/api/accounts');
        accounts = await res.json();
        renderAccounts();
    } catch (e) {
        showToast('加载账号失败', 'error');
    }
}

setInterval(() => {
    renderAccounts();
}, 1000);

function renderAccounts() {
    accountsGrid.innerHTML = '';
    
    if (!accounts || accounts.length === 0) {
        accountsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h3>暂无账号</h3>
                <p>点击"添加账号"开始使用</p>
            </div>
        `;
        return;
    }
    
    for (const acc of accounts) {
        const card = document.createElement('div');
        const selId = selectedAccountId || null;
        card.className = `account-card ${acc.status} ${selId === acc.id ? 'selected' : ''}`;
        card.dataset.id = acc.id;
        
        const statusText = acc.status === 'running' ? '在线' : acc.status === 'stopped' ? '离线' : '错误';
        
        const runTime = acc.startTime && acc.status === 'running' 
            ? getRunTime(acc.startTime) 
            : '-';
        
        const avatarUrl = acc.data?.avatarUrl || (acc.data?.openId ? `https://q1.qlogo.cn/g?b=qq&nk=${acc.data.openId}&s=100` : '');
        
        card.innerHTML = `
            <div class="card-header">
                ${avatarUrl ? `<img class="card-avatar" src="${avatarUrl}" alt="头像">` : ''}
                <span class="card-name">${acc.name || acc.id}</span>
                <div class="card-status">
                    <span class="status-dot ${acc.status === 'running' ? 'online' : acc.status === 'error' ? 'error' : 'offline'}"></span>
                    <span>${statusText}</span>
                </div>
            </div>
            <div class="card-info">
                <div>
                    <span class="label">等级: </span>
                    <span class="value">Lv${acc.data?.level || '-'}</span>
                </div>
                <div>
                    <span class="label">金币: </span>
                    <span class="value">${acc.data?.gold || '-'}</span>
                </div>
                <div>
                    <span class="label">经验: </span>
                    <span class="value">${acc.data?.expProgress ? acc.data.expProgress.current + '/' + acc.data.expProgress.needed : acc.data?.exp || '-'}</span>
                </div>
                <div>
                    <span class="label">GID: </span>
                    <span class="value">${acc.data?.gid || '-'}</span>
                </div>
                <div>
                    <span class="label">运行: </span>
                    <span class="value">${runTime}</span>
                </div>
                <div>
                    <span class="label">平台: </span>
                    <span class="value">${acc.config?.platform === 'wx' ? '微信' : 'QQ'}</span>
                </div>
            </div>
            <div class="card-actions">
                ${acc.status === 'running' 
                    ? `<button class="btn btn-danger btn-stop" data-id="${acc.id}">停止</button>`
                    : `<button class="btn btn-success btn-start" data-id="${acc.id}">启动</button>`
                }
                <button class="btn btn-warning btn-relogin" data-id="${acc.id}">重登</button>
                <button class="btn btn-primary btn-config" data-id="${acc.id}">配置</button>
                <button class="btn btn-danger btn-delete" data-id="${acc.id}">删除</button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn')) return;
            selectAccount(acc.id);
            updateDetailPanel(acc.id);
        });
        
        accountsGrid.appendChild(card);
    }
    
    document.querySelectorAll('.btn-start').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            startAccount(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.btn-stop').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            stopAccount(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectAccount(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这个账号吗？')) {
                deleteAccount(btn.dataset.id);
            }
        });
    });
    
    document.querySelectorAll('.btn-relogin').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openReloginModal(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.btn-config').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const acc = accounts.find(a => a.id === btn.dataset.id);
            if (!acc) return;
            
            const form = document.getElementById('form-config');
            form.accountId.value = acc.id;
            form.farmInterval.value = acc.config?.farmInterval || 1;
            form.friendInterval.value = acc.config?.friendInterval || 2;
            form.harvestDelay.value = acc.config?.harvestDelay || 0;
            form.stealDelay.value = acc.config?.stealDelay || 0;
            form.autoFriend.checked = acc.config?.autoFriend || false;
            form.autoSteal.checked = acc.config?.autoSteal || false;
            form.autoClaim.checked = acc.config?.autoClaim || false;
            form.autoFarm.checked = acc.config?.autoFarm || false;
            form.autoFertilize.checked = acc.config?.autoFertilize || false;
            form.autoLandUnlock.checked = acc.config?.autoLandUnlock || false;
            form.autoLandUpgrade.checked = acc.config?.autoLandUpgrade || false;
            form.autoSell.checked = acc.config?.autoSell || false;
            form.autoBuyFertilizer.checked = acc.config?.autoBuyFertilizer || false;
            form.autoUseFertilizer.checked = acc.config?.autoUseFertilizer || false;
            
            document.getElementById('modal-config').classList.remove('hidden');
            
            loadRankingAndSeeds(acc);
        });
    });
}

function selectAccount(id) {
    selectedAccountId = id;
    renderAccounts();
    updateDetailPanel(id);
    detailPanel.classList.remove('hidden');
}

function updateDetailPanel(id) {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    
    renderAccountLogs(id);
    
    detailTitle.textContent = acc.name || id;
    
    // 渲染统计
    if (detailStats) {
        const stats = acc.stats || {};
        detailStats.innerHTML = `
            <div class="stats-grid">
                <div class="stats-item"><span class="stats-icon">🎯</span><span class="stats-value">${stats.harvestCount || 0}</span><span class="stats-label">收获</span></div>
                <div class="stats-item"><span class="stats-icon">🫳</span><span class="stats-value">${stats.stealCount || 0}</span><span class="stats-label">偷菜</span></div>
                <div class="stats-item"><span class="stats-icon">💰</span><span class="stats-value">${stats.sellGold || 0}</span><span class="stats-label">售金</span></div>
                <div class="stats-item"><span class="stats-icon">💧</span><span class="stats-value">${(stats.helpWater || 0) + (stats.selfWater || 0)}</span><span class="stats-label">浇水</span></div>
                <div class="stats-item"><span class="stats-icon">🌿</span><span class="stats-value">${(stats.helpWeed || 0) + (stats.selfWeed || 0)}</span><span class="stats-label">除草</span></div>
                <div class="stats-item"><span class="stats-icon">🐛</span><span class="stats-value">${(stats.helpPest || 0) + (stats.selfPest || 0)}</span><span class="stats-label">除虫</span></div>
            </div>
        `;
    }
    
    if (acc.lands) {
        renderLands(acc.lands);
    } else {
        landsGrid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">暂无土地数据</p>';
    }
    
    detailPanel.classList.remove('hidden');
}

function renderLands(landsData) {
    if (!landsData || !landsData.lands) {
        landsGrid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">暂无土地数据</p>';
        landsCount.textContent = '0';
        return;
    }
    
    landsDataCache = landsData;
    landsCount.textContent = landsData.unlockedLands || 0;
    landsGrid.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        const land = landsData.lands.find(l => l.id === i + 1);
        const cell = document.createElement('div');
        
        if (!land || !land.unlocked) {
            cell.className = 'land-cell locked';
            cell.innerHTML = `<span class="land-icon">⬛</span><span class="land-name">锁定</span><span class="land-level">Lv${land?.level || 1}</span>`;
        } else if (!land.plant) {
            cell.className = 'land-cell empty';
            cell.innerHTML = `<span class="land-icon">⬜</span><span class="land-name">空地</span><span class="land-level">Lv${land.level}</span>`;
        } else {
            const status = land.status || 'growing';
            const name = land.plant?.name || '未知';
            const icon = getLandIcon(status, name);
            const matureTime = land.plant?.matureTime;
            
            cell.className = `land-cell ${status}`;
            cell.dataset.landId = land.id;
            cell.dataset.plant = JSON.stringify(land.plant);
            
            let html = `
                <span class="land-icon">${icon}</span>
                <span class="land-name">${name}</span>
            `;
            
            // 显示成熟倒计时
            if (matureTime && status === 'growing') {
                const remainingSec = matureTime - Math.floor(Date.now() / 1000);
                let timerText = '';
                if (remainingSec > 0) {
                    const hours = Math.floor(remainingSec / 3600);
                    const mins = Math.floor((remainingSec % 3600) / 60);
                    const secs = remainingSec % 60;
                    if (hours > 0) {
                        timerText = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    } else {
                        timerText = `${mins}:${secs.toString().padStart(2, '0')}`;
                    }
                }
                html += `<span class="land-timer" data-mature-time="${matureTime}">${timerText}</span>`;
            }
            
            html += `<span class="land-level">Lv${land.level}</span>`;
            
            cell.innerHTML = html;
            
            if (land.plant.dryNum > 0 || land.plant.hasWeed || land.plant.hasInsect) {
                let badge = '';
                if (land.plant.dryNum > 0) badge = '💧';
                else if (land.plant.hasWeed) badge = '🌿';
                else if (land.plant.hasInsect) badge = '🐛';
                cell.innerHTML += `<span class="land-badge">${badge}</span>`;
            }
            
            cell.addEventListener('click', () => showLandDetail(land));
        }
        
        landsGrid.appendChild(cell);
    }
}

function showLandDetail(land) {
    if (!land || !land.plant) return;
    
    // 清除之前的定时器
    if (landDetailTimer) {
        clearInterval(landDetailTimer);
    }
    
    currentLandDetailId = land.id;
    
    function updateDetail() {
        if (!landsDataCache || !currentLandDetailId) return;
        
        const currentLand = landsDataCache.lands.find(l => l && l.id === currentLandDetailId);
        if (!currentLand || !currentLand.plant) return;
        
        const plant = currentLand.plant;
        const imgUrl = getPlantImageUrl(plant.name);
        const icon = imgUrl ? `<img src="${imgUrl}" style="width:48px;height:48px;object-fit:contain;">` : '🌱';
        
        let matureText = '';
        if (plant.matureTime) {
            const remainingSec = plant.matureTime - Math.floor(Date.now() / 1000);
            if (remainingSec > 0) {
                const hours = Math.floor(remainingSec / 3600);
                const mins = Math.floor((remainingSec % 3600) / 60);
                const secs = remainingSec % 60;
                matureText = hours > 0 ? `${hours}小时${mins}分${secs}秒` : `${mins}分${secs}秒`;
            } else {
                matureText = '已成熟';
            }
        }
        
        const statusText = {
            'ready': '✅ 可收获',
            'growing': '🌱 生长中',
            'needsWater': '💧 缺水',
            'needsWeed': '🌿 有草',
            'needsInsect': '🐛 有虫',
            'dead': '💀 枯死'
        }[currentLand.status] || '未知';
        
        let status = '<div class="land-detail-row"><span>状态:</span><span>' + statusText + '</span></div>';
        if (plant.dryNum > 0) status += '<div class="land-detail-row"><span>缺水:</span><span>💧 缺水' + plant.dryNum + '</span></div>';
        if (plant.hasWeed) status += '<div class="land-detail-row"><span>杂草:</span><span>🌿 需要除草</span></div>';
        if (plant.hasInsect) status += '<div class="land-detail-row"><span>虫害:</span><span>🐛 需要除虫</span></div>';
        
        const content = document.getElementById('land-detail-content');
        content.innerHTML = `
            <div class="land-detail-header">
                <div class="land-detail-icon">${icon}</div>
                <div class="land-detail-info">
                    <h3>${plant.name}</h3>
                    <p>${plant.phaseName}</p>
                </div>
            </div>
            <div class="land-detail-body">
                <div class="land-detail-row"><span>土地:</span><span>#${currentLand.id} · Lv${currentLand.level}</span></div>
                <div class="land-detail-row"><span>生长时间:</span><span>${plant.growSec}秒</span></div>
                <div class="land-detail-row"><span>成熟时间:</span><span>${matureText || '未知'}</span></div>
                <div class="land-detail-row"><span>果实数量:</span><span>${plant.fruitNum || 0}</span></div>
                <div class="land-detail-row"><span>被偷数量:</span><span>${plant.stolenNum || 0}</span></div>
                <div class="land-detail-row"><span>可偷:</span><span>${plant.stealable ? '✅ 是' : '❌ 否'}</span></div>
                ${status}
            </div>
        `;
    }
    
    // 立即更新一次
    updateDetail();
    
    // 启动定时器，每秒更新
    landDetailTimer = setInterval(updateDetail, 1000);
    
    const modal = document.getElementById('modal-land-detail');
    modal.classList.remove('hidden');
    
    document.getElementById('btn-close-land-detail').onclick = () => {
        if (landDetailTimer) {
            clearInterval(landDetailTimer);
            landDetailTimer = null;
        }
        currentLandDetailId = null;
        modal.classList.add('hidden');
    };
}

function getLandIcon(status, plantName) {
    if (status === 'ready' || status === 'growing' || status === 'needsWater' || status === 'needsWeed' || status === 'needsInsect' || status === 'dead') {
        if (plantName) {
            const imgUrl = getPlantImageUrl(plantName);
            if (imgUrl) {
                return `<img src="${imgUrl}" class="plant-icon-img" alt="${plantName}">`;
            }
        }
    }
    const icons = {
        'ready': '🥕',
        'growing': '🌱',
        'needsWater': '💧',
        'needsWeed': '🌿',
        'needsInsect': '🐛',
        'dead': '💀',
        'empty': '⬜',
        'locked': '⬛'
    };
    return icons[status] || '🌱';
}

async function startAccount(id) {
    try {
        const res = await fetch(`/api/accounts/${id}/start`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('账号已启动', 'success');
        } else {
            showToast(data.message || '启动失败', 'error');
        }
    } catch (e) {
        showToast('启动失败: ' + e.message, 'error');
    }
}

// 重新登录扫码轮询
let reloginPollTimer = null;
let currentReloginId = null;

// 打开重新登录弹窗
async function openReloginModal(id) {
    currentReloginId = id;
    const modal = document.getElementById('modal-relogin');
    const manualSection = document.getElementById('manual-relogin-section');
    const scanSection = document.getElementById('scan-relogin-section');
    const codeInput = document.getElementById('relogin-code');
    
    manualSection.classList.remove('hidden');
    scanSection.classList.add('hidden');
    codeInput.value = '';
    modal.classList.remove('hidden');
}

// 关闭重新登录弹窗
function closeReloginModal() {
    if (reloginPollTimer) {
        clearInterval(reloginPollTimer);
        reloginPollTimer = null;
    }
    currentReloginId = null;
    const modal = document.getElementById('modal-relogin');
    modal.classList.add('hidden');
}

// 手动登录
async function manualRelogin() {
    const code = document.getElementById('relogin-code').value.trim();
    if (!code) {
        showToast('请输入登录Code', 'error');
        return;
    }
    
    try {
        const res = await fetch(`/api/accounts/${currentReloginId}/relogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        });
        const data = await res.json();
        
        if (data.success) {
            closeReloginModal();
            showToast('重新登录成功', 'success');
            loadAccounts();
        } else {
            showToast(data.message || '登录失败', 'error');
        }
    } catch (e) {
        showToast('重新登录失败: ' + e.message, 'error');
    }
}

// 扫码登录
async function startScanRelogin() {
    if (!currentReloginId) return;
    
    try {
        // 先停止账号
        await fetch(`/api/accounts/${currentReloginId}/stop`, { method: 'POST' });
        
        // 获取二维码
        const res = await fetch(`/api/accounts/${currentReloginId}/relogin`, { method: 'POST' });
        const data = await res.json();
        
        if (!data.success) {
            showToast(data.error || '获取二维码失败', 'error');
            return;
        }
        
        // 显示扫码区域
        const manualSection = document.getElementById('manual-relogin-section');
        const scanSection = document.getElementById('scan-relogin-section');
        const scanQrcode = document.getElementById('scan-relogin-qrcode');
        const scanStatus = document.getElementById('scan-relogin-status');
        
        manualSection.classList.add('hidden');
        scanSection.classList.remove('hidden');
        
        scanQrcode.src = data.qrUrl;
        scanStatus.textContent = '请用 QQ 扫码登录...';
        
        // 轮询扫码状态
        if (reloginPollTimer) clearInterval(reloginPollTimer);
        
        reloginPollTimer = setInterval(async () => {
            try {
                const pollRes = await fetch(`/api/accounts/${currentReloginId}/relogin/poll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ loginCode: data.loginCode })
                });
                const pollData = await pollRes.json();
                
                if (pollData.success) {
                    clearInterval(reloginPollTimer);
                    reloginPollTimer = null;
                    closeReloginModal();
                    showToast('重新登录成功', 'success');
                    loadAccounts();
                } else if (pollData.error) {
                    clearInterval(reloginPollTimer);
                    reloginPollTimer = null;
                    showToast(pollData.error, 'error');
                }
            } catch (e) {
                console.error('轮询错误:', e);
            }
        }, 2000);
        
    } catch (e) {
        showToast('重新登录失败: ' + e.message, 'error');
    }
}

// 重新登录扫码轮询

async function reloginAccount(id) {
    try {
        // 先停止账号
        const stopRes = await fetch(`/api/accounts/${id}/stop`, { method: 'POST' });
        const stopData = await stopRes.json();
        
        // 开始扫码
        const res = await fetch(`/api/accounts/${id}/relogin`, { method: 'POST' });
        const data = await res.json();
        
        if (!data.success) {
            showToast(data.error || '获取二维码失败', 'error');
            return;
        }
        
        // 弹出扫码对话框
        const modal = document.getElementById('modal-add');
        const scanSection = document.getElementById('scan-add-section');
        const formAdd = document.getElementById('form-add');
        const scanQrcode = document.getElementById('scan-add-qrcode');
        const scanStatus = document.getElementById('scan-add-status');
        
        formAdd.classList.add('hidden');
        scanSection.classList.remove('hidden');
        modal.classList.remove('hidden');
        
        scanQrcode.src = data.qrUrl;
        scanStatus.textContent = '请用 QQ 扫码登录...';
        
        // 轮询扫码状态
        if (reloginPollTimer) clearInterval(reloginPollTimer);
        
        reloginPollTimer = setInterval(async () => {
            try {
                const pollRes = await fetch(`/api/accounts/${id}/relogin/poll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ loginCode: data.loginCode })
                });
                const pollData = await pollRes.json();
                
                if (pollData.success) {
                    clearInterval(reloginPollTimer);
                    reloginPollTimer = null;
                    modal.classList.add('hidden');
                    showToast('重新登录成功', 'success');
                    loadAccounts();
                } else if (pollData.error) {
                    clearInterval(reloginPollTimer);
                    reloginPollTimer = null;
                    showToast(pollData.error, 'error');
                }
            } catch (e) {
                console.error('轮询错误:', e);
            }
        }, 2000);
        
    } catch (e) {
        showToast('重新登录失败: ' + e.message, 'error');
    }
}

async function stopAccount(id) {
    try {
        const res = await fetch(`/api/accounts/${id}/stop`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('账号已停止', 'success');
        } else {
            showToast(data.message || '停止失败', 'error');
        }
    } catch (e) {
        showToast('停止失败: ' + e.message, 'error');
    }
}

async function restartAccount(id) {
    try {
        const res = await fetch(`/api/accounts/${id}/restart`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('账号已重启', 'success');
        } else {
            showToast(data.message || '重启失败', 'error');
        }
    } catch (e) {
        showToast('重启失败: ' + e.message, 'error');
    }
}

async function addAccount(formData) {
    try {
        const res = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
            showToast('账号添加成功', 'success');
            loadAccounts();
            return true;
        } else {
            showToast(data.error || '添加失败', 'error');
            return false;
        }
    } catch (e) {
        showToast('添加失败: ' + e.message, 'error');
        return false;
    }
}

async function updateConfig(id, config) {
    try {
        const res = await fetch(`/api/accounts/${id}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if (data.success) {
            showToast('配置已保存（部分设置将立即生效）', 'success');
            loadAccounts();
            return true;
        } else {
            showToast(data.error || '保存失败', 'error');
            return false;
        }
    } catch (e) {
        showToast('保存失败: ' + e.message, 'error');
        return false;
    }
}

function setupEventListeners() {
    document.getElementById('btn-refresh').addEventListener('click', loadAccounts);
    
    document.getElementById('btn-add-account').addEventListener('click', () => {
        document.getElementById('scan-add-section').classList.add('hidden');
        document.getElementById('form-add').classList.remove('hidden');
        document.getElementById('form-add').reset();
        modalAdd.classList.remove('hidden');
    });
    
    document.getElementById('btn-scan-in-add').addEventListener('click', startScanInAdd);
    
    document.getElementById('btn-scan-add-cancel').addEventListener('click', () => {
        document.getElementById('scan-add-section').classList.add('hidden');
        document.getElementById('form-add').classList.remove('hidden');
    });
    
    document.getElementById('btn-close-detail').addEventListener('click', () => {
        selectedAccountId = null;
        detailPanel.classList.add('hidden');
        renderAccounts();
    });
    
    const btnEdit = document.getElementById('btn-edit');
    if (btnEdit) {
        btnEdit.addEventListener('click', () => {
            if (!selectedAccountId) return;
            const acc = accounts.find(a => a.id === selectedAccountId);
            if (!acc) return;
            
            const form = document.getElementById('form-edit');
            form.accountId.value = acc.id;
            form.name.value = acc.name || '';
            form.code.value = acc.config?.code || '';
            form.platform.value = acc.config?.platform || 'qq';
            form.farmInterval.value = acc.config?.farmInterval || 1;
            form.friendInterval.value = acc.config?.friendInterval || 2;
            form.harvestDelay.value = acc.config?.harvestDelay || 0;
            form.stealDelay.value = acc.config?.stealDelay || 0;
            form.autoSell.checked = acc.config?.autoSell !== false;
            
            modalEdit.classList.remove('hidden');
        });
    }
    
    document.getElementById('form-add').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = {
            name: form.name.value,
            code: form.code.value,
            platform: form.platform.value
        };
        
        if (await addAccount(formData)) {
            modalAdd.classList.add('hidden');
            form.reset();
        }
    });
    
    document.getElementById('form-edit').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form.accountId.value;
        const config = {
            name: form.name.value,
            code: form.code.value,
            platform: form.platform.value,
            farmInterval: parseInt(form.farmInterval.value),
            friendInterval: parseInt(form.friendInterval.value),
            harvestDelay: parseInt(form.harvestDelay.value),
            stealDelay: parseInt(form.stealDelay.value),
            autoSell: form.autoSell.checked
        };
        
        if (await updateConfig(id, config)) {
            modalEdit.classList.add('hidden');
        }
    });
    
    document.getElementById('form-config').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const id = form.accountId.value;
        
        const seedSelect = document.getElementById('seed-pool-select');
        const selectedSeed = seedSelect ? seedSelect.value : '';
        
        const config = {
            farmInterval: parseInt(form.farmInterval.value),
            friendInterval: parseInt(form.friendInterval.value),
            harvestDelay: parseInt(form.harvestDelay.value),
            stealDelay: parseInt(form.stealDelay.value),
            // 好友互动
            autoFriend: form.autoFriend ? form.autoFriend.checked : false,
            // 自动偷菜
            autoSteal: form.autoSteal ? form.autoSteal.checked : false,
            // 自动领取
            autoClaim: form.autoClaim ? form.autoClaim.checked : false,
            // 自动农作
            autoFarm: form.autoFarm ? form.autoFarm.checked : false,
            autoFertilize: form.autoFertilize ? form.autoFertilize.checked : false,
            autoLandUnlock: form.autoLandUnlock ? form.autoLandUnlock.checked : false,
            autoLandUpgrade: form.autoLandUpgrade ? form.autoLandUpgrade.checked : false,
            autoSell: form.autoSell ? form.autoSell.checked : false,
            autoBuyFertilizer: form.autoBuyFertilizer ? form.autoBuyFertilizer.checked : false,
            autoUseFertilizer: form.autoUseFertilizer ? form.autoUseFertilizer.checked : false,
            selectedSeed: selectedSeed || null
        };
        
        if (await updateConfig(id, config)) {
            document.getElementById('modal-config').classList.add('hidden');
            showToast('配置已保存', 'success');
            loadAccounts();
        }
    });
    
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            modalAdd.classList.add('hidden');
            modalEdit.classList.add('hidden');
            document.getElementById('modal-config').classList.add('hidden');
            document.getElementById('modal-scan').classList.add('hidden');
            document.getElementById('modal-delete').classList.add('hidden');
            document.getElementById('scan-add-section').classList.add('hidden');
            document.getElementById('form-add').classList.remove('hidden');
            if (scanPollTimer) {
                clearInterval(scanPollTimer);
                scanPollTimer = null;
            }
        });
    });
    
    document.getElementById('btn-cancel-scan').addEventListener('click', () => {
        document.getElementById('modal-scan').classList.add('hidden');
        if (scanPollTimer) {
            clearInterval(scanPollTimer);
            scanPollTimer = null;
        }
    });
    
    document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
        if (selectedAccountId) {
            await deleteAccount(selectedAccountId);
            document.getElementById('modal-delete').classList.add('hidden');
        }
    });
    
    document.getElementById('btn-cancel-delete').addEventListener('click', () => {
        document.getElementById('modal-delete').classList.add('hidden');
    });
    
    modalAdd.addEventListener('click', (e) => {
        if (e.target === modalAdd) modalAdd.classList.add('hidden');
    });
    
    modalEdit.addEventListener('click', (e) => {
        if (e.target === modalEdit) modalEdit.classList.add('hidden');
    });
    
    document.getElementById('modal-scan').addEventListener('click', (e) => {
        if (e.target.id === 'modal-scan') document.getElementById('modal-scan').classList.add('hidden');
    });
    
    // 重新登录弹窗事件
    document.getElementById('btn-cancel-relogin').addEventListener('click', closeReloginModal);
    document.getElementById('btn-manual-relogin').addEventListener('click', manualRelogin);
    document.getElementById('btn-scan-relogin').addEventListener('click', startScanRelogin);
    document.getElementById('modal-relogin').addEventListener('click', (e) => {
        if (e.target.id === 'modal-relogin') closeReloginModal();
    });
    
    document.getElementById('modal-delete').addEventListener('click', (e) => {
        if (e.target.id === 'modal-delete') document.getElementById('modal-delete').classList.add('hidden');
    });
}

async function startScan() {
    const modalScan = document.getElementById('modal-scan');
    const scanQrcode = document.getElementById('scan-qrcode');
    const scanLoading = document.getElementById('scan-loading');
    const scanStatus = document.getElementById('scan-status');
    
    modalScan.classList.remove('hidden');
    scanQrcode.classList.add('hidden');
    scanLoading.classList.remove('hidden');
    scanStatus.textContent = '正在获取二维码...';
    
    try {
        const res = await fetch('/api/accounts/scan/start', { method: 'POST' });
        const data = await res.json();
        
        if (!data.success) {
            scanStatus.textContent = '获取二维码失败: ' + (data.error || '未知错误');
            return;
        }
        
        scanLoading.classList.add('hidden');
        scanQrcode.classList.remove('hidden');
        scanQrcode.src = data.qrUrl;
        scanStatus.textContent = '请用 QQ 扫码登录';
        
        pollScanStatus(data.loginCode);
        
    } catch (e) {
        scanStatus.textContent = '错误: ' + e.message;
    }
}

async function pollScanStatus(loginCode) {
    if (scanPollTimer) clearInterval(scanPollTimer);
    
    scanPollTimer = setInterval(async () => {
        try {
            const res = await fetch('/api/accounts/scan/poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginCode })
            });
            const data = await res.json();
            
            if (data.success) {
                if (data.status === 'ok') {
                    clearInterval(scanPollTimer);
                    scanPollTimer = null;
                    
                    const formData = {
                        name: data.name || 'QQ账号',
                        code: data.code,
                        platform: 'qq',
                        farmInterval: 10,
                        friendInterval: 1,
                        autoSell: true
                    };
                    
                    document.getElementById('modal-scan').classList.add('hidden');
                    
                    if (await addAccount(formData)) {
                        showToast('扫码成功，账号已添加', 'success');
                    }
                    return;
                }
            } else {
                clearInterval(scanPollTimer);
                scanPollTimer = null;
                document.getElementById('scan-status').textContent = data.error || '扫码失败';
            }
        } catch (e) {}
    }, 2000);
}

async function startScanInAdd() {
    const scanSection = document.getElementById('scan-add-section');
    const formAdd = document.getElementById('form-add');
    const scanQrcode = document.getElementById('scan-add-qrcode');
    const scanStatus = document.getElementById('scan-add-status');
    
    formAdd.classList.add('hidden');
    scanSection.classList.remove('hidden');
    scanStatus.textContent = '正在获取二维码...';
    
    try {
        const res = await fetch('/api/accounts/scan/start', { method: 'POST' });
        const data = await res.json();
        
        if (!data.success) {
            scanStatus.textContent = '获取二维码失败: ' + (data.error || '未知错误');
            return;
        }
        
        scanQrcode.src = data.qrUrl;
        scanStatus.textContent = '请用 QQ 扫码登录';
        
        pollScanStatusInAdd(data.loginCode);
        
    } catch (e) {
        scanStatus.textContent = '错误: ' + e.message;
    }
}

async function pollScanStatusInAdd(loginCode) {
    if (scanPollTimer) clearInterval(scanPollTimer);
    
    scanPollTimer = setInterval(async () => {
        try {
            const res = await fetch('/api/accounts/scan/poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginCode })
            });
            const data = await res.json();
            
            if (data.success) {
                if (data.status === 'ok') {
                    clearInterval(scanPollTimer);
                    scanPollTimer = null;
                    
                    // 扫码成功，自动保存并启动
                    const formData = {
                        name: data.name || 'QQ账号',
                        code: data.code,
                        platform: 'qq'
                    };
                    
                    const addRes = await fetch('/api/accounts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    const addData = await addRes.json();
                    
                    if (addData.success) {
                        // 自动启动账号
                        await startAccount(addData.id);
                        modalAdd.classList.add('hidden');
                        document.getElementById('form-add').reset();
                        showToast('添加并启动成功', 'success');
                    } else {
                        showToast(addData.error || '添加失败', 'error');
                    }
                    return;
                }
            } else {
                document.getElementById('scan-add-status').textContent = data.error || '扫码失败';
            }
        } catch (e) {}
    }, 2000);
}

function renderAccountLogs(accountId) {
    const logsDiv = document.getElementById('account-logs');
    if (!logsDiv) return;
    
    logsDiv.innerHTML = '';
    
    const logs = accountLogs[accountId] || [];
    for (const log of logs) {
        appendLog(accountId, log.level, log.message, log.timestamp);
    }
}

function appendLog(accountId, level, message, timestamp) {
    const logsDiv = document.getElementById('account-logs');
    if (!logsDiv) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const timeStr = `<span class="log-time">[${time}]</span> `;
    entry.innerHTML = timeStr + message;
    logsDiv.appendChild(entry);
    
    // 限制显示的日志数量，移除旧日志
    while (logsDiv.children.length > MAX_LOGS_PER_ACCOUNT) {
        logsDiv.removeChild(logsDiv.firstChild);
    }
    
    // 只有在自动滚动模式下才滚动
    if (window.autoScrollLogs) {
        logsDiv.scrollTop = logsDiv.scrollHeight;
    }
}

// 切换自动滚动
function toggleAutoScroll() {
    window.autoScrollLogs = !window.autoScrollLogs;
    const btn = document.getElementById('btn-auto-scroll');
    if (btn) {
        btn.textContent = window.autoScrollLogs ? '🔒 自动滚动' : '🔓 取消锁定';
        btn.classList.toggle('active', window.autoScrollLogs);
    }
    if (window.autoScrollLogs) {
        const logsDiv = document.getElementById('account-logs');
        if (logsDiv) logsDiv.scrollTop = logsDiv.scrollHeight;
    }
}

async function deleteAccount(id) {
    try {
        const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('账号已删除', 'success');
            selectedAccountId = null;
            detailPanel.classList.add('hidden');
            loadAccounts();
        } else {
            showToast(data.error || '删除失败', 'error');
        }
    } catch (e) {
        showToast('删除失败: ' + e.message, 'error');
    }
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
