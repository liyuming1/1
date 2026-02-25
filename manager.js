/**
 * 主进程管理器 - 管理多账号、进程生命周期、API服务
 * 
 * 功能：
 *   - 账号 CRUD 管理
 *   - 子进程启动/停止/监控
 *   - REST API 服务
 *   - WebSocket 实时推送
 *   - 配置文件热更新监听
 */

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

let getExpRanking, getPlantingRecommendation;
try {
    const calcModule = require('./tools/calc-exp-yield');
    getExpRanking = calcModule.getExpRanking;
    getPlantingRecommendation = calcModule.getPlantingRecommendation;
} catch (e) {
    console.log('[API] 经验计算模块加载失败:', e.message);
}

const DEFAULT_PORT = 3000;
const ACCOUNTS_DIR = path.join(__dirname, 'accounts');

class AccountInstance {
    constructor(id, config, manager) {
        this.id = id;
        this.config = config;
        this.manager = manager;
        this.process = null;
        this.state = {
            pid: 0,
            status: 'stopped',
            startTime: null,
            stopReason: '',
            data: { gid: 0, name: '', level: 0, gold: 0, exp: 0 },
            lands: null
        };
    }

    async start() {
        if (this.state.status === 'running') {
            return { success: false, message: '账号已在运行中' };
        }

        const accountDir = path.join(ACCOUNTS_DIR, this.id);
        
        // 确保目录存在
        if (!fs.existsSync(accountDir)) {
            fs.mkdirSync(accountDir, { recursive: true });
            fs.mkdirSync(path.join(accountDir, 'logs'), { recursive: true });
        }

        // 保存配置文件
        fs.writeFileSync(
            path.join(accountDir, 'config.json'),
            JSON.stringify(this.config, null, 2),
            'utf8'
        );

        try {
            this.process = fork(path.join(__dirname, 'client.js'), [
                '--code', this.config.code,
                '--account-id', this.id,
                '--account-dir', accountDir,
                '--manager-url', `http://localhost:${this.manager.port}`
            ], {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc']
            });

            this.process.stdout.on('data', (data) => {
                console.log(`[${this.id}] ${data.toString().trim()}`);
            });

            this.process.stderr.on('data', (data) => {
                console.error(`[${this.id}] ${data.toString().trim()}`);
            });

            this.state.pid = this.process.pid;
            this.state.status = 'running';
            this.state.startTime = new Date().toISOString();
            this.state.stopReason = '';

            this.process.on('exit', (code) => {
                this.state.status = 'stopped';
                this.state.pid = 0;
                this.state.stopReason = `进程退出, code=${code}`;
                this.manager.broadcastStatus(this.id);
            });

            this.process.on('error', (err) => {
                this.state.status = 'error';
                this.state.stopReason = err.message;
                this.manager.broadcastStatus(this.id);
            });

            this.manager.broadcastStatus(this.id);
            return { success: true, message: '账号已启动', pid: this.state.pid };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    async stop() {
        if (this.state.status !== 'running' || !this.process) {
            return { success: false, message: '账号未在运行' };
        }

        try {
            this.process.kill('SIGTERM');
            this.state.status = 'stopped';
            this.state.pid = 0;
            this.state.stopReason = '手动停止';
            this.process = null;
            this.manager.broadcastStatus(this.id);
            return { success: true, message: '账号已停止' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    updateData(data) {
        this.state.data = { ...this.state.data, ...data };
        this.manager.broadcastData(this.id, this.state.data);
    }

    updateLands(landsData) {
        this.state.lands = landsData;
        this.manager.broadcastLands(this.id, landsData);
    }

    updateLandsNotify(changedLands) {
        this.manager.broadcastLandsNotify(this.id, changedLands);
    }

    addLog(level, message) {
        this.manager.broadcastLog(this.id, level, message);
    }
}

class AccountManager {
    constructor(port = DEFAULT_PORT) {
        this.port = port;
        this.accounts = new Map();
        this.wss = null;
        
        this.app = express();
        this.server = http.createServer(this.app);
        
        this.setupRoutes();
        this.setupWebSocket();
        this.loadAccounts();
    }

    loadAccounts() {
        const indexPath = path.join(ACCOUNTS_DIR, '.index.json');
        
        if (!fs.existsSync(ACCOUNTS_DIR)) {
            fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
        }

        if (fs.existsSync(indexPath)) {
            try {
                const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
                for (const acc of index.accounts || []) {
                    const configPath = path.join(ACCOUNTS_DIR, acc.id, 'config.json');
                    let config = acc;
                    if (fs.existsSync(configPath)) {
                        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    }
                    this.accounts.set(acc.id, new AccountInstance(acc.id, config, this));
                }
                console.log(`[Manager] 已加载 ${this.accounts.size} 个账号`);
            } catch (e) {
                console.error('[Manager] 加载账号失败:', e.message);
            }
        }
    }

    saveIndex() {
        const index = {
            version: '1.0',
            accounts: Array.from(this.accounts.values()).map(acc => ({
                id: acc.id,
                name: acc.config.name || acc.id,
                platform: acc.config.platform || 'qq',
                enabled: acc.config.enabled !== false,
                status: acc.state.status,
                createdAt: acc.config.createdAt || new Date().toISOString()
            }))
        };
        
        fs.writeFileSync(
            path.join(ACCOUNTS_DIR, '.index.json'),
            JSON.stringify(index, null, 2),
            'utf8'
        );
    }

    setupRoutes() {
        this.app.use(express.json());
        
        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') return res.sendStatus(200);
            next();
        });

        // 静态文件
        this.app.use(express.static(path.join(__dirname, 'ui', 'public')));

        // ============ API 路由 ============
        
        // 获取所有账号
        this.app.get('/api/accounts', (req, res) => {
            const list = Array.from(this.accounts.values()).map(acc => ({
                id: acc.id,
                name: acc.config.name,
                platform: acc.config.platform,
                status: acc.state.status,
                pid: acc.state.pid,
                startTime: acc.state.startTime,
                data: acc.state.data,
                lands: acc.state.lands,
                config: {
                    farmInterval: acc.config.farmInterval,
                    friendInterval: acc.config.friendInterval,
                    // 好友互动
                    autoFriend: acc.config.autoFriend,
                    // 自动偷菜
                    autoSteal: acc.config.autoSteal,
                    // 自动领取
                    autoClaim: acc.config.autoClaim,
                    // 自动农作
                    autoFarm: acc.config.autoFarm,
                    autoFertilize: acc.config.autoFertilize,
                    autoLandUnlock: acc.config.autoLandUnlock,
                    autoLandUpgrade: acc.config.autoLandUpgrade,
                    autoSell: acc.config.autoSell,
                    autoBuyFertilizer: acc.config.autoBuyFertilizer,
                    autoUseFertilizer: acc.config.autoUseFertilizer,
                    selectedSeed: acc.config.selectedSeed
                }
            }));
            res.json(list);
        });

        // 获取单个账号
        this.app.get('/api/accounts/:id', (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });
            
            res.json({
                id: acc.id,
                name: acc.config.name,
                platform: acc.config.platform,
                code: acc.config.code,
                status: acc.state.status,
                pid: acc.state.pid,
                data: acc.state.data,
                lands: acc.state.lands,
                config: acc.config
            });
        });

        // 创建账号
        this.app.post('/api/accounts', (req, res) => {
            const { name, code, platform, farmInterval, friendInterval, autoSell, autoFriend, autoSteal, autoClaim, autoFarm, autoFertilize, autoLandUnlock, autoLandUpgrade, autoBuyFertilizer, autoUseFertilizer } = req.body;
            
            if (!name || !code) {
                return res.status(400).json({ error: '缺少必要参数: name, code' });
            }

            const id = 'acc_' + uuidv4().substring(0, 8);
            const config = {
                id,
                name,
                code,
                platform: platform || 'qq',
                farmInterval: farmInterval || 1,
                friendInterval: friendInterval || 2,
                // 好友互动
                autoFriend: false,
                // 自动偷菜
                autoSteal: false,
                // 自动领取
                autoClaim: false,
                // 自动农作
                autoFarm: false,
                autoFertilize: false,
                autoLandUnlock: false,
                autoLandUpgrade: false,
                autoSell: false,
                autoBuyFertilizer: false,
                autoUseFertilizer: false,
                enabled: true,
                createdAt: new Date().toISOString()
            };

            const acc = new AccountInstance(id, config, this);
            this.accounts.set(id, acc);
            this.saveIndex();

            res.json({ success: true, id, message: '账号创建成功' });
        });

        // 扫码登录 - 启动扫码
        const scanStates = new Map();
        
        this.app.post('/api/accounts/scan/start', async (req, res) => {
            const axios = require('axios');
            
            try {
                const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                const QUA = 'V1_HT5_QDT_0.70.2209190_x64_0_DEV_D';
                
                // 获取登录码
                const response = await axios.get('https://q.qq.com/ide/devtoolAuth/GetLoginCode', {
                    headers: {
                        qua: QUA,
                        host: 'q.qq.com',
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'user-agent': CHROME_UA,
                    },
                });
                
                const { code, data } = response.data || {};
                if (+code !== 0 || !data || !data.code) {
                    return res.json({ success: false, error: '获取扫码码失败' });
                }
                
                const loginCode = data.code;
                const qrUrl = `https://h5.qzone.qq.com/qqq/code/${loginCode}?_proxy=1&from=ide`;
                
                scanStates.set(loginCode, {
                    status: 'wait',
                    startTime: Date.now()
                });
                
                res.json({
                    success: true,
                    loginCode,
                    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`
                });
            } catch (e) {
                res.json({ success: false, error: e.message });
            }
        });

        // 扫码登录 - 轮询状态
        this.app.post('/api/accounts/scan/poll', async (req, res) => {
            const axios = require('axios');
            const { loginCode } = req.body;
            
            if (!loginCode) {
                return res.json({ success: false, error: '缺少loginCode' });
            }
            
            const state = scanStates.get(loginCode);
            if (!state) {
                return res.json({ success: false, error: '扫码已过期' });
            }
            
            if (state.status === 'ok') {
                scanStates.delete(loginCode);
                return res.json({
                    success: true,
                    status: 'ok',
                    code: state.code
                });
            }
            
            if (Date.now() - state.startTime > 180000) {
                scanStates.delete(loginCode);
                return res.json({ success: false, error: '扫码超时' });
            }
            
            try {
                const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
                const QUA = 'V1_HT5_QDT_0.70.2209190_x64_0_DEV_D';
                const FARM_APP_ID = '1112386029';
                
                // 查询扫码状态
                const response = await axios.get(
                    `https://q.qq.com/ide/devtoolAuth/syncScanSateGetTicket?code=${encodeURIComponent(loginCode)}`,
                    { headers: { qua: QUA, host: 'q.qq.com', 'user-agent': CHROME_UA } }
                );
                
                const { code, data } = response.data || {};
                if (+code === 0 && data?.ok === 1) {
                    // 获取 auth code
                    const authResponse = await axios.post(
                        'https://q.qq.com/ide/login',
                        { appid: FARM_APP_ID, ticket: data.ticket || '' },
                        { headers: { qua: QUA, host: 'q.qq.com', 'content-type': 'application/json', 'user-agent': CHROME_UA } }
                    );
                    
                    if (authResponse.data && authResponse.data.code) {
                        state.status = 'ok';
                        state.code = authResponse.data.code;
                        
                        // 立即返回code，不等待昵称
                        // 昵称将在账号启动后自动更新
                        return res.json({
                            success: true,
                            status: 'ok',
                            code: state.code
                        });
                    }
                }
                if (+code === -10003) {
                    return res.json({ success: false, error: '二维码已失效' });
                }
                
                res.json({ success: true, status: 'wait' });
            } catch (e) {
                res.json({ success: true, status: 'wait' });
            }
        });

        // 更新账号配置
        this.app.put('/api/accounts/:id', (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            const updates = req.body;
            acc.config = { ...acc.config, ...updates };
            
            // 保存配置到文件（触发热更新）
            const configPath = path.join(ACCOUNTS_DIR, acc.id, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(acc.config, null, 2), 'utf8');
            
            this.saveIndex();
            res.json({ success: true, message: '配置已更新' });
        });

        // 更新账号配置（仅热更新，不重启）
        this.app.put('/api/accounts/:id/config', (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            const updates = req.body;
            acc.config = { ...acc.config, ...updates };
            
            // 保存配置到文件（触发热更新）
            const configPath = path.join(ACCOUNTS_DIR, acc.id, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(acc.config, null, 2), 'utf8');
            
            this.broadcastLog(acc.id, 'info', `配置已热更新`);
            res.json({ success: true, message: '配置已热更新' });
        });

        // 删除账号
        this.app.delete('/api/accounts/:id', async (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            if (acc.state.status === 'running') {
                await acc.stop();
            }

            this.accounts.delete(req.params.id);
            
            // 删除账号目录
            const accountDir = path.join(ACCOUNTS_DIR, req.params.id);
            if (fs.existsSync(accountDir)) {
                fs.rmSync(accountDir, { recursive: true, force: true });
            }

            this.saveIndex();
            res.json({ success: true, message: '账号已删除' });
        });

        // 启动账号
        this.app.post('/api/accounts/:id/start', async (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            const result = await acc.start();
            res.json(result);
        });

        // 停止账号
        this.app.post('/api/accounts/:id/stop', async (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            const result = await acc.stop();
            res.json(result);
        });

        // 重启账号
        this.app.post('/api/accounts/:id/restart', async (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            await acc.stop();
            const result = await acc.start();
            res.json(result);
        });

        // 获取日志
        this.app.get('/api/accounts/:id/logs', (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            const logsDir = path.join(ACCOUNTS_DIR, acc.id, 'logs');
            if (!fs.existsSync(logsDir)) {
                return res.json([]);
            }

            try {
                const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
                const latestLog = files.sort().pop();
                if (!latestLog) {
                    return res.json([]);
                }
                
                const logPath = path.join(logsDir, latestLog);
                const content = fs.readFileSync(logPath, 'utf8');
                const lines = content.split('\n').slice(-100);
                res.json(lines);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // 获取土地数据
        this.app.get('/api/accounts/:id/lands', (req, res) => {
            const acc = this.accounts.get(req.params.id);
            if (!acc) return res.status(404).json({ error: '账号不存在' });

            res.json(acc.state.lands || { lands: [] });
        });

        // 获取经验排行榜
        this.app.get('/api/ranking/:level/:lands', (req, res) => {
            const level = parseInt(req.params.level) || 1;
            const lands = parseInt(req.params.lands) || 18;
            
            if (!getExpRanking) {
                return res.status(500).json({ error: '经验计算模块未加载' });
            }

            try {
                const ranking = getExpRanking(level, lands, 5);
                res.json(ranking);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // 获取可种植种子列表
        this.app.get('/api/seeds/:level/:lands', (req, res) => {
            const level = parseInt(req.params.level) || 1;
            const lands = parseInt(req.params.lands) || 18;
            
            if (!getPlantingRecommendation) {
                return res.status(500).json({ error: '经验计算模块未加载' });
            }

            try {
                const rec = getPlantingRecommendation(level, lands, { top: 100 });
                res.json(rec);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // ============ 内部 API ============

        // 注册
        this.app.post('/api/internal/register', (req, res) => {
            const { accountId, pid } = req.body;
            const acc = this.accounts.get(accountId);
            if (acc) {
                acc.state.pid = pid;
                acc.state.status = 'running';
                this.broadcastStatus(accountId);
            }
            res.json({ success: true });
        });

        // 心跳
        this.app.post('/api/internal/heartbeat', (req, res) => {
            res.json({ success: true });
        });

        // 状态上报
        this.app.post('/api/internal/status', (req, res) => {
            const { accountId, data } = req.body;
            const acc = this.accounts.get(accountId);
            if (acc) {
                acc.updateData(data);
                
                // 如果有昵称，自动更新配置
                if (data.name && acc.config.name !== data.name) {
                    acc.config.name = data.name;
                    const configPath = path.join(ACCOUNTS_DIR, accountId, 'config.json');
                    try {
                        fs.writeFileSync(configPath, JSON.stringify(acc.config, null, 2), 'utf8');
                    } catch (e) {}
                }
            }
            res.json({ success: true });
        });

        // 土地数据上报
        this.app.post('/api/internal/lands', (req, res) => {
            const { accountId, data } = req.body;
            const acc = this.accounts.get(accountId);
            if (acc) {
                acc.updateLands(data);
            }
            res.json({ success: true });
        });

        // 土地变化推送
        this.app.post('/api/internal/lands_notify', (req, res) => {
            const { accountId, changedLands } = req.body;
            const acc = this.accounts.get(accountId);
            if (acc) {
                acc.updateLandsNotify(changedLands);
            }
            res.json({ success: true });
        });

        // 日志上报
        this.app.post('/api/internal/log', (req, res) => {
            const { accountId, level, message, timestamp } = req.body;
            const acc = this.accounts.get(accountId);
            if (acc) {
                acc.addLog(level, message);
            }
            res.json({ success: true });
        });

        // 在线状态
        this.app.post('/api/internal/online', (req, res) => {
            const { accountId, online } = req.body;
            const acc = this.accounts.get(accountId);
            if (acc) {
                acc.state.data.online = online;
                this.broadcastStatus(accountId);
            }
            res.json({ success: true });
        });
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ server: this.server, path: '/ws' });
        
        this.wss.on('connection', (ws) => {
            // 发送初始账号快照
            const snapshot = {
                type: 'accounts_snapshot',
                accounts: Array.from(this.accounts.values()).map(acc => ({
                    id: acc.id,
                    name: acc.config.name,
                    status: acc.state.status,
                    pid: acc.state.pid,
                    data: acc.state.data,
                    lands: acc.state.lands,
                    config: acc.config
                }))
            };
            ws.send(JSON.stringify(snapshot));

            ws.on('message', (msg) => {
                try {
                    const data = JSON.parse(msg);
                    if (data.type === 'subscribe') {
                        // 订阅逻辑已在 snapshot 中处理
                    }
                } catch (e) {}
            });

            ws.on('close', () => {
            });
        });
    }

    broadcast(data) {
        if (this.wss) {
            const msg = JSON.stringify(data);
            this.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(msg);
                }
            });
        }
    }

    broadcastStatus(accountId) {
        const acc = this.accounts.get(accountId);
        if (!acc) return;
        
        this.broadcast({
            type: 'account_status',
            accountId,
            status: acc.state.status,
            pid: acc.state.pid,
            config: acc.config,
            timestamp: new Date().toISOString()
        });
    }

    broadcastData(accountId, data) {
        this.broadcast({
            type: 'account_data',
            accountId,
            data,
            timestamp: new Date().toISOString()
        });
    }

    broadcastLands(accountId, lands) {
        this.broadcast({
            type: 'lands_update',
            accountId,
            data: lands,
            timestamp: new Date().toISOString()
        });
    }

    broadcastLandsNotify(accountId, changedLands) {
        this.broadcast({
            type: 'lands_notify',
            accountId,
            changedLands,
            timestamp: new Date().toISOString()
        });
    }

    broadcastLog(accountId, level, message) {
        this.broadcast({
            type: 'log',
            accountId,
            level,
            message,
            timestamp: new Date().toISOString()
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`========================================`);
            console.log(`  农场管理系统已启动`);
            console.log(`  Web UI: http://localhost:${this.port}`);
            console.log(`========================================`);
        });
    }
}

// 启动
const port = process.argv.find(arg => arg.startsWith('--port='))
    ?.split('=')[1] || DEFAULT_PORT;

const manager = new AccountManager(parseInt(port));
manager.start();

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n[Manager] 正在关闭...');
    for (const acc of manager.accounts.values()) {
        if (acc.state.status === 'running') {
            acc.stop();
        }
    }
    process.exit(0);
});
