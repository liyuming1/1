/**
 * QQ经典农场 挂机脚本 - 入口文件
 *
 * 支持多账号运行
 *   src/config.js   - 配置常量与枚举
 *   src/utils.js    - 通用工具函数
 *   src/proto.js    - Protobuf 加载与类型管理
 *   src/network.js  - WebSocket 连接/消息编解码/登录/心跳
 *   src/farm.js     - 自己农场操作与巡田循环
 *   src/friend.js   - 好友农场操作与巡查循环
 *   src/accountManager.js - 账号管理
 *   src/webUI.js    - Web UI 服务
 */

const { CONFIG } = require('./src/config');
const { loadProto } = require('./src/proto');
const { initWebUI, broadcastAccounts, broadcastAccountUpdate, accountManager, setStartAccountCallback } = require('./src/webUI');
const { connect, cleanup, disconnect, getWs, getUserState, setDisconnectCallback } = require('./src/network');
const { startFarmCheckLoop, stopFarmCheckLoop } = require('./src/farm');
const { startFriendCheckLoop, stopFriendCheckLoop } = require('./src/friend');
const { initTaskSystem, cleanupTaskSystem } = require('./src/task');
const { initStatusBar, cleanupStatusBar, setStatusPlatform, updateStatusFromLogin, updateStatusGold, updateStatusLevel, statusData } = require('./src/status');
const { startSellLoop, stopSellLoop, debugSellFruits } = require('./src/warehouse');
const { processInviteCodes } = require('./src/invite');
const { verifyMode, decodeMode } = require('./src/decode');
const { emitRuntimeHint, sleep, setCurrentAccountId } = require('./src/utils');
const { getQQFarmCodeByScan } = require('./src/qqQrLogin');
const { initFileLogger } = require('./src/logger');

initFileLogger();

function showHelp() {
    console.log(`
QQ经典农场 挂机脚本 (多账号版)
=============================

用法:
  node client.js                    # 启动 Web UI (通过网页添加账号)
  node client.js --single --code <code>  # 单账号模式
  node client.js --verify
  node client.js --decode <数据>

参数:
  --single                  单账号模式（使用命令行参数）
  --code <登录code>         小程序登录凭证
  --wx                      微信平台
  --interval <秒>           农场巡查间隔
  --friend-interval <秒>    好友巡查间隔

功能:
  - 通过 Web UI 添加和管理多账号
  - 每个账号独立配置
  - 实时状态监控
`);
}

function parseArgs(args) {
    const options = {
        singleMode: false,
        code: '',
        qrLogin: false,
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--single') {
            options.singleMode = true;
        }
        if (args[i] === '--code' && args[i + 1]) {
            options.code = args[++i];
        }
        if (args[i] === '--qr') {
            options.qrLogin = true;
        }
        if (args[i] === '--wx') {
            CONFIG.platform = 'wx';
        }
        if (args[i] === '--interval' && args[i + 1]) {
            CONFIG.farmCheckInterval = Math.max(parseInt(args[++i]), 1) * 1000;
        }
        if (args[i] === '--friend-interval' && args[i + 1]) {
            CONFIG.friendCheckInterval = Math.max(parseInt(args[++i]), 1) * 1000;
        }
    }
    return options;
}

