// ============ 农场管理系统 - 前端逻辑 ============

const PHASE_NAMES = ['未知', '种子', '发芽', '小叶', '大叶', '开花', '成熟', '枯死'];

function getRunTime(startTime) {
    const seconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    if (seconds < 60) return seconds + '秒';
    if (seconds < 3600) return Math.floor(seconds / 60) + '分' + (seconds % 60) + '秒';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
        return days + '天' + hours + '时';
    }
    return hours + '时' + mins + '分' + secs + '秒';
}

let socket = null;
let accounts = [];
let selectedAccountId = null;
let wsConnected = false;
let scanPollTimer = null;
let accountLogs = {};

// ============ DOM 元素 ============
const connectionStatus = document.getElementById('connection-status');
const accountsGrid = document.getElementById('accounts-grid');
const detailPanel = document.getElementById('detail-panel');
const detailTitle = document.getElementById('detail-title');
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
            html += '<p class="text-muted" style="font-size:12px;margin-top:4px;">按住Ctrl可多选，默认推荐施肥第一名</p>';
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
        
        card.innerHTML = `
            <div class="card-header">
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
    
    document.querySelectorAll('.btn-config').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const acc = accounts.find(a => a.id === btn.dataset.id);
            if (!acc) return;
            
            const form = document.getElementById('form-config');
            form.accountId.value = acc.id;
            form.farmInterval.value = acc.config?.farmInterval || 1;
            form.friendInterval.value = acc.config?.friendInterval || 2;
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
            const icon = getLandIcon(status);
            const name = land.plant?.name || '未知';
            const matureTime = land.plant?.matureTime;
            const phaseName = land.plant?.phaseName || '';
            
            cell.className = `land-cell ${status}`;
            let html = `
                <span class="land-icon">${icon}</span>
                <span class="land-name">${name}</span>
                <span class="land-phase">${phaseName}</span>
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
        }
        
        landsGrid.appendChild(cell);
    }
}

function getLandIcon(status) {
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
                    
                    const form = document.getElementById('form-add');
                    form.name.value = data.name || 'QQ账号';
                    form.code.value = data.code;
                    
                    document.getElementById('scan-add-section').classList.add('hidden');
                    form.classList.remove('hidden');
                    
                    showToast('扫码成功，请确认信息后点击添加', 'success');
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
    
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    logsDiv.appendChild(entry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
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
