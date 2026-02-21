let ws = null;
let wsReconnectInterval = null;

function connectWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}/ws`);
    
    ws.onopen = () => {
        console.log('[WS] 已连接');
        if (currentUser && sessionId) {
            ws.send(JSON.stringify({ type: 'auth', sessionId }));
        }
        if (currentAccountId) {
            ws.send(JSON.stringify({ type: 'joinAccount', accountId: currentAccountId }));
        }
    };
    
    ws.onclose = () => {
        console.log('[WS] 已断开');
        wsReconnectInterval = setInterval(connectWebSocket, 3000);
    };
    
    ws.onerror = (e) => {
        console.log('[WS] 错误:', e);
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWsMessage(data);
        } catch (e) {}
    };
}

function handleWsMessage(data) {
    switch (data.type) {
        case 'connected':
            console.log('[WS] 连接成功');
            if (currentUser && sessionId) {
                ws.send(JSON.stringify({ type: 'auth', sessionId }));
            }
            break;
        case 'authSuccess':
            console.log('[WS] 认证成功');
            break;
        case 'accounts':
            accounts = data.data || [];
            updateAccountList();
            if (currentAccountId) {
                const acc = accounts.find(a => a.id === currentAccountId);
                if (acc) {
                    elements.online.textContent = acc.enabled ? (acc.status.online ? '🟢 在线' : '🟡 运行中') : '🔴 已停用';
                    elements.level.textContent = acc.status.level || 0;
                    elements.gold.textContent = acc.status.gold || 0;
                }
            }
            break;
        case 'accountUpdate':
            const updatedAccount = data.data;
            const idx = accounts.findIndex(a => a.id === updatedAccount.id);
            if (idx !== -1) {
                accounts[idx] = updatedAccount;
                updateAccountList();
                if (currentAccountId === updatedAccount.id) {
                    elements.online.textContent = updatedAccount.enabled ? (updatedAccount.status.online ? '🟢 在线' : '🟡 运行中') : '🔴 已停用';
                    elements.level.textContent = updatedAccount.status.level || 0;
                    elements.gold.textContent = updatedAccount.status.gold || 0;
                }
            }
            break;
        case 'accountLog':
            if (currentAccountId === data.data.accountId) {
                addLog(data.data.log);
            }
            break;
        case 'accountConfigChange':
            if (currentAccountId === data.data.accountId) {
                if (data.data.config.farmCheckInterval !== undefined) {
                    elements.farmInterval.value = data.data.config.farmCheckInterval;
                }
                if (data.data.config.friendCheckInterval !== undefined) {
                    elements.friendInterval.value = data.data.config.friendCheckInterval;
                }
                if (data.data.config.autoFarm !== undefined) {
                    elements.autoFarm.checked = data.data.config.autoFarm;
                }
                if (data.data.config.autoFertilize !== undefined) {
                    elements.autoFertilize.checked = data.data.config.autoFertilize;
                }
                if (data.data.config.autoSteal !== undefined) {
                    elements.autoSteal.checked = data.data.config.autoSteal;
                }
                if (data.data.config.autoHelp !== undefined) {
                    elements.autoHelp.checked = data.data.config.autoHelp;
                }
                if (data.data.config.autoPutBug !== undefined) {
                    elements.autoPutBug.checked = data.data.config.autoPutBug;
                }
                if (data.data.config.autoPutWeed !== undefined) {
                    elements.autoPutWeed.checked = data.data.config.autoPutWeed;
                }
                if (data.data.config.autoSell !== undefined) {
                    elements.autoSell.checked = data.data.config.autoSell;
                }
                if (data.data.config.autoTask !== undefined) {
                    elements.autoTask.checked = data.data.config.autoTask;
                }
                if (data.data.config.stealMinLevel !== undefined) {
                    elements.stealMinLevel.value = data.data.config.stealMinLevel;
                }
            }
            break;
        case 'gameStatus':
            break;
        case 'accountStatus':
            if (currentAccountId === data.data.accountId) {
                if (data.data.lands) {
                    updateFarmLands(data.data.lands);
                }
                if (data.data.level !== undefined) {
                    elements.level.textContent = data.data.level;
                }
                if (data.data.currentExp !== undefined) {
                    const currentExp = data.data.currentExp;
                    const neededExp = data.data.neededExp || 0;
                    if (neededExp === 0) {
                        elements.exp.textContent = `${currentExp} (已满级)`;
                    } else {
                        elements.exp.textContent = `${currentExp}/${neededExp}`;
                    }
                }
                if (data.data.gold !== undefined) {
                    elements.gold.textContent = data.data.gold;
                }
                if (data.data.runTime !== undefined) {
                    elements.runTime.textContent = formatRunTime(data.data.runTime);
                }
            }
            break;
    }
}

let sessionId = null;

let currentUser = null;
let currentAccountId = null;
let accounts = [];
let qrCheckInterval = null;
let seedsList = [];

const elements = {
    loginOverlay: document.getElementById('loginOverlay'),
    mainContainer: document.getElementById('mainContainer'),
    loginForm: document.getElementById('loginForm'),
    loginTip: document.getElementById('loginTip'),
    registerOverlay: document.getElementById('registerOverlay'),
    registerForm: document.getElementById('registerForm'),
    registerTip: document.getElementById('registerTip'),
    showRegister: document.getElementById('showRegister'),
    showLogin: document.getElementById('showLogin'),
    userInfo: document.getElementById('userInfo'),
    logoutBtn: document.getElementById('logoutBtn'),
    accountList: document.getElementById('accountList'),
    addAccountBtn: document.getElementById('addAccountBtn'),
    qrModal: document.getElementById('qrModal'),
    qrImage: document.getElementById('qrImage'),
    qrStatus: document.getElementById('qrStatus'),
    cancelQr: document.getElementById('cancelQr'),
    refreshQr: document.getElementById('refreshQr'),
    configPanel: document.getElementById('configPanel'),
    currentAccountName: document.getElementById('currentAccountName'),
    platform: document.getElementById('platform'),
    online: document.getElementById('online'),
    level: document.getElementById('level'),
    exp: document.getElementById('exp'),
    gold: document.getElementById('gold'),
    runTime: document.getElementById('runTime'),
    farmGrid: document.getElementById('farmGrid'),
    logContainer: document.getElementById('logContainer'),
    lastUpdate: document.getElementById('lastUpdate'),
    farmInterval: document.getElementById('farmInterval'),
    friendInterval: document.getElementById('friendInterval'),
    autoFarm: document.getElementById('autoFarm'),
    autoFertilize: document.getElementById('autoFertilize'),
    autoSteal: document.getElementById('autoSteal'),
    stealMinLevel: document.getElementById('stealMinLevel'),
    autoHelp: document.getElementById('autoHelp'),
    autoPutBug: document.getElementById('autoPutBug'),
    autoPutWeed: document.getElementById('autoPutWeed'),
    autoSell: document.getElementById('autoSell'),
    autoTask: document.getElementById('autoTask'),
    seedSelect: document.getElementById('seedSelect'),
    recommendTag: document.getElementById('recommendTag'),
    rankInfo: document.getElementById('rankInfo'),
    rankNoFert: document.getElementById('rankNoFert'),
    rankNormalFert: document.getElementById('rankNormalFert'),
    expRankSection: document.getElementById('expRankSection'),
    saveConfig: document.getElementById('saveConfig'),
    deleteAccount: document.getElementById('deleteAccount'),
    configTip: document.getElementById('configTip'),
};

function updateAccountList() {
    if (!accounts || accounts.length === 0) {
        elements.accountList.innerHTML = '<div class="empty">暂无账号</div>';
        return;
    }

    let html = '';
    for (const acc of accounts) {
        const isActive = acc.id === currentAccountId ? 'active' : '';
        const statusClass = acc.status && acc.status.online ? 'online' : 'offline';
        const statusText = acc.status && acc.status.online ? '在线' : '离线';
        html += `
            <div class="account-item ${isActive}" data-id="${acc.id}">
                <div class="account-name">${acc.name} ${acc.ownerId ? `(${acc.ownerId})` : ''}</div>
                <div class="account-status ${statusClass}">
                    <span class="account-platform">${acc.platform === 'wx' ? '微信' : 'QQ'}</span>
                    ${statusText}
                </div>
            </div>
        `;
    }
    elements.accountList.innerHTML = html;

    document.querySelectorAll('.account-item').forEach(item => {
        item.addEventListener('click', () => {
            selectAccount(item.dataset.id);
        });
    });
}

async function selectAccount(id) {
    currentAccountId = id;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'joinAccount', accountId: id }));
    }
    updateAccountList();
    await loadAccountDetail(id);
}

async function loadAccountDetail(id) {
    try {
        const headers = sessionId ? { 'X-Session-Id': sessionId } : {};
        const res = await fetch(`/api/accounts/${id}`, { headers });
        const account = await res.json();

        elements.currentAccountName.textContent = account.name;
        elements.platform.textContent = account.platform === 'wx' ? '微信' : 'QQ';
        elements.online.textContent = account.enabled ? (account.status.online ? '🟢 在线' : '🟡 运行中') : '🔴 已停用';
        elements.level.textContent = account.status.level || 0;
        elements.exp.textContent = account.status.exp || 0;
        elements.gold.textContent = account.status.gold || 0;
        elements.runTime.textContent = '-';

        if (account.config) {
            elements.farmInterval.value = account.config.farmCheckInterval || 10;
            elements.friendInterval.value = account.config.friendCheckInterval || 10;
            elements.autoFarm.checked = account.config.autoFarm !== false;
            elements.autoFertilize.checked = account.config.autoFertilize !== false;
            elements.autoSteal.checked = account.config.autoSteal !== false;
            elements.autoHelp.checked = account.config.autoHelp !== false;
            elements.autoPutBug.checked = account.config.autoPutBug === true;
            elements.autoPutWeed.checked = account.config.autoPutWeed === true;
            elements.autoSell.checked = account.config.autoSell !== false;
            elements.autoTask.checked = account.config.autoTask !== false;
            elements.stealMinLevel.value = account.config.stealMinLevel || 0;
            loadSeedsList(account.config.seedId);
            loadExpRank(account.status.level, account.status.landsCount);
        }

        // 加载土地数据
        try {
            const landsRes = await fetch(`/api/accounts/${id}/lands`, { headers });
            const landsData = await landsRes.json();
            if (landsData.lands && landsData.lands.length > 0) {
                updateFarmLands(landsData.lands);
            }
        } catch (e) {
            console.log('暂无土地数据，等待实时更新...');
        }

    } catch (e) {
        console.error('加载账号详情失败:', e);
    }
}

async function loadSeedsList(selectedSeedId) {
    try {
        if (seedsList.length === 0) {
            const res = await fetch('/api/seeds');
            seedsList = await res.json();
        }
        
        elements.seedSelect.innerHTML = '<option value="">-- 自动推荐 --</option>';
        
        const level = parseInt(elements.level.textContent) || 1;
        const availableSeeds = seedsList.filter(s => s.requiredLevel <= level);
        
        for (const seed of availableSeeds) {
            const option = document.createElement('option');
            option.value = seed.seedId;
            option.textContent = `${seed.name} (Lv.${seed.requiredLevel})`;
            elements.seedSelect.appendChild(option);
        }
        
        if (selectedSeedId) {
            elements.seedSelect.value = selectedSeedId;
        }
        
    } catch (e) {
        console.error('加载种子列表失败:', e);
    }
}

async function loadExpRank(level, lands) {
    try {
        if (!lands || lands <= 0) {
            lands = 18;
        }
        
        if (!level || level <= 0) {
            elements.expRankSection.style.display = 'none';
            return;
        }
        
        const res = await fetch(`/api/exp-yield?level=${level}&lands=${lands}&top=5`);
        const data = await res.json();
        
        elements.expRankSection.style.display = 'block';
        elements.rankInfo.textContent = `(Lv.${level}, ${lands}土地)`;
        
        if (data.topNoFert && data.topNoFert.length > 0) {
            elements.rankNoFert.innerHTML = data.topNoFert.map((s, i) => 
                `<li>${i + 1}. ${s.name} ${Math.round(s.expPerHour)}/h</li>`
            ).join('');
        }
        
        if (data.topNormalFert && data.topNormalFert.length > 0) {
            const recommendedSeed = data.topNormalFert[0];
            elements.rankNormalFert.innerHTML = data.topNormalFert.map((s, i) => {
                const gainStr = s.gainPercent ? `(+${Math.round(s.gainPercent)}%)` : '';
                const recommendClass = i === 0 ? ' class="recommended"' : '';
                return `<li${recommendClass}>${i + 1}. ${s.name} ${Math.round(s.expPerHour)}/h ${gainStr}</li>`;
            }).join('');
            
            if (!elements.seedSelect.value) {
                elements.recommendTag.textContent = `推荐: ${recommendedSeed.name}`;
            } else {
                elements.recommendTag.textContent = '';
            }
        }
        
    } catch (e) {
        console.error('加载经验排行榜失败:', e);
        elements.expRankSection.style.display = 'none';
    }
}

function updateFarmLands(lands) {
    if (!lands || lands.length === 0) {
        elements.farmGrid.innerHTML = '<div class="empty">暂无土地数据</div>';
        return;
    }

    let html = '';
    for (const land of lands) {
        let cardClass = 'land-card';
        let statusTags = '';

        if (!land.unlocked) {
            cardClass += ' locked';
            statusTags = '<span class="land-tag empty">未解锁</span>';
        } else if (land.isDead) {
            cardClass += ' dead';
        } else if (land.isHarvestable) {
            cardClass += ' harvestable';
        } else if (land.plantName) {
            cardClass += ' unlocked';
        }

        if (land.unlocked && land.plantName) {
            if (land.needWater) {
                statusTags += '<span class="land-tag water">🌊 缺水</span>';
            }
            if (land.needWeed) {
                statusTags += '<span class="land-tag weed">🌿 杂草</span>';
            }
            if (land.needBug) {
                statusTags += '<span class="land-tag bug">🐛 虫害</span>';
            }
        }

        html += `
            <div class="${cardClass}">
                <div class="land-number">土地 #${land.landId}</div>
                ${land.plantName ? `<div class="plant-name">${land.plantName}</div>` : '<div class="plant-name">-</div>'}
                ${land.phaseName ? `<div class="phase-name">${land.phaseName}</div>` : ''}
                ${land.timeLeft ? `<div class="time-left">${land.timeLeft}</div>` : ''}
                <div class="land-tags">${statusTags}</div>
            </div>
        `;
    }
    elements.farmGrid.innerHTML = html;
}

function updateLogs(logs) {
    if (!logs || logs.length === 0) {
        elements.logContainer.innerHTML = '<div class="log-empty">暂无日志</div>';
        return;
    }
    let html = '';
    for (const log of logs) {
        html += createLogItem(log);
    }
    elements.logContainer.innerHTML = html;
}

function addLog(log) {
    const empty = elements.logContainer.querySelector('.log-empty');
    if (empty) {
        elements.logContainer.innerHTML = '';
    }
    const html = createLogItem(log);
    elements.logContainer.insertAdjacentHTML('afterbegin', html);
    
    const items = elements.logContainer.querySelectorAll('.log-item');
    if (items.length > 100) {
        items[items.length - 1].remove();
    }
}

function createLogItem(log) {
    return `
        <div class="log-item">
            <span class="log-time">${log.time}</span>
            <span class="log-type log-type${log.type}">${log.type}</span>
            <span class="log-message">${log.message}</span>
        </div>
    `;
}

function showLogin() {
    elements.loginOverlay.style.display = 'flex';
    elements.mainContainer.style.display = 'none';
}

function showMain() {
    elements.loginOverlay.style.display = 'none';
    elements.mainContainer.style.display = 'flex';
}

function updateUserUI() {
    if (currentUser) {
        elements.userInfo.textContent = `${currentUser.name} (${currentUser.role === 'admin' ? '管理员' : '用户'})`;
        
        if (currentUser.role === 'admin') {
            elements.configPanel.style.display = 'block';
            elements.addAccountBtn.style.display = 'block';
        } else {
            elements.configPanel.style.display = 'block';
            elements.addAccountBtn.style.display = 'block';
        }
    } else {
        elements.userInfo.textContent = '';
        elements.configPanel.style.display = 'none';
    }
}

async function checkLogin() {
    const savedSessionId = sessionStorage.getItem('sessionId');
    try {
        const headers = savedSessionId ? { 'X-Session-Id': savedSessionId } : {};
        const res = await fetch('/api/user', { headers });
        const data = await res.json();
        
        if (data.loggedIn) {
            currentUser = data.user;
            sessionId = savedSessionId;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserUI();
            showMain();
            await loadAccounts();
            connectWebSocket();
        } else {
            showLogin();
        }
    } catch (e) {
        showLogin();
    }
}

async function loadAccounts() {
    try {
        const headers = sessionId ? { 'X-Session-Id': sessionId } : {};
        const res = await fetch('/api/accounts', { headers });
        accounts = await res.json();
        updateAccountList();
        
        if (accounts.length > 0 && !currentAccountId) {
            await selectAccount(accounts[0].id);
        } else if (currentAccountId) {
            await loadAccountDetail(currentAccountId);
        }
    } catch (e) {
        console.error('加载账号列表失败:', e);
    }
}

elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            sessionId = data.sessionId;
            sessionStorage.setItem('sessionId', sessionId);
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserUI();
            showMain();
            await loadAccounts();
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'auth', sessionId }));
            }
        } else {
            elements.loginTip.textContent = data.message;
            elements.loginTip.classList.add('show');
        }
    } catch (e) {
        elements.loginTip.textContent = '登录失败: ' + e.message;
        elements.loginTip.classList.add('show');
    }
});

elements.logoutBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { 
            method: 'POST',
            headers: { 'X-Session-Id': sessionId }
        });
    } catch (e) {}
    currentUser = null;
    sessionId = null;
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('currentUser');
    currentAccountId = null;
    accounts = [];
    showLogin();
});

elements.showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    elements.loginOverlay.style.display = 'none';
    elements.registerOverlay.style.display = 'flex';
    elements.registerTip.textContent = '';
});

elements.showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    elements.registerOverlay.style.display = 'none';
    elements.loginOverlay.style.display = 'flex';
    elements.loginTip.textContent = '';
});

elements.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success) {
            elements.registerTip.textContent = '注册成功，请登录';
            elements.registerTip.className = 'login-tip show';
            setTimeout(() => {
                elements.registerOverlay.style.display = 'none';
                elements.loginOverlay.style.display = 'flex';
                elements.loginTip.textContent = '';
            }, 1500);
        } else {
            elements.registerTip.textContent = data.message;
            elements.registerTip.className = 'login-tip show';
        }
    } catch (e) {
        elements.registerTip.textContent = '注册失败: ' + e.message;
        elements.registerTip.className = 'login-tip show';
    }
});

elements.addAccountBtn.addEventListener('click', async () => {
    await showQrModal();
});

async function showQrModal() {
    elements.qrModal.style.display = 'flex';
    elements.qrStatus.textContent = '正在获取二维码...';
    elements.qrStatus.className = 'qr-status';
    
    try {
        const res = await fetch('/api/qrcode', {
            method: 'POST',
            headers: { 'X-Session-Id': sessionId }
        });
        const data = await res.json();

        if (data.success) {
            elements.qrImage.src = data.qrImage;
            elements.qrStatus.textContent = '请用 QQ 扫码登录';
            elements.qrStatus.className = 'qr-status';
            
            startQrCheck();
        } else {
            elements.qrStatus.textContent = data.message || '获取二维码失败';
            elements.qrStatus.className = 'qr-status error';
        }
    } catch (e) {
        elements.qrStatus.textContent = '获取二维码失败: ' + e.message;
        elements.qrStatus.className = 'qr-status error';
    }
}

function startQrCheck() {
    if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
    }
    
    qrCheckInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/qrcheck', {
                headers: { 'X-Session-Id': sessionId }
            });
            const data = await res.json();

            if (data.status === 'success') {
                clearInterval(qrCheckInterval);
                qrCheckInterval = null;
                elements.qrStatus.textContent = '扫码成功！账号已启动';
                elements.qrStatus.className = 'qr-status success';
                
                setTimeout(() => {
                    elements.qrModal.style.display = 'none';
                    loadAccounts();
                }, 1500);
            } else if (data.status === 'used') {
                elements.qrStatus.textContent = data.message || '二维码已失效';
                elements.qrStatus.className = 'qr-status error';
            } else if (data.status === 'error') {
                elements.qrStatus.textContent = data.message || '扫码出错';
                elements.qrStatus.className = 'qr-status error';
            }
        } catch (e) {
            console.error('检查扫码状态失败:', e);
        }
    }, 2000);
}

elements.cancelQr.addEventListener('click', () => {
    if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
        qrCheckInterval = null;
    }
    elements.qrModal.style.display = 'none';
});

elements.refreshQr.addEventListener('click', async () => {
    await showQrModal();
});

elements.saveConfig.addEventListener('click', async () => {
    if (!currentAccountId) return;

    const config = {
        farmCheckInterval: parseInt(elements.farmInterval.value),
        friendCheckInterval: parseInt(elements.friendInterval.value),
        seedId: elements.seedSelect.value ? parseInt(elements.seedSelect.value) : null,
        autoFarm: elements.autoFarm.checked,
        autoFertilize: elements.autoFertilize.checked,
        autoSteal: elements.autoSteal.checked,
        autoHelp: elements.autoHelp.checked,
        autoPutBug: elements.autoPutBug.checked,
        autoPutWeed: elements.autoPutWeed.checked,
        autoSell: elements.autoSell.checked,
        autoTask: elements.autoTask.checked,
        stealMinLevel: parseInt(elements.stealMinLevel.value) || 0,
    };

    try {
        const res = await fetch(`/api/accounts/${currentAccountId}/config`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            },
            body: JSON.stringify(config),
        });
        const data = await res.json();
        if (data.success) {
            elements.configTip.textContent = '配置保存成功!';
            elements.configTip.className = 'config-tip success';
            const level = parseInt(elements.level.textContent);
            const acc = accounts.find(a => a.id === currentAccountId);
            const lands = acc && acc.status && acc.status.landsCount ? acc.status.landsCount : 18;
            loadExpRank(level, lands);
        } else {
            elements.configTip.textContent = data.message || '保存失败';
            elements.configTip.className = 'config-tip error';
        }
    } catch (e) {
        elements.configTip.textContent = '保存失败: ' + e.message;
        elements.configTip.className = 'config-tip error';
    }

    setTimeout(() => {
        elements.configTip.className = 'config-tip';
    }, 3000);
});

elements.deleteAccount.addEventListener('click', async () => {
    if (!currentAccountId) return;
    if (!confirm('确定要删除这个账号吗？')) return;
    
    try {
        await fetch(`/api/accounts/${currentAccountId}`, { 
            method: 'DELETE',
            headers: { 'X-Session-Id': sessionId }
        });
        currentAccountId = null;
        loadAccounts();
    } catch (e) {
        console.error('删除账号失败:', e);
    }
});

checkLogin();

function formatRunTime(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (mins > 0) {
        return secs > 0 ? `${hours}小时${mins}分${secs}秒` : `${hours}小时${mins}分`;
    }
    return `${hours}小时${secs}秒`;
}
