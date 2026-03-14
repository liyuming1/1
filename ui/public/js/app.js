// ============ 农场管理系统 - 前端逻辑 ============

let currentTab = 'accounts';
let selectedSeed = ''; // 当前选中的种子

// 底部导航切换
function initBottomNav() {
    // 底部导航点击
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
    
    // 菜单按钮 - 打开侧边栏
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) {
        btnMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            openSidebar();
        });
    }
    
    // 关闭侧边栏按钮
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    if (btnCloseSidebar) {
        btnCloseSidebar.addEventListener('click', closeSidebar);
    }
    
    // 侧边栏遮罩层点击关闭
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // 侧边栏添加账号按钮
    const btnAddAccountSidebar = document.getElementById('btn-add-account-sidebar');
    if (btnAddAccountSidebar) {
        btnAddAccountSidebar.addEventListener('click', () => {
            closeSidebar();
            document.getElementById('scan-add-section').classList.add('hidden');
            document.getElementById('form-add').classList.remove('hidden');
            document.getElementById('form-add').reset();
            modalAdd.classList.remove('hidden');
        });
    }
    
    // 侧边栏刷新按钮
    const btnRefreshAll = document.getElementById('btn-refresh-all');
    if (btnRefreshAll) {
        btnRefreshAll.addEventListener('click', () => {
            loadAccounts();
            if (selectedAccountId) {
                loadLands(selectedAccountId);
                loadBag(selectedAccountId);
                loadVisitors(selectedAccountId);
                loadFriends(selectedAccountId);
            }
            showToast('已刷新', 'success');
            closeSidebar();
        });
    }
    
    // 添加账号按钮
    const btnAddHeader = document.getElementById('btn-add-account-header');
    if (btnAddHeader) {
        btnAddHeader.addEventListener('click', () => {
            document.getElementById('scan-add-section').classList.add('hidden');
            document.getElementById('form-add').classList.remove('hidden');
            document.getElementById('form-add').reset();
            modalAdd.classList.remove('hidden');
            dropdown.classList.add('hidden');
        });
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
    renderSidebarAccounts();
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
}

