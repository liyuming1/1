const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const accountManager = require('./accountManager');
const { getPlantingRecommendation, analyzeExpYield } = require('../tools/calc-exp-yield');
const seedsData = require('../tools/seed-shop-merged-export.json');

let httpServer = null;
let wss = null;
let startAccountCallback = null;
let users = {};
let sessions = {};

function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function setStartAccountCallback(cb) {
    startAccountCallback = cb;
}

function loadUsers() {
    try {
        const data = fs.readFileSync(path.join(__dirname, '../users.json'), 'utf8');
        users = JSON.parse(data);
    } catch (e) {
        users = {
            admin: { password: 'admin123', role: 'admin', name: '管理员' }
        };
    }
}

loadUsers();

accountManager.loadAccounts();

function broadcast(type, data) {
    if (!wss) return;
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastToAccount(accountId, type, data) {
    if (!wss) return;
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.accountId === accountId) {
            client.send(message);
        }
    });
}

function broadcastAccountStatus(accountId, data) {
    if (!wss) return;
    const message = JSON.stringify({ type: 'accountStatus', data: { accountId, ...data }, timestamp: Date.now() });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function initWebUI(port = 3000) {
    const app = express();
    httpServer = http.createServer(app);

    wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.accountId = null;

        ws.send(JSON.stringify({ type: 'connected' }));

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'auth' && data.sessionId) {
                    const session = sessions[data.sessionId];
                    if (session) {
                        ws.sessionId = data.sessionId;
                        ws.user = session.user;
                        ws.send(JSON.stringify({ type: 'authSuccess', user: session.user }));
                    }
                }
                if (data.type === 'joinAccount' && data.accountId) {
                    ws.accountId = data.accountId;
                }
                if (data.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch (e) {}
        });

        ws.on('close', () => {});
    });

    const interval = setInterval(() => {
        wss.clients.forEach(ws => {
            if (!ws.isAlive) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));

    const ADMIN_USER = {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        name: '管理员'
    };

    function verifyUser(username, password) {
        if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
            return ADMIN_USER;
        }
        const user = users[username];
        if (user && user.password === password) {
            return { username, ...user };
        }
        return null;
    }

    function authMiddleware(req, res, next) {
        const sessionId = req.headers['x-session-id'];
        if (!sessionId || !sessions[sessionId]) {
            return res.status(401).json({ error: '请先登录' });
        }
        req.user = sessions[sessionId].user;
        next();
    }

    function adminMiddleware(req, res, next) {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: '需要管理员权限' });
        }
        next();
    }

    app.post('/api/register', (req, res) => {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.json({ success: false, message: '用户名和密码不能为空' });
        }
        
        if (username.length < 2 || username.length > 20) {
            return res.json({ success: false, message: '用户名长度需2-20字符' });
        }
        
        if (password.length < 4 || password.length > 20) {
            return res.json({ success: false, message: '密码长度需4-20字符' });
        }
        
        if (username.toLowerCase() === 'admin') {
            return res.json({ success: false, message: '不能注册 admin 用户' });
        }
        
        if (users[username]) {
            return res.json({ success: false, message: '用户名已存在' });
        }
        
        users[username] = {
            password: password,
            role: 'user',
            name: username
        };
        
        fs.writeFileSync(path.join(__dirname, '../users.json'), JSON.stringify(users, null, 2));
        
        res.json({ success: true, message: '注册成功' });
    });

    app.post('/api/login', (req, res) => {
        const { username, password } = req.body;
        const user = verifyUser(username, password);
        
        if (!user) {
            return res.json({ success: false, message: '用户名或密码错误' });
        }

        const sessionId = generateSessionId();
        sessions[sessionId] = {
            user: {
                username: user.username,
                role: user.role,
                name: user.name
            },
            createdAt: Date.now()
        };

        res.json({ 
            success: true, 
            sessionId,
            user: { username: user.username, role: user.role, name: user.name }
        });
    });

    app.post('/api/logout', (req, res) => {
        const sessionId = req.headers['x-session-id'];
        if (sessionId && sessions[sessionId]) {
            delete sessions[sessionId];
        }
        res.json({ success: true });
    });

    app.get('/api/user', (req, res) => {
        const sessionId = req.headers['x-session-id'];
        if (sessionId && sessions[sessionId]) {
            res.json({ 
                loggedIn: true, 
                user: sessions[sessionId].user 
            });
        } else {
            res.json({ loggedIn: false });
        }
    });

    app.get('/api/accounts', authMiddleware, (req, res) => {
        const user = req.user;
        
        let accounts;
        if (user.role === 'admin') {
            accounts = accountManager.getAllAccounts();
        } else {
            accounts = accountManager.getAllAccounts(user.username);
        }
        
        const result = accounts.map(a => ({
            id: a.id,
            name: a.name,
            ownerId: a.ownerId,
            platform: a.platform,
            enabled: a.enabled,
            status: a.status,
        }));
        res.json(result);
    });

    app.get('/api/accounts/:id', authMiddleware, (req, res) => {
        const user = req.user;
        const account = accountManager.getAccount(req.params.id);
        if (!account) {
            return res.status(404).json({ error: '账号不存在' });
        }
        if (user.role !== 'admin' && account.ownerId !== user.username) {
            return res.status(403).json({ error: '只能操作自己的账号' });
        }
        res.json({
            id: account.id,
            name: account.name,
            platform: account.platform,
            enabled: account.enabled,
            config: account.config,
            status: account.status,
            logs: account.logs || [],
        });
    });

    app.get('/api/accounts/:id/lands', authMiddleware, (req, res) => {
        const user = req.user;
        const account = accountManager.getAccount(req.params.id);
        if (!account) {
            return res.status(404).json({ error: '账号不存在' });
        }
        if (user.role !== 'admin' && account.ownerId !== user.username) {
            return res.status(403).json({ error: '只能操作自己的账号' });
        }
        res.json({
            lands: account.status.lands || [],
        });
    });

    app.post('/api/accounts', authMiddleware, async (req, res) => {
        const user = req.user;
        const { name, platform } = req.body;
        try {
            const account = accountManager.addAccount(platform || 'qq', name || '', user.username);
            res.json({ success: true, account });
        } catch (e) {
            res.json({ success: false, message: e.message });
        }
    });

    app.delete('/api/accounts/:id', authMiddleware, (req, res) => {
        const user = req.user;
        const account = accountManager.getAccount(req.params.id);
        
        if (!account) {
            return res.json({ success: false, message: '账号不存在' });
        }

        if (user.role !== 'admin' && account.ownerId !== user.username) {
            return res.status(403).json({ success: false, message: '只能删除自己的账号' });
        }

        const result = accountManager.removeAccount(req.params.id);
        res.json({ success: result });
    });

    app.get('/api/seeds', (req, res) => {
        const seeds = seedsData.rows || seedsData || [];
        const result = seeds.map(s => ({
            seedId: s.seedId,
            name: s.name,
            requiredLevel: s.requiredLevel || 1,
            price: s.price || 0,
            exp: s.exp || 0,
            growTimeSec: s.growTimeSec || 0,
            growTimeStr: s.growTimeStr || '',
        }));
        res.json(result);
    });

    app.get('/api/exp-yield', (req, res) => {
        const level = parseInt(req.query.level) || 1;
        const lands = parseInt(req.query.lands) || 18;
        const top = parseInt(req.query.top) || 5;

        try {
            const payload = getPlantingRecommendation(level, lands, { top });
            const availableRows = payload.candidatesNoFert || [];
            const availableFertRows = payload.candidatesNormalFert || [];
            res.json({
                level: payload.level,
                lands: payload.lands,
                topNoFert: availableRows,
                topNormalFert: availableFertRows,
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/qrcode', authMiddleware, async (req, res) => {
        const user = req.user;
        
        try {
            const result = await accountManager.createQrCodeForAccount(user.username);
            res.json({ success: true, qrImage: result.qrImage });
        } catch (e) {
            res.json({ success: false, message: e.message });
        }
    });

    app.get('/api/qrcheck', authMiddleware, async (req, res) => {
        const user = req.user;

        try {
            const result = await accountManager.checkQrAndStartAccount(user.username);
            
            if (result.status === 'success' && result.account && startAccountCallback) {
                setTimeout(() => {
                    startAccountCallback(result.account);
                }, 500);
            }
            
            res.json(result);
        } catch (e) {
            res.json({ status: 'error', message: e.message });
        }
    });

    app.post('/api/accounts/:id/config', authMiddleware, (req, res) => {
        const user = req.user;
        const account = accountManager.getAccount(req.params.id);
        
        if (!account) {
            return res.json({ success: false, message: '账号不存在' });
        }

        if (user.role !== 'admin' && account.ownerId !== user.username) {
            return res.status(403).json({ success: false, message: '只能修改自己账号的配置' });
        }

        const { farmCheckInterval, friendCheckInterval, seedId, autoFarm, autoFertilize, autoSteal, autoHelp, autoPutBug, autoPutWeed, autoSell, autoTask, stealMinLevel } = req.body;
        const config = {};
        
        if (farmCheckInterval !== undefined && farmCheckInterval >= 1) {
            config.farmCheckInterval = farmCheckInterval;
        }
        if (friendCheckInterval !== undefined && friendCheckInterval >= 1) {
            config.friendCheckInterval = friendCheckInterval;
        }
        if (seedId !== undefined) {
            config.seedId = seedId;
        }
        if (autoFarm !== undefined) {
            config.autoFarm = autoFarm;
        }
        if (autoFertilize !== undefined) {
            config.autoFertilize = autoFertilize;
        }
        if (autoSteal !== undefined) {
            config.autoSteal = autoSteal;
        }
        if (autoHelp !== undefined) {
            config.autoHelp = autoHelp;
        }
        if (autoPutBug !== undefined) {
            config.autoPutBug = autoPutBug;
        }
        if (autoPutWeed !== undefined) {
            config.autoPutWeed = autoPutWeed;
        }
        if (autoSell !== undefined) {
            config.autoSell = autoSell;
        }
        if (autoTask !== undefined) {
            config.autoTask = autoTask;
        }
        if (stealMinLevel !== undefined && stealMinLevel >= 0) {
            config.stealMinLevel = stealMinLevel;
        }

        accountManager.updateAccountConfig(req.params.id, config);
        
        broadcastAccountUpdate(account);
        
        res.json({ success: true, config: account.config });
    });

    httpServer.listen(port, () => {
        console.log(`Web UI 已启动: http://localhost:${port}`);
    });

    setInterval(() => {
        broadcastAccounts();
    }, 5000);

    return { app, server: httpServer, wss };
}

function broadcastAccounts() {
    // 不再通过 WebSocket 广播账号列表，前端通过 HTTP API 获取
}

function broadcastAccountUpdate(account) {
    // 不再通过 WebSocket 广播账号更新，前端通过 HTTP API 刷新
}

function broadcastAccountLog(accountId, log) {
    if (!wss) return;
    broadcastToAccount(accountId, 'accountLog', { accountId, log });
}

function addLog(accountId, tag, message) {
    const log = {
        time: new Date().toLocaleTimeString(),
        type: tag,
        message: message,
    };
    broadcastAccountLog(accountId, log);
    
    const account = accountManager.getAccount(accountId);
    if (account) {
        if (!account.logs) account.logs = [];
        account.logs.unshift(log);
        if (account.logs.length > 100) {
            account.logs = account.logs.slice(0, 100);
        }
    }
}

function updateGameStatus(data) {
    if (!wss) return;
    broadcast('gameStatus', data);
}

function getIO() {
    return wss;
}

module.exports = {
    initWebUI,
    broadcastAccounts,
    broadcastAccountUpdate,
    broadcastAccountLog,
    broadcastAccountStatus,
    addLog,
    accountManager,
    setStartAccountCallback,
    updateGameStatus,
    getIO,
};