async function startAccount(account) {
    console.log(`[账号] ${account.name} 启动中...`);
    
    // 先停止现有的账号
    if (getUserState().gid) {
        console.log(`[账号] 停止现有账号...`);
        stopFarmCheckLoop();
        stopFriendCheckLoop();
        cleanupTaskSystem();
        stopSellLoop();
        disconnect();
        // 等待旧连接完全断开
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 设置被踢下线的回调
    setDisconnectCallback((reason) => {
        console.log(`[账号] ${account.name} 被踢下线，原因: ${reason}`);
        stopFarmCheckLoop();
        stopFriendCheckLoop();
        cleanupTaskSystem();
        stopSellLoop();
        accountManager.updateAccountStatus(account.id, { online: false });
        broadcastAccounts();
        broadcastAccountUpdate(accountManager.getAccount(account.id));
    });
    
    CONFIG.platform = account.platform;
    setCurrentAccountId(account.id);
    
    try {
        await new Promise((resolve, reject) => {
            const handleLogin = async () => {
                try {
                    const userState = getUserState();
                    updateStatusFromLogin({ name: userState.name, level: userState.level, gold: userState.gold, exp: userState.exp });
                    setStatusPlatform(account.platform);
                    
                    await processInviteCodes();
                    startFarmCheckLoop();
                    startFriendCheckLoop();
                    
                    const autoTask = account.config && account.config.autoTask !== false;
                    if (autoTask) {
                        initTaskSystem();
                    }
                    
                    const autoSell = account.config && account.config.autoSell !== false;
                    if (autoSell) {
                        setTimeout(() => debugSellFruits(), 5000);
                        startSellLoop(60000);
                    }

                    // 更新顶层 name（前端账号列表显示用）
                    accountManager.updateAccount(account.id, { name: userState.name });

                    // 更新状态（状态显示用）
                    const { getAllLands } = require('./src/farm');
                    let landsCount = 18;
                    let retryCount = 0;
                    const maxRetries = 3;
                    while (retryCount < maxRetries) {
                        try {
                            const landsReply = await getAllLands();
                            if (landsReply && landsReply.lands && landsReply.lands.length > 0) {
                                landsCount = landsReply.lands.filter(l => l && l.unlocked).length;
                                break;
                            } else {
                                console.log(`[账号] ${account.name} 获取土地数量返回数据为空，重试 ${retryCount + 1}/${maxRetries}`);
                            }
                        } catch (e) {
                            console.log(`[账号] ${account.name} 获取土地数量失败: ${e.message}，重试 ${retryCount + 1}/${maxRetries}`);
                        }
                        retryCount++;
                        if (retryCount < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                    if (retryCount >= maxRetries) {
                        console.log(`[账号] ${account.name} 获取土地数量失败，使用默认值 ${landsCount}`);
                    }
                    
                    accountManager.updateAccountStatus(account.id, { 
                        online: true,
                        level: userState.level,
                        gold: userState.gold,
                        exp: userState.exp,
                        landsCount: landsCount
                    });
                    broadcastAccounts();
                    broadcastAccountUpdate(accountManager.getAccount(account.id));
                    
                    console.log(`[账号] ${account.name} 已启动`);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };

            connect(account.code, handleLogin);
        });
    } catch (e) {
        console.error(`[账号] ${account.name} 启动失败:`, e.message);
        accountManager.updateAccountStatus(account.id, { online: false });
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    await loadProto();

    if (args.includes('--verify')) {
        await verifyMode();
        return;
    }

    if (args.includes('--decode')) {
        await decodeMode(args);
        return;
    }

    const options = parseArgs(args);

    if (options.singleMode) {
        if (!options.code && options.qrLogin) {
            console.log('[扫码登录] 正在获取二维码...');
            options.code = await getQQFarmCodeByScan();
            console.log(`[扫码登录] 获取成功`);
        }
        
        if (!options.code) {
            showHelp();
            process.exit(1);
        }

        initStatusBar();
        initWebUI(3000);

        console.log(`[启动] 单账号模式 code=${options.code.substring(0, 8)}...`);
        
        // 单账号模式使用默认账号ID
        const SINGLE_ACCOUNT_ID = 'single_account';
        setCurrentAccountId(SINGLE_ACCOUNT_ID);
        
        // 确保默认账号存在于 accountManager 中
        let singleAccount = accountManager.getAccount(SINGLE_ACCOUNT_ID);
        if (!singleAccount) {
            // 先删除可能存在的旧账号（如果有）
            const existingAccounts = accountManager.getAllAccounts();
            for (const acc of existingAccounts) {
                if (acc.name === '单账号') {
                    accountManager.removeAccount(acc.id);
                }
            }
            // 添加新账号
            singleAccount = accountManager.addAccount('单账号', CONFIG.platform);
            singleAccount.id = SINGLE_ACCOUNT_ID;
            singleAccount.code = options.code;
            singleAccount.enabled = true;
            accountManager.saveAccounts();
        }
        
        connect(options.code, async () => {
            await processInviteCodes();
            startFarmCheckLoop();
            startFriendCheckLoop();
            initTaskSystem();
            setTimeout(() => debugSellFruits(), 5000);
            startSellLoop(60000);
        });

    } else {
        initWebUI(3000);
        
        setStartAccountCallback((account) => {
            console.log(`[账号] 检测到新账号 ${account.name}，正在启动...`);
            startAccount(account);
        });
        
        const accounts = accountManager.loadAccounts();
        console.log(`[启动] Web UI 已启动，访问 http://localhost:3000 管理账号`);
        
        if (accounts.length > 0) {
            for (const acc of accounts) {
                if (acc.enabled && acc.code) {
                    startAccount(acc);
                    await sleep(3000);
                }
            }
        }
    }

    process.on('SIGINT', () => {
        cleanupStatusBar();
        console.log('\n[退出] 正在断开...');
        stopFarmCheckLoop();
        stopFriendCheckLoop();
        cleanupTaskSystem();
        stopSellLoop();
        cleanup();
        const ws = getWs();
        if (ws) ws.close();
        process.exit(0);
    });
}

main().catch(err => {
    console.error('启动失败:', err);
    process.exit(1);
});