function renderSidebarAccounts() {
    const list = document.getElementById('sidebar-accounts-list');
    if (!list) return;
    
    if (!accounts || accounts.length === 0) {
        list.innerHTML = '<div class="text-muted" style="text-align:center;padding:20px;">暂无账号</div>';
        return;
    }
    
    list.innerHTML = accounts.map(acc => {
        const isSelected = acc.id === selectedAccountId;
        const statusText = acc.status === 'running' ? '在线' : acc.status === 'stopped' ? '离线' : '错误';
        const avatarUrl = acc.data?.avatarUrl || (acc.data?.openId ? `https://q1.qlogo.cn/g?b=qq&nk=${acc.data.openId}&s=100` : '');
        
        return `
            <div class="sidebar-account-item ${isSelected ? 'selected' : ''}" data-id="${acc.id}">
                ${avatarUrl 
                    ? `<img class="sidebar-account-avatar" src="${avatarUrl}" alt="头像">` 
                    : `<div class="sidebar-account-avatar-placeholder">?</div>`
                }
                <div class="sidebar-account-info">
                    <div class="sidebar-account-name">${acc.name || acc.id}</div>
                    <div class="sidebar-account-status">
                        <span class="status-dot ${acc.status}"></span>
                        <span>${statusText}</span>
                    </div>
                </div>
                <div class="sidebar-account-actions">
                    ${acc.status === 'running' 
                        ? `<button class="btn-xs btn-danger" onclick="event.stopPropagation(); stopAccount('${acc.id}')">停止</button>`
                        : `<button class="btn-xs btn-success" onclick="event.stopPropagation(); startAccount('${acc.id}')">启动</button>`
                    }
                    <button class="btn-xs btn-warning" onclick="event.stopPropagation(); reloginAccount('${acc.id}')">重登</button>
                    <button class="btn-xs btn-danger" onclick="event.stopPropagation(); deleteAccount('${acc.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
    
    // 点击账号项选中
    list.querySelectorAll('.sidebar-account-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-xs')) return;
            const id = item.dataset.id;
            selectAccount(id);
            renderSidebarAccounts();
        });
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // 根据tab加载对应数据
    if (tabName === 'lands' || tabName === 'bag' || tabName === 'visitors' || tabName === 'friends' || tabName === 'home' || tabName === 'analytics') {
        if (!selectedAccountId) {
            showToast('请先选择账号', 'error');
            return;
        }
        
        if (tabName === 'home') renderHomeTab();
        else if (tabName === 'lands') loadLands(selectedAccountId);
        else if (tabName === 'bag') loadBag(selectedAccountId);
        else if (tabName === 'visitors') loadVisitors(selectedAccountId);
        else if (tabName === 'friends') loadFriends(selectedAccountId);
        else if (tabName === 'analytics') {
            // 设置策略等级为当前账号等级
            const acc = accounts.find(a => a.id === selectedAccountId);
            const levelInput = document.getElementById('strategy-level');
            if (levelInput && acc?.data?.level) {
                levelInput.value = acc.data.level;
            }
            loadAnalytics();
        }
    }
}

function renderHomeTab() {
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) return;
    
    // 渲染账号信息卡片
    const accountCard = document.getElementById('home-account-card');
    if (accountCard) {
        const avatarUrl = acc.data?.avatarUrl || (acc.data?.openId ? `https://q1.qlogo.cn/g?b=qq&nk=${acc.data.openId}&s=100` : '');
        const statusText = acc.status === 'running' ? '在线' : acc.status === 'stopped' ? '离线' : '错误';
        const statusClass = acc.status === 'running' ? 'online' : acc.status === 'error' ? 'error' : 'offline';
        const expProgress = acc.data?.expProgress;
        const expDisplay = expProgress ? `${expProgress.current}/${expProgress.needed}` : (acc.data?.exp || '-');
        
        // 运行时间显示
        let runtimeDisplay = '-';
        if (acc.startTime) {
            const runMs = Date.now() - new Date(acc.startTime).getTime();
            if (runMs > 0) {
                runtimeDisplay = '运行: ' + getRunTime(acc.startTime);
            }
        }
        
        accountCard.innerHTML = `
            <div class="account-row">
                ${avatarUrl ? `<img class="account-avatar" src="${avatarUrl}" alt="头像">` : '<div class="account-avatar-placeholder">?</div>'}
                <span class="account-name">${acc.name || acc.id}</span>
                <span class="account-status ${statusClass}">${statusText}</span>
                <span class="account-runtime">${runtimeDisplay}</span>
            </div>
            <div class="account-row">
                <span>等级: ${acc.data?.level || '-'}</span>
                <span>经验: ${expDisplay}</span>
            </div>
            <div class="account-row">
                <span>金币: ${acc.data?.gold || '-'}</span>
                <span>点券: ${acc.data?.voucher || 0}</span>
                <span>金豆: ${acc.data?.beans || 0}</span>
                <span>GID: ${acc.data?.gid || '-'}</span>
            </div>
        `;
    }
    
    // 渲染统计
    const homeStats = document.getElementById('home-stats');
    if (homeStats) {
        const stats = acc.stats || {};
        homeStats.innerHTML = `
            <div class="stats-grid">
                <div class="stats-item"><span class="stats-icon">🎯</span><span class="stats-value">${stats.harvestCount || 0}</span><span class="stats-label">收获</span></div>
                <div class="stats-item"><span class="stats-icon">🫳</span><span class="stats-value">${stats.stealCount || 0}</span><span class="stats-label">偷菜</span></div>
                <div class="stats-item"><span class="stats-icon">💰</span><span class="stats-value">${stats.sellGold || 0}</span><span class="stats-label">售金</span></div>
                <div class="stats-item"><span class="stats-icon">💧</span><span class="stats-value">${(stats.helpWater || 0) + (stats.selfWater || 0)}</span><span class="stats-label">浇水</span></div>
                <div class="stats-item"><span class="stats-icon">🌿</span><span class="stats-value">${(stats.helpWeed || 0) + (stats.selfWeed || 0)}</span><span class="stats-label">除草</span></div>
                <div class="stats-item"><span class="stats-icon">🐛</span><span class="stats-value">${(stats.helpPest || 0) + (stats.selfPest || 0)}</span><span class="stats-label">除虫</span></div>
                <div class="stats-item"><span class="stats-icon">📈</span><span class="stats-value">${stats.expGained || 0}</span><span class="stats-label">获经验</span></div>
            </div>
        `;
    }
    
    // 渲染日志
    renderHomeLogs();
}

function renderHomeLogs() {
    const logsDiv = document.getElementById('home-logs');
    if (!logsDiv) return;
    
    const logs = accountLogs[selectedAccountId] || [];
    
    if (logs.length === 0) {
        logsDiv.innerHTML = '<div class="log-entry" style="color:#666;">暂无日志</div>';
        return;
    }
    
    logsDiv.innerHTML = logs.map(log => {
        const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
        return `<div class="log-entry log-${log.level || 'info'}"><span class="log-time">[${time}]</span> ${log.message}</div>`;
    }).join('');
    
    // 自动滚动到底部（仅当用户已在底部时）
    const wasAtBottom = logsDiv.scrollHeight - logsDiv.scrollTop - logsDiv.clientHeight < 50;
    if (wasAtBottom) {
        logsDiv.scrollTop = logsDiv.scrollHeight;
    }
}

const PHASE_NAMES = ['未知', '种子', '发芽', '小叶', '大叶', '开花', '成熟', '枯死'];

// 植物图片映射（植物名称 -> {seed_id, crop_num}）
const PLANT_IMAGE_MAP = {
    '白萝卜': {id: 29999, crop: 2}, '草莓': {id: 20001, crop: 1}, '胡萝卜': {id: 20003, crop: 3}, '玉米': {id: 20004, crop: 4},
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

// 获取植物图片URL
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

function getRelativeTime(timestamp) {
    if (!timestamp) return '-';
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    if (seconds < 60) return seconds + '秒前';
    if (seconds < 3600) return Math.floor(seconds / 60) + '分钟前';
    if (seconds < 86400) return Math.floor(seconds / 3600) + '小时前';
    if (seconds < 604800) return Math.floor(seconds / 86400) + '天前';
    return new Date(timestamp * 1000).toLocaleDateString();
}

let socket = null;
let accounts = [];
let selectedAccountId = null;
let wsConnected = false;
let scanPollTimer = null;
let accountLogs = {};
let currentLandDetailId = null;
let landDetailTimer = null;
let currentNotStealPlants = [];

// ============ DOM 元素 ============
let connectionStatus = document.getElementById('connection-status');
let accountsGrid = document.getElementById('accounts-grid');
let detailPanel = document.getElementById('detail-panel');
let detailTitle = document.getElementById('detail-title');
let detailStats = document.getElementById('detail-stats');
let landsCount = document.getElementById('lands-count');
let landsGrid = document.getElementById('lands-grid');
const modalAdd = document.getElementById('modal-add');
const modalEdit = document.getElementById('modal-edit');
const toast = document.getElementById('toast');
let landsDataCache = null;
const landCells = {};  // 存储土地单元格的DOM引用
let lastBagFetchAt = 0;
const BAG_FETCH_INTERVAL = 2500;
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
    initBottomNav();
    setInterval(updateCountdowns, 1000);
}

function updateCountdowns() {
    // 更新土地成熟倒计时
    if (landsDataCache) {
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
    
    // 更新主页运行时间
    if (currentTab === 'home') {
        const homeCard = document.getElementById('home-account-card');
        if (homeCard && selectedAccountId) {
            const acc = accounts.find(a => a.id === selectedAccountId);
            if (acc && acc.startTime && acc.status === 'running') {
                const timeEl = homeCard.querySelector('.account-runtime');
                if (timeEl) {
                    timeEl.textContent = '运行: ' + getRunTime(acc.startTime);
                }
            }
        }
    }
}

function toggleSeedDropdown() {
    const dropdown = document.getElementById('seedSelectDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function selectSeed(name) {
    selectedSeed = name;
    const wrapper = document.getElementById('seedSelectWrapper');
    const valueEl = document.getElementById('seedSelectValue');
    const dropdown = document.getElementById('seedSelectDropdown');
    if (wrapper && valueEl) {
        const imgUrl = getPlantImageUrl(name);
        const img = imgUrl ? `<img src="${imgUrl}" class="plant-icon-sm">` : '🌱';
        valueEl.innerHTML = `${img} <span>${name}</span> ▼`;
    }
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
}

function renderNotStealTags(plants) {
    const container = document.getElementById('notStealTags');
    if (!container) return;
    
    container.innerHTML = plants.map(name => 
        `<span class="not-steal-tag">${name}<span class="not-steal-remove" data-name="${name}">×</span></span>`
    ).join('');
    
    // 添加删除事件
    container.querySelectorAll('.not-steal-remove').forEach(btn => {
        btn.onclick = function() {
            const name = this.dataset.name;
            const idx = plants.indexOf(name);
            if (idx > -1) {
                plants.splice(idx, 1);
                renderNotStealTags(plants);
            }
        };
    });
}

function updateBagSeedGroupVisibility(strategy) {
    const bagSeedGroup = document.getElementById('bag-seed-group');
    if (bagSeedGroup) {
        bagSeedGroup.style.display = (strategy === 'bag_priority') ? 'block' : 'none';
    }
    const preferredSeedGroup = document.getElementById('preferred-seed-group');
    if (preferredSeedGroup) {
        preferredSeedGroup.style.display = (strategy === 'preferred') ? 'block' : 'none';
    }
}

let preferredSeedsCache = [];

async function loadPreferredSeedOptions(accountId) {
    const select = document.getElementById('preferredSeedId');
    if (!select) return;
    
    // 如果已经有缓存且账号未变，直接使用
    if (preferredSeedsCache.length > 0) {
        renderPreferredSeedOptions(select);
        return;
    }
    
    try {
        const res = await fetch(`/api/farm/seeds?accountId=${accountId}`);
        const data = await res.json();
        
        if (data.success && data.data) {
            preferredSeedsCache = data.data || [];
            renderPreferredSeedOptions(select);
        }
    } catch (e) {
        console.error('加载种子列表失败:', e);
    }
}

function renderPreferredSeedOptions(select) {
    if (!select) return;
    
    select.innerHTML = '<option value="0">自动选择</option>';
    
    preferredSeedsCache.forEach(seed => {
        const levelLabel = seed.requiredLevel >= 200 ? '活动' : `${seed.requiredLevel}级`;
        const option = document.createElement('option');
        option.value = seed.seedId;
        option.textContent = `${levelLabel} ${seed.name} (${seed.price}金)`;
        select.appendChild(option);
    });
}

async function loadRankingAndSeeds(acc) {
    const level = acc.data?.level || 1;
    const landsData = acc.lands;
    const lands = Array.isArray(landsData) ? landsData.filter(l => l.unlocked).length : (landsData?.lands ? landsData.lands.filter(l => l.unlocked).length : 18);
    
    try {
        // 加载不偷植物列表
        const notStealList = document.getElementById('notStealList');
        const notStealSummary = document.getElementById('notStealSummary');
        const notStealCount = document.getElementById('notStealCount');
        const notStealEdit = document.getElementById('notStealEdit');
        currentNotStealPlants = acc.config?.notStealPlants || [];
        
        // 更新显示数量
        notStealCount.textContent = `已选${currentNotStealPlants.length}个`;
        
        // 点击编辑显示列表
        notStealEdit.onclick = function() {
            notStealSummary.classList.add('hidden');
            notStealList.classList.remove('hidden');
        };
        
        // 获取所有植物列表
        try {
            const plantsRes = await fetch('/api/plants');
            const plantsData = await plantsRes.json();
            const allPlants = plantsData.plants || [];
            
            // 渲染复选框列表
            notStealList.innerHTML = allPlants.map(name => {
                const isChecked = currentNotStealPlants.includes(name) ? 'checked' : '';
                return `<label class="not-steal-item"><input type="checkbox" name="notStealPlant" value="${name}" ${isChecked}>${name}</label>`;
            }).join('') + '<a href="javascript:void(0)" class="not-steal-done" id="notStealDone">[完成]</a>';
            
            // 绑定完成按钮事件
            document.getElementById('notStealDone').onclick = function() {
                const checked = Array.from(notStealList.querySelectorAll('input[name="notStealPlant"]:checked')).map(cb => cb.value);
                currentNotStealPlants = checked;
                notStealCount.textContent = `已选${currentNotStealPlants.length}个`;
                notStealList.classList.add('hidden');
                notStealSummary.classList.remove('hidden');
            };
        } catch (e) {
            console.error('加载植物列表失败:', e);
        }
        
        // 加载背包种子优先级
        await loadBagSeedPriority(acc);
    } catch (e) {
        console.error('加载配置数据失败:', e);
    }
}

async function loadBagSeedPriority(acc) {
    const bagSeedGroup = document.getElementById('bag-seed-group');
    const bagSeedList = document.getElementById('bag-seed-list');
    if (!bagSeedGroup || !bagSeedList) return;
    
    const strategy = acc.config?.plantingStrategy || 'preferred';
    bagSeedGroup.style.display = (strategy === 'bag_priority') ? 'block' : 'none';
    
    if (strategy !== 'bag_priority') return;
    
    await renderBagSeedList(acc);
}

async function renderBagSeedList(acc) {
    const bagSeedList = document.getElementById('bag-seed-list');
    if (!bagSeedList) return;
    
    try {
        const res = await fetch(`/api/bag/seeds?accountId=${acc.id}`);
        const data = await res.json();
        
        const bagSeeds = data.data || [];
        const priority = acc.config?.bagSeedPriority || [];
        
        // 账号未运行提示
        if (bagSeeds.length === 0) {
            bagSeedList.innerHTML = '<p style="color:#999;text-align:center;padding:10px;">请先启动账号加载背包数据</p>';
            return;
        }
        
        // 按优先级排序
        const sortedSeeds = [...bagSeeds].sort((a, b) => {
            const idxA = priority.indexOf(a.seedId);
            const idxB = priority.indexOf(b.seedId);
            if (idxA === -1 && idxB === -1) return b.requiredLevel - a.requiredLevel;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });
        
        bagSeedList.innerHTML = sortedSeeds.map((seed, idx) => {
            const pIdx = priority.indexOf(seed.seedId);
            const levelLabel = seed.requiredLevel >= 200 ? '活动' : `${seed.requiredLevel}级`;
            const levelClass = seed.requiredLevel >= 200 ? 'activity' : '';
            return `
                <div class="bag-seed-item" data-seed-id="${seed.seedId}" draggable="true">
                    <span class="bag-seed-priority">${pIdx >= 0 ? pIdx + 1 : '-'}</span>
                    ${seed.image ? `<img class="bag-seed-icon" src="${seed.image}" alt="${seed.name}">` : '<span>🌱</span>'}
                    <span class="bag-seed-name">${seed.name}</span>
                    <span class="bag-seed-level ${levelClass}">${levelLabel}</span>
                    <span class="bag-seed-count">x${seed.count}</span>
                </div>
            `;
        }).join('');
        
        // 保存当前账号ID供刷新使用
        window.currentBagSeedAccountId = acc.id;
        window.currentBagSeedPriority = priority;
        
        // 添加拖拽排序
        addDragSortToBagSeeds(bagSeedList);
        
    } catch (e) {
        console.error('加载背包种子失败:', e);
        bagSeedList.innerHTML = '<p style="color:#999;text-align:center;padding:10px;">加载失败</p>';
    }
}

async function refreshBagSeeds() {
    const accountId = window.currentBagSeedAccountId || selectedAccountId;
    if (!accountId) return;
    
    const acc = accounts.find(a => a.id === accountId);
    if (acc) {
        await renderBagSeedList(acc);
    }
}

function resetBagSeedPriority() {
    const bagSeedList = document.getElementById('bag-seed-list');
    if (!bagSeedList) return;
    
    window.currentBagSeedPriority = [];
    
    // 重新渲染列表（按等级排序）
    const items = bagSeedList.querySelectorAll('.bag-seed-item');
    items.forEach((item, idx) => {
        item.querySelector('.bag-seed-priority').textContent = '-';
    });
}

function addDragSortToBagSeeds(container) {
    let draggedItem = null;
    
    container.querySelectorAll('.bag-seed-item').forEach(item => {
        item.addEventListener('dragstart', e => {
            draggedItem = item;
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        item.addEventListener('drop', e => {
            e.preventDefault();
            if (draggedItem && draggedItem !== item) {
                const allItems = [...container.querySelectorAll('.bag-seed-item')];
                const fromIdx = allItems.indexOf(draggedItem);
                const toIdx = allItems.indexOf(item);
                
                if (fromIdx < toIdx) {
                    item.after(draggedItem);
                } else {
                    item.before(draggedItem);
                }
                
                // 更新优先级数字
                updateBagSeedPriorityNumbers(container);
            }
        });
    });
}

function updateBagSeedPriorityNumbers(container) {
    container.querySelectorAll('.bag-seed-item').forEach((item, idx) => {
        item.querySelector('.bag-seed-priority').textContent = idx + 1;
    });
}

function getBagSeedPriorityFromUI() {
    const container = document.getElementById('bag-seed-list');
    if (!container) return [];
    
    const items = container.querySelectorAll('.bag-seed-item');
    return Array.from(items).map(item => parseInt(item.dataset.seedId));
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
                if (currentTab === 'home') renderHomeTab();
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
                if (currentTab === 'home') renderHomeTab();
                break;
            
            case 'account_data':
                const accData = accounts.find(a => a.id === data.accountId);
                if (accData) {
                    accData.data = data.data;
                }
                if (currentTab === 'home') renderHomeTab();
                break;

            case 'account_stats':
                const accStats = accounts.find(a => a.id === data.accountId);
                if (accStats) {
                    accStats.stats = data.stats;
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
    const connectionStatus = document.getElementById('connection-status');
    if (!connectionStatus) return;
    
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
        
        // 没有选中账号时，自动选择第一个
        if (!selectedAccountId && accounts.length > 0) {
            selectAccount(accounts[0].id);
        }
    } catch (e) {
        showToast('加载账号失败', 'error');
    }
}

function selectAccount(id) {
    selectedAccountId = id;
    // 清空种子缓存，切换账号时重新加载
    preferredSeedsCache = [];
    updateDetailPanel(id);
    // 加载当前Tab数据
    if (currentTab === 'lands') loadLands(id);
    else if (currentTab === 'bag') loadBag(id);
    else if (currentTab === 'visitors') loadVisitors(id);
    else if (currentTab === 'friends') loadFriends(id);
}

function updateDetailPanel(id) {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    
    selectedAccountId = id;
    
    // 清空土地单元格缓存，切换账号时重新创建
    for (const key in landCells) {
        delete landCells[key];
    }
    const landsGrid = document.getElementById('lands-grid');
    if (landsGrid) landsGrid.innerHTML = '';
    
    renderAccountLogs(id);
    
    // 切换到当前Tab后刷新数据（只对运行中的账号）
    if (acc.status === 'running') {
        lastBagFetchAt = 0;
        loadBag(id);
        loadVisitors(id);
        loadFriends(id);
    }
    
    // 更新统计显示
    const detailStats = document.getElementById('detail-stats');
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
    } else if (landsGrid) {
        landsGrid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">暂无土地数据</p>';
    }
}

async function loadLands(accountId) {
    const targetId = accountId || selectedAccountId;
    if (!targetId) return;
    
    try {
        const res = await fetch(`/api/accounts/${targetId}/lands`);
        const data = await res.json();
        
        if (data.success && data.data) {
            renderLands(data.data);
        }
    } catch (e) {
        console.error('加载土地失败:', e);
    }
}

async function loadBag(accountId) {
    const now = Date.now();
    if (now - lastBagFetchAt < BAG_FETCH_INTERVAL) {
        return;
    }
    lastBagFetchAt = now;
    
    const bagGrid = document.getElementById('bag-grid');
    const bagCount = document.getElementById('bag-count');
    if (!bagGrid) return;
    
    try {
        const res = await fetch(`/api/bag?accountId=${accountId}`);
        const data = await res.json();
        
        if (!data.ok || !data.data) {
            bagGrid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">获取失败</p>';
            return;
        }
        
        const items = data.data.items || [];
        
        // 过滤掉基础物品（金币、点券、经验、化肥、土地升级）
        const hiddenIds = new Set([1, 1001, 1002, 1101, 1011, 1012, 3001, 3002]);
        const filteredItems = items.filter(it => !hiddenIds.has(Number(it.id || 0)));
        
        if (bagCount) {
            bagCount.textContent = `(${filteredItems.length}种物品)`;
        }
        
        if (filteredItems.length === 0) {
            bagGrid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">背包为空</p>';
            return;
        }
        
        bagGrid.innerHTML = '';
        for (const item of filteredItems) {
            const cell = document.createElement('div');
            cell.className = 'bag-item';
            
            // 使用首字符作为备用图标
            const firstChar = (item.name || '物').charAt(0);
            let iconHtml = '';
            
            // 使用后端返回的image字段
            if (item.image) {
                iconHtml = `<img src="${item.image}" class="bag-item-img" alt="${item.name}" onerror="this.style.display='none';this.parentElement.querySelector('.bag-item-fallback').style.display='flex'">
                    <div class="bag-item-fallback">${firstChar}</div>`;
            } else {
                iconHtml = `<div class="bag-item-fallback" style="display:flex">${firstChar}</div>`;
            }
            
            cell.innerHTML = `
                <div class="bag-item-id">#${item.id}</div>
                <div class="bag-item-icon">${iconHtml}</div>
                <div class="bag-item-name" title="${item.name || `物品${item.id}`}">${item.name || `物品${item.id}`}</div>
                <div class="bag-item-info">
                    ${item.uid > 0 ? 'UID:' + item.uid : ''}
                    ${item.level > 0 ? 'Lv' + item.level : ''}
                    <span class="item-type">类型:${item.itemType || 0}</span>
                </div>
                <div class="bag-item-info2">
                    ${item.price > 0 ? `<span class="item-price ${item.priceId === 1005 ? 'beans' : item.priceId === 1002 ? 'voucher' : ''}">${item.price}${item.priceUnit || '金'}</span>` : ''}
                    <span class="bag-item-count">${item.hoursText || 'x' + item.count}</span>
                </div>
            `;
            bagGrid.appendChild(cell);
        }
    } catch (e) {
        bagGrid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">加载失败</p>';
    }
}

async function loadAnalytics() {
    const listEl = document.getElementById('analytics-list');
    if (!listEl) return;
    
    const sort = document.getElementById('analytics-sort')?.value || 'exp';
    const strategyLevel = document.getElementById('strategy-level')?.value || 1;
    
    listEl.innerHTML = '<p style="color:#999;text-align:center;">加载中...</p>';
    
    try {
        const res = await fetch(`/api/analytics?sort=${sort}`);
        const data = await res.json();
        
        if (!data.ok || !data.data || data.data.length === 0) {
            listEl.innerHTML = '<p style="color:#999;text-align:center;">暂无数据</p>';
            return;
        }
        
        const allData = data.data;
        
        // 计算策略推荐
        const level = parseInt(strategyLevel) || 1;
        const filteredByLevel = allData.filter(item => !item.level || item.level <= level);
        const availableCount = filteredByLevel.length;
        
        // 更新策略卡片
        updateStrategyCard('exp', 'expPerHour', filteredByLevel, level);
        updateStrategyCard('profit', 'profitPerHour', filteredByLevel, level);
        updateStrategyCard('fert-exp', 'normalFertilizerExpPerHour', filteredByLevel, level);
        updateStrategyCard('fert-profit', 'normalFertilizerProfitPerHour', filteredByLevel, level);
        
        // 更新提示
        const tipEl = document.getElementById('strategy-tip');
        if (tipEl) {
            tipEl.textContent = `可种植 ${availableCount}/${allData.length} 种作物`;
        }
        
        // 渲染列表
        listEl.innerHTML = `
            <table class="analytics-table">
                <thead>
                    <tr>
                        <th>作物</th>
                        <th>等级</th>
                        <th>生长时间</th>
                        <th>经验/时</th>
                        <th>利润/时</th>
                        <th>普肥经验/时</th>
                        <th>普肥利润/时</th>
                    </tr>
                </thead>
                <tbody>
                    ${allData.map((item, idx) => `
                        <tr>
                            <td>
                                <div class="analytics-plant-name">
                                    <span class="plant-icon">${item.image ? `<img src="${item.image}" alt="${item.name}">` : '🌱'}</span>
                                    <span>${item.name}</span>
                                </div>
                            </td>
                            <td>Lv${item.level || '-'}</td>
                            <td>${item.growTimeStr || '-'}</td>
                            <td class="exp">${item.expPerHour || '-'}</td>
                            <td class="profit">${item.profitPerHour || '-'}</td>
                            <td class="fert-exp">${item.normalFertilizerExpPerHour || '-'}</td>
                            <td class="fert-profit">${item.normalFertilizerProfitPerHour || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (e) {
        listEl.innerHTML = '<p style="color:#999;text-align:center;">加载失败</p>';
    }
}

function updateStrategyCard(elementId, metric, data, level) {
    const el = document.getElementById(`strategy-${elementId}`);
    if (!el) return;
    
    if (data.length === 0) {
        el.innerHTML = '<div class="strategy-empty">暂无可种植作物</div>';
        return;
    }
    
    // 找出该指标最高的作物
    const sorted = [...data].sort((a, b) => {
        const av = Number(a[metric]) || 0;
        const bv = Number(b[metric]) || 0;
        return bv - av;
    });
    const best = sorted[0];
    
    if (!best || !best[metric]) {
        el.innerHTML = '<div class="strategy-empty">暂无数据</div>';
        return;
    }
    
    const unit = metric.includes('profit') ? '金币' : 'EXP';
    el.innerHTML = `
        <div class="strategy-plant-info">
            <div class="strategy-plant-icon">${best.image ? `<img src="${best.image}" alt="${best.name}">` : '🌱'}</div>
            <div class="strategy-plant-name">${best.name}</div>
            <div class="strategy-plant-level">Lv${best.level || '-'}</div>
        </div>
        <div class="strategy-plant-value">
            <span class="value-label">${unit}/时</span>
            <span class="value-num">${best[metric]}</span>
        </div>
    `;
}

async function loadVisitors(accountId) {
    const visitorsList = document.getElementById('visitors-list');
    if (!visitorsList) return;
     
    const targetId = accountId || selectedAccountId;
    if (!targetId) {
        visitorsList.innerHTML = '<p style="color:#999;text-align:center;">请选择一个账号</p>';
        return;
    }
    
    try {
        const res = await fetch(`/api/interact-records?accountId=${targetId}`);
        const data = await res.json();
        
        if (!data.success || !data.data || data.data.length === 0) {
            visitorsList.innerHTML = '<p style="color:#999;text-align:center;">暂无访客记录</p>';
            return;
        }
        
        window.visitorsCache = data.data;
        
        renderVisitorsList(window.visitorsCache);
    } catch (e) {
        visitorsList.innerHTML = '<p style="color:#999;text-align:center;">加载失败</p>';
    }
}

function renderVisitorsList(records) {
    const visitorsList = document.getElementById('visitors-list');
    if (!visitorsList) return;
    
    let filtered = records;
    const activeFilter = document.querySelector('.filter-btn.active');
    const filterType = activeFilter ? activeFilter.dataset.filter : 'all';
    
    if (filterType !== 'all') {
        filtered = records.filter(r => String(r.actionType) === filterType);
    }
    
    if (filtered.length === 0) {
        visitorsList.innerHTML = '<p style="color:#999;text-align:center;">暂无访客记录</p>';
        return;
    }
    
    const fromTypeMap = { 1: '应用', 2: '空间', 3: 'QQ游戏' };
    
    visitorsList.innerHTML = filtered.slice(0, 100).map(r => {
        const actionClass = r.actionType === 1 ? 'steal' : r.actionType === 2 ? 'help' : r.actionType === 3 ? 'bad' : '';
        const time = r.serverTimeSec ? new Date(r.serverTimeSec * 1000).toLocaleString() : '-';
        const avatar = r.avatarUrl || (r.visitorGid ? `https://q1.qlogo.cn/g?b=qq&nk=${r.visitorGid}&s=100` : '');
        
        let actionText = r.actionLabel || '互动';
        if (r.cropCount > 0) {
            actionText += ` ${r.cropName || '作物'}x${r.cropCount}`;
        } else if (r.times > 1) {
            actionText += ` (${r.times}次)`;
        }
        if (r.landId > 0) actionText += ` 地块${r.landId}`;
        
        const fromTypeText = r.fromType ? fromTypeMap[r.fromType] || `来源${r.fromType}` : '';
        
        return `
            <div class="visitor-item">
                ${avatar ? `<img class="visitor-avatar" src="${avatar}" alt="头像" onerror="this.style.display='none'">` : '<div class="visitor-avatar"></div>'}
                <div class="visitor-info">
                    <div class="visitor-header">
                        <span class="visitor-name">${r.nick || `GID:${r.visitorGid}`}</span>
                        ${r.level ? `<span class="visitor-level">Lv.${r.level}</span>` : ''}
                        <span class="visitor-gid">${r.visitorGid}</span>
                    </div>
                    <div class="visitor-action-row">
                        <span class="visitor-action ${actionClass}">${actionText}</span>
                        ${fromTypeText ? `<span class="visitor-from">来自:${fromTypeText}</span>` : ''}
                    </div>
                    <div class="visitor-time-row">
                        <span class="visitor-time">${time}</span>
                        <button class="visitor-block-btn" onclick="addToBlacklist('${r.visitorGid}')">拉黑</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterVisitors(filterType) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });
    
    if (window.visitorsCache) {
        renderVisitorsList(window.visitorsCache);
    }
}

async function loadFriends(accountId) {
    const friendsList = document.getElementById('friends-list');
    if (!friendsList) return;
    
    const targetId = accountId || selectedAccountId;
    if (!targetId) {
        friendsList.innerHTML = '<p style="color:#999;text-align:center;">请选择一个账号</p>';
        return;
    }
    
    try {
        const res = await fetch(`/api/friends?accountId=${targetId}`);
        const data = await res.json();
        
        if (!data.success || !data.data || data.data.length === 0) {
            friendsList.innerHTML = '<p style="color:#999;text-align:center;">暂无好友</p>';
            return;
        }
        
        window.friendsCache = data.data;
        
        const blacklistRes = await fetch(`/api/blacklist?accountId=${targetId}`);
        const blacklistData = await blacklistRes.json();
        window.blacklistCache = blacklistData.data || [];
        
        renderFriendsList(window.friendsCache, window.blacklistCache);
    } catch (e) {
        friendsList.innerHTML = '<p style="color:#999;text-align:center;">加载失败</p>';
    }
}

let currentFriendFilter = 'all';
let expandedFriendGid = null;

function renderFriendsList(friends, blacklist = []) {
    const friendsList = document.getElementById('friends-list');
    if (!friendsList) return;
    
    const blacklistGids = new Set(blacklist.map(b => String(b.gid)));
    
    let filtered = friends;
    let filteredBlacklist = [];
    const searchInput = document.getElementById('friend-search');
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    if (currentFriendFilter === 'blacklist') {
        filtered = [];
        filteredBlacklist = blacklist.filter(f => 
            !keyword || 
            (f.nick && f.nick.toLowerCase().includes(keyword)) || 
            String(f.gid).includes(keyword)
        );
    } else if (keyword) {
        filtered = friends.filter(f => 
            (f.name && f.name.toLowerCase().includes(keyword)) || 
            String(f.gid).includes(keyword)
        );
        filteredBlacklist = [];
    } else {
        filtered = friends.filter(f => !blacklistGids.has(String(f.gid)));
        filteredBlacklist = blacklist;
    }
    
    let html = '';
    
    html += `<div class="friend-filter-bar">
        <button class="friend-filter-btn ${currentFriendFilter === 'all' ? 'active' : ''}" onclick="switchFriendFilter('all')">好友列表 (${friends.length - blacklist.length})</button>
        <button class="friend-filter-btn ${currentFriendFilter === 'blacklist' ? 'active' : ''}" onclick="switchFriendFilter('blacklist')">黑名单 (${blacklist.length})</button>
    </div>`;
    
    if (currentFriendFilter === 'all' && filtered.length === 0) {
        html += '<p style="color:#999;text-align:center;">暂无好友</p>';
    } else if (currentFriendFilter === 'blacklist' && filteredBlacklist.length === 0) {
        html += '<p style="color:#999;text-align:center;">黑名单为空</p>';
    } else if (currentFriendFilter === 'all') {
        // 按等级降序排序
        filtered.sort((a, b) => (b.level || 0) - (a.level || 0));
        html += filtered.slice(0, 100).map(f => {
            const avatar = f.avatarUrl || (f.gid ? `https://q1.qlogo.cn/g?b=qq&nk=${f.gid}&s=100` : '');
            let statusHtml = '';
            if (f.plant) {
                const parts = [];
                if (f.plant.stealNum > 0) {
                    const plantName = f.plant.stealPlantName ? `(${f.plant.stealPlantName})` : '';
                    parts.push(`<span class="steal">可偷${f.plant.stealNum}${plantName}</span>`);
                }
                if (f.plant.dryNum > 0) parts.push(`<span class="help">缺水${f.plant.dryNum}</span>`);
                if (f.plant.weedNum > 0) parts.push(`<span class="help">有草${f.plant.weedNum}</span>`);
                if (f.plant.insectNum > 0) parts.push(`<span class="help">有虫${f.plant.insectNum}</span>`);
                statusHtml = parts.length > 0 ? parts.join(' ') : '<span class="empty">无操作</span>';
            } else {
                statusHtml = '<span class="empty">无数据</span>';
            }
            
            return `
                <div class="friend-item" onclick="openFriendLandModal('${f.gid}')">
                    ${avatar ? `<img class="friend-avatar" src="${avatar}" alt="头像" onerror="this.style.display='none'">` : '<div class="friend-avatar"></div>'}
                    <div class="friend-info">
                        <div class="friend-header">
                            <span class="friend-name">${f.name}</span>
                            ${f.level ? `<span class="friend-level">Lv.${f.level}</span>` : ''}
                            <span class="friend-gid">${f.gid}</span>
                        </div>
                        <div class="friend-status">${statusHtml}</div>
                        <div class="friend-actions">
                            <button class="friend-action-btn steal" onclick="event.stopPropagation(); operateFriend('${f.gid}', 'steal')">偷取</button>
                            <button class="friend-action-btn water" onclick="event.stopPropagation(); operateFriend('${f.gid}', 'water')">浇水</button>
                            <button class="friend-action-btn weed" onclick="event.stopPropagation(); operateFriend('${f.gid}', 'weed')">除草</button>
                            <button class="friend-action-btn bug" onclick="event.stopPropagation(); operateFriend('${f.gid}', 'bug')">除虫</button>
                            <button class="friend-action-btn bad" onclick="event.stopPropagation(); operateFriend('${f.gid}', 'bad')">捣乱</button>
                            <button class="friend-action-btn blacklist" onclick="event.stopPropagation(); addToBlacklist('${f.gid}')">拉黑</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else if (currentFriendFilter === 'blacklist') {
        html += filteredBlacklist.slice(0, 100).map(f => {
            return `
                <div class="friend-item blacklist-item">
                    <div class="friend-avatar"></div>
                    <div class="friend-info">
                        <div class="friend-name">${f.nick || 'GID:' + f.gid}</div>
                        <div class="friend-status"><span class="empty">黑名单</span></div>
                        <div class="friend-actions">
                            <button class="friend-action-btn remove-blacklist" onclick="removeFromBlacklist('${f.gid}')">移出黑名单</button>
                        </div>
                    </div>
                    <div class="friend-gid">${f.gid}</div>
                </div>
            `;
        }).join('');
    }
    
    friendsList.innerHTML = html;
}

function switchFriendFilter(filter) {
    currentFriendFilter = filter;
    renderFriendsList(window.friendsCache, window.blacklistCache);
}

async function addToBlacklist(gid) {
    if (!selectedAccountId) return;
    
    try {
        const res = await fetch('/api/blacklist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: selectedAccountId, gid: gid })
        });
        const data = await res.json();
        if (data.success) {
            showToast('已加入黑名单', 'success');
            loadFriends(selectedAccountId);
        } else {
            showToast(data.message || '操作失败', 'error');
        }
    } catch (e) {
        showToast('操作失败: ' + e.message, 'error');
    }
}

async function removeFromBlacklist(gid) {
    if (!selectedAccountId) return;
    
    try {
        const res = await fetch(`/api/blacklist/${gid}?accountId=${selectedAccountId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            showToast('已从黑名单移除', 'success');
            loadFriends(selectedAccountId);
        } else {
            showToast(data.message || '操作失败', 'error');
        }
    } catch (e) {
        showToast('操作失败: ' + e.message, 'error');
    }
}

async function openFriendLandModal(gid) {
    const modal = document.getElementById('friend-land-modal');
    const landsContainer = document.getElementById('modal-friend-lands');
    const nameEl = document.getElementById('modal-friend-name');
    
    const friend = window.friendsCache?.find(f => String(f.gid) === String(gid));
    nameEl.textContent = friend?.name ? `${friend.name} 的土地` : '好友土地';
    
    modal.style.display = 'flex';
    landsContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">加载中...</p>';
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeFriendLandModal();
        }
    };
    
    try {
        const res = await fetch(`/api/friend/${gid}/lands?accountId=${selectedAccountId}`);
        const data = await res.json();
        
        if (!data.success || !data.data) {
            landsContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">无土地数据</p>';
            return;
        }
        
        const lands = data.data.lands || [];
        
        // 生成土地单元格，和土地标签页一样的逻辑
        let cellsHtml = '';
        for (let i = 1; i <= 24; i++) {
            const l = lands.find(item => item && item.id === i);
            let cellClass = 'land-cell';
            if (!l || !l.unlocked) {
                cellClass += ' locked';
            } else if (!l.plant) {
                cellClass += ' empty';
            } else {
                cellClass += ` ${l.status || 'growing'}`;
            }
            const landData = {
                id: l?.id || i,
                unlocked: l?.unlocked,
                level: l?.level || 1,
                plant: l?.plant || null,
                status: l?.status || 'growing'
            };
            cellsHtml += `<div class="${cellClass}" data-land-id="${i}">${generateLandCellHtml(landData)}</div>`;
        }
        
        landsContainer.innerHTML = `<div class="friend-lands-grid">${cellsHtml}</div>`;
    } catch (e) {
        landsContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">加载失败</p>';
    }
}

function closeFriendLandModal() {
    const modal = document.getElementById('friend-land-modal');
    modal.style.display = 'none';
}

async function toggleFriendLands(gid) {
    console.log('[好友] 展开土地, gid:', gid, 'selectedAccountId:', selectedAccountId);
    
    // 如果点击的是同一个好友，则收起
    if (expandedFriendGid === gid) {
        expandedFriendGid = null;
        renderFriendsList(window.friendsCache, window.blacklistCache);
        return;
    }
    
    expandedFriendGid = gid;
    
    // 重新渲染好友列表以显示展开状态
    renderFriendsList(window.friendsCache, window.blacklistCache);
    
    // 异步加载土地数据
    const landsContainer = document.getElementById(`friend-lands-${gid}`);
    if (!landsContainer) {
        console.log('[好友] landsContainer not found, gid:', gid);
        return;
    }
    
    landsContainer.innerHTML = '<p style="text-align:center;color:#999;padding:10px;">加载中...</p>';
    
    try {
        console.log('[好友] 请求土地数据, url:', `/api/friend/${gid}/lands?accountId=${selectedAccountId}`);
        const res = await fetch(`/api/friend/${gid}/lands?accountId=${selectedAccountId}`);
        const data = await res.json();
        console.log('[好友] 土地数据返回:', data);
        
        if (!data.success || !data.data) {
            landsContainer.innerHTML = `<p style="color:red;padding:10px;">错误: ${data.message || '获取失败'}</p>`;
            return;
        }
        
        const lands = data.data.lands || [];
        
        // 生成土地单元格
        let cellsHtml = '';
        for (let i = 1; i <= 24; i++) {
            const l = lands.find(item => item && item.id === i);
            let cellClass = 'land-cell';
            if (!l || !l.unlocked) {
                cellClass += ' locked';
            } else if (!l.plant) {
                cellClass += ' empty';
            } else {
                cellClass += ` ${l.status || 'growing'}`;
            }
            const landData = {
                id: l?.id || i,
                unlocked: l?.unlocked,
                level: l?.level || 1,
                plant: l?.plant || null,
                status: l?.status || 'growing'
            };
            cellsHtml += `<div class="${cellClass}" data-land-id="${i}">${generateLandCellHtml(landData)}</div>`;
        }
        
        landsContainer.innerHTML = `<div class="friend-lands-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:10px;">${cellsHtml}</div>`;
    } catch (e) {
        landsContainer.innerHTML = `<p style="color:red;padding:10px;">加载失败: ${e.message}</p>`;
    }
}

async function operateFriend(gid, opType) {
    if (!selectedAccountId) {
        showToast('请先选择账号', 'error');
        return;
    }
    
    const opNames = { steal: '偷取', water: '浇水', weed: '除草', bug: '除虫', bad: '捣乱' };
    
    try {
        const res = await fetch(`/api/friend/${gid}/op?accountId=${selectedAccountId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ op: opType })
        });
        const data = await res.json();
        
        if (data.success) {
            const count = data.data?.count || 0;
            const message = data.data?.message || data.data?.results?.[0]?.error || '操作成功';
            showToast(`${opNames[opType]}: ${message}`, count > 0 ? 'success' : 'info');
            loadFriends(selectedAccountId);
        } else {
            showToast(data.message || '操作失败', 'error');
        }
    } catch (e) {
        showToast('操作失败: ' + e.message, 'error');
    }
}

function searchFriends(keyword) {
    if (window.friendsCache) {
        renderFriendsList(window.friendsCache, window.blacklistCache);
    }
}

function generateLandCellHtml(land) {
    if (!land) {
        return `<span class="land-icon">⬛</span><span class="land-name">错误</span>`;
    }
    
    if (!land.unlocked) {
        return `<span class="land-icon">⬛</span><span class="land-name">锁定</span><span class="land-level">Lv${land.level || 1}</span>`;
    }
    
    if (!land.plant) {
        return `<span class="land-icon">⬜</span><span class="land-name">空地</span><span class="land-level">Lv${land.level}</span>`;
    }
    
    const status = land.status || 'growing';
    const name = land.plant?.name || '未知';
    const image = land.plant?.image;
    const matureTime = land.plant?.matureTime;
    
    let html = `
        ${image ? `<span class="land-icon"><img src="${image}" class="plant-icon-img" alt="${name}"></span>` : ''}
        <div class="land-info">
            <span class="land-name">${name}</span>
    `;
    
    // 显示季数
    if (land.plant.totalSeason > 1) {
        html += `<span class="land-season">${land.plant.currentSeason}/${land.plant.totalSeason}</span>`;
    }
    
    html += `</div>`;
    
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
    
    // 合种标识
    if (land.plantSize > 1) {
        html += `<span class="land-size">${land.plantSize}×${land.plantSize}</span>`;
    }
    
    html += `<span class="land-level">Lv${land.level}</span>`;
    
    if (land.plant.dryNum > 0 || land.plant.hasWeed || land.plant.hasInsect) {
        let badge = '';
        if (land.plant.dryNum > 0) badge = '💧';
        else if (land.plant.hasWeed) badge = '🌿';
        else if (land.plant.hasInsect) badge = '🐛';
        html += `<span class="land-badge">${badge}</span>`;
    }
    
    return html;
}

function renderLands(landsData) {
    landsGrid = document.getElementById('lands-grid');
    landsCount = document.getElementById('lands-count');
    
    if (!landsData || !landsData.lands) {
        if (landsGrid) landsGrid.innerHTML = '<p style="color:#999;grid-column:1/-1;text-align:center;">暂无土地数据</p>';
        if (landsCount) landsCount.textContent = '0';
        return;
    }
    
    landsDataCache = landsData;
    if (landsCount) landsCount.textContent = landsData.unlockedLands || 0;
    
    // 首次渲染：创建所有单元格并保存引用
    if (Object.keys(landCells).length === 0 && landsGrid) {
        landsGrid.innerHTML = '';
        for (let i = 1; i <= 24; i++) {
            const cell = document.createElement('div');
            cell.className = 'land-cell';
            cell.dataset.landId = i;
            landsGrid.appendChild(cell);
            landCells[i] = cell;
            
            // 添加点击事件
            cell.addEventListener('click', () => {
                const land = landsData.lands.find(l => l && l.id === i);
                if (land) showLandDetail(land);
            });
        }
    }
    
    // 增量更新：只更新有变化的数据
    for (const land of landsData.lands) {
        const cell = landCells[land.id];
        if (!cell) continue;
        
        // 计算新的class和html
        let newClass = 'land-cell';
        if (!land || !land.unlocked) {
            newClass += ' locked';
        } else if (!land.plant) {
            newClass += ' empty';
        } else {
            newClass += ` ${land.status || 'growing'}`;
        }
        
        const newHtml = generateLandCellHtml(land);
        
        // 只在class或内容变化时更新
        if (cell.className !== newClass || cell.innerHTML !== newHtml) {
            cell.className = newClass;
            cell.innerHTML = newHtml;
        }
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
        const image = plant.image;
        const icon = getLandIcon(currentLand.status, plant.name, image);
        
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
            'ready': '可收获',
            'growing': '生长中',
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
                ${image ? `<div class="land-detail-icon"><img src="${image}" class="plant-icon-img" alt="${plant.name}"></div>` : ''}
                <div class="land-detail-info">
                    <h3>${plant.name}</h3>
                    <p>${plant.phaseName}</p>
                </div>
            </div>
            <div class="land-detail-body">
                <div class="land-detail-row"><span>土地:</span><span>#${currentLand.id} · Lv${currentLand.level}</span></div>
                ${plant.currentSeason ? `<div class="land-detail-row"><span>季数:</span><span>${plant.currentSeason}/${plant.totalSeason}</span></div>` : ''}
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
    
    // 点击背景关闭弹窗
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeLandDetailModal();
        }
    };
    
    // 关闭按钮事件
    document.getElementById('btn-close-land-detail')?.addEventListener('click', closeLandDetailModal);
}

function closeLandDetailModal() {
    const modal = document.getElementById('modal-land-detail');
    if (landDetailTimer) {
        clearInterval(landDetailTimer);
        landDetailTimer = null;
    }
    currentLandDetailId = null;
    modal.classList.add('hidden');
}

function getLandIcon(status, plantName, image) {
    if (status === 'ready' || status === 'growing' || status === 'needsWater' || status === 'needsWeed' || status === 'needsInsect' || status === 'dead') {
        // 优先使用后端返回的image字段
        if (image) {
            return `<img src="${image}" class="plant-icon-img" alt="${plantName}">`;
        }
        // fallback到名称匹配
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

// 重新登录

async function reloginAccount(id) {
    try {
        // 先停止账号
        const stopRes = await fetch(`/api/accounts/${id}/stop`, { method: 'POST' });
        const stopData = await stopRes.json();
        
        // 弹出重新登录对话框（默认显示手动输入）
        openReloginModal(id);
        
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

function extractGids(text) {
    const matches = text.match(/\d+/g);
    return [...new Set(matches?.filter(g => /^1\d{9}$/.test(g)) || [])];
}

async function importFriendGids() {
    if (!selectedAccountId) {
        showToast('请先选择账号', 'error');
        return;
    }
    const input = document.getElementById('friend-import-input');
    const text = input?.value || '';
    const gids = extractGids(text);
    if (gids.length === 0) {
        showToast('未找到有效的GID', 'error');
        return;
    }
    try {
        const res = await fetch(`/api/friend-cache/import-gids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: selectedAccountId, gids })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`成功导入 ${data.count} 个GID，共 ${data.total} 个`, 'success');
            if (input) input.value = '';
            loadFriends(selectedAccountId);
        } else {
            showToast(data.message || '导入失败', 'error');
        }
    } catch (e) {
        showToast('导入失败: ' + e.message, 'error');
    }
}

async function viewFriendGids(accountId) {
    try {
        const res = await fetch(`/api/friend-cache?accountId=${accountId}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
            const gids = data.data.map(f => f.gid).join('\n');
            alert(`已导入的GID列表（共${data.data.length}个）：\n\n${gids}`);
        } else {
            showToast('暂无导入的GID', 'info');
        }
    } catch (e) {
        showToast('获取失败: ' + e.message, 'error');
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
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) btnRefresh.addEventListener('click', loadAccounts);
    
    const btnConfig = document.getElementById('btn-config');
    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            if (!selectedAccountId) {
                showToast('请先选择账号', 'error');
                return;
            }
            const acc = accounts.find(a => a.id === selectedAccountId);
            if (!acc) return;
            
            const form = document.getElementById('form-config');
            form.accountId.value = acc.id;
            form.farmInterval.value = acc.config?.farmInterval || 1;
            form.friendInterval.value = acc.config?.friendInterval || 2;
            form.harvestDelay.value = acc.config?.harvestDelay || 0;
            form.stealDelay.value = acc.config?.stealDelay || 0;
            
            // 种植策略
            if (form.plantingStrategy) {
                form.plantingStrategy.value = acc.config?.plantingStrategy || 'preferred';
                updateBagSeedGroupVisibility(form.plantingStrategy.value);
            }
            
            // 优先种植种子
            if (form.preferredSeedId) {
                form.preferredSeedId.value = acc.config?.preferredSeedId || 0;
                loadPreferredSeedOptions(acc.id);
            }
            
            form.autoFriend.checked = acc.config?.autoFriend || false;
            form.autoSteal.checked = acc.config?.autoSteal || false;
            form.autoClaim.checked = acc.config?.autoClaim || false;
            form.autoFarm.checked = acc.config?.autoFarm || false;
            form.autoFertilize.checked = acc.config?.autoFertilize || false;
            if (form.autoFertilizeNormal) form.autoFertilizeNormal.checked = acc.config?.autoFertilizeNormal || false;
            if (form.autoFertilizeOrganic) form.autoFertilizeOrganic.checked = acc.config?.autoFertilizeOrganic || false;
            
            // 施肥范围
            const fertilizerLandTypes = acc.config?.fertilizerLandTypes || ['gold', 'black', 'red', 'normal'];
            if (form.fertilizerLandTypes) {
                form.fertilizerLandTypes.forEach(cb => {
                    cb.checked = fertilizerLandTypes.includes(cb.value);
                });
            }
            
            // 多季补肥
            if (form.fertilizerMultiSeason) {
                form.fertilizerMultiSeason.checked = acc.config?.fertilizerMultiSeason || false;
            }
            
            form.autoLandUnlock.checked = acc.config?.autoLandUnlock || false;
            form.autoLandUpgrade.checked = acc.config?.autoLandUpgrade || false;
            form.autoSell.checked = acc.config?.autoSell || false;
            form.autoBuyFertilizer.checked = acc.config?.autoBuyFertilizer || false;
            if (form.autoBuyFertilizerNormal) form.autoBuyFertilizerNormal.checked = acc.config?.autoBuyFertilizerNormal || false;
            if (form.autoBuyFertilizerOrganic) form.autoBuyFertilizerOrganic.checked = acc.config?.autoBuyFertilizerOrganic || false;
            form.autoUseFertilizer.checked = acc.config?.autoUseFertilizer || false;
            
            document.getElementById('modal-config').classList.remove('hidden');
            
            loadRankingAndSeeds(acc);
        });
    }
    
    const btnScanInAdd = document.getElementById('btn-scan-in-add');
    if (btnScanInAdd) btnScanInAdd.addEventListener('click', startScanInAdd);
    
    const btnScanAddCancel = document.getElementById('btn-scan-add-cancel');
    if (btnScanAddCancel) btnScanAddCancel.addEventListener('click', () => {
        document.getElementById('scan-add-section').classList.add('hidden');
        document.getElementById('form-add').classList.remove('hidden');
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
        
        // 获取施肥范围
        const fertilizerLandTypes = Array.from(form.fertilizerLandTypes || [])
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        const config = {
            farmInterval: parseInt(form.farmInterval.value),
            friendInterval: parseInt(form.friendInterval.value),
            harvestDelay: parseInt(form.harvestDelay.value),
            stealDelay: parseInt(form.stealDelay.value),
            // 种植策略
            plantingStrategy: form.plantingStrategy ? form.plantingStrategy.value : 'preferred',
            preferredSeedId: form.preferredSeedId ? parseInt(form.preferredSeedId.value) || 0 : 0,
            bagSeedPriority: getBagSeedPriorityFromUI(),
            // 好友互动
            autoFriend: form.autoFriend ? form.autoFriend.checked : false,
            // 自动偷菜
            autoSteal: form.autoSteal ? form.autoSteal.checked : false,
            // 自动领取
            autoClaim: form.autoClaim ? form.autoClaim.checked : false,
            // 自动农作
            autoFarm: form.autoFarm ? form.autoFarm.checked : false,
            autoFertilize: form.autoFertilize ? form.autoFertilize.checked : false,
            autoFertilizeNormal: form.autoFertilizeNormal ? form.autoFertilizeNormal.checked : false,
            autoFertilizeOrganic: form.autoFertilizeOrganic ? form.autoFertilizeOrganic.checked : false,
            // 施肥范围和多季补肥
            fertilizerLandTypes: fertilizerLandTypes,
            fertilizerMultiSeason: form.fertilizerMultiSeason ? form.fertilizerMultiSeason.checked : false,
            autoLandUnlock: form.autoLandUnlock ? form.autoLandUnlock.checked : false,
            autoLandUpgrade: form.autoLandUpgrade ? form.autoLandUpgrade.checked : false,
            autoSell: form.autoSell ? form.autoSell.checked : false,
            autoBuyFertilizer: form.autoBuyFertilizer ? form.autoBuyFertilizer.checked : false,
            autoBuyFertilizerNormal: form.autoBuyFertilizerNormal ? form.autoBuyFertilizerNormal.checked : false,
            autoBuyFertilizerOrganic: form.autoBuyFertilizerOrganic ? form.autoBuyFertilizerOrganic.checked : false,
            autoUseFertilizer: form.autoUseFertilizer ? form.autoUseFertilizer.checked : false,
            notStealPlants: Array.from(document.querySelectorAll('#notStealList input[name="notStealPlant"]:checked')).map(cb => cb.value)
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
    
    const wasAtBottom = logsDiv.scrollHeight - logsDiv.scrollTop - logsDiv.clientHeight < 50;
    
    logsDiv.innerHTML = '';
    
    const logs = accountLogs[accountId] || [];
    for (const log of logs) {
        appendLog(accountId, log.level, log.message, log.timestamp);
    }
    
    if (wasAtBottom) {
        logsDiv.scrollTop = logsDiv.scrollHeight;
    }
}

function appendLog(accountId, level, message, timestamp) {
    const logsDiv = document.getElementById('account-logs');
    if (!logsDiv) return;
    
    const wasAtBottom = logsDiv.scrollHeight - logsDiv.scrollTop - logsDiv.clientHeight < 50;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    const timeStr = `<span class="log-time">[${time}]</span> `;
    entry.innerHTML = timeStr + message;
    logsDiv.appendChild(entry);
    
    while (logsDiv.children.length > MAX_LOGS_PER_ACCOUNT) {
        logsDiv.removeChild(logsDiv.firstChild);
    }
    
    if (wasAtBottom) {
        logsDiv.scrollTop = logsDiv.scrollHeight;
    }
    
    // 同时更新主页日志
    if (accountId === selectedAccountId && currentTab === 'home') {
        renderHomeLogs();
    }
}

function clearLogs() {
    if (!selectedAccountId) return;
    accountLogs[selectedAccountId] = [];
    saveLogsToStorage();
    const logsDiv = document.getElementById('account-logs');
    if (logsDiv) logsDiv.innerHTML = '';
    // 同时清空主页日志
    const homeLogsDiv = document.getElementById('home-logs');
    if (homeLogsDiv) homeLogsDiv.innerHTML = '<div class="log-entry" style="color:#666;">暂无日志</div>';
}

async function deleteAccount(id) {
    const acc = accounts.find(a => a.id === id);
    const name = acc?.name || id;
    if (!confirm(`确定要删除账号 "${name}" 吗？此操作不可恢复。`)) {
        return;
    }
    
    try {
        const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast('账号已删除', 'success');
            selectedAccountId = null;
            if (detailPanel) detailPanel.classList.add('hidden');
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
