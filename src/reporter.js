/**
 * 状态上报模块 - 向 Manager 报告状态/土地/日志
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

let managerUrl = null;
let accountId = null;
let accountDir = null;

function parseArgs() {
    const args = process.argv;
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--manager-url=')) {
            managerUrl = args[i].split('=')[1];
        } else if (args[i] === '--manager-url' && args[i + 1]) {
            managerUrl = args[++i];
        }
        if (args[i].startsWith('--account-id=')) {
            accountId = args[i].split('=')[1];
        } else if (args[i] === '--account-id' && args[i + 1]) {
            accountId = args[++i];
        }
        if (args[i].startsWith('--account-dir=')) {
            accountDir = args[i].split('=')[1];
        } else if (args[i] === '--account-dir' && args[i + 1]) {
            accountDir = args[++i];
        }
    }
    console.log('[Reporter] 初始化完成, accountId:', accountId);
}

parseArgs();

function getManagerUrl() {
    return managerUrl;
}

function getAccountId() {
    return accountId;
}

function getAccountDir() {
    return accountDir;
}

async function register() {
    if (!managerUrl || !accountId) {
        console.log('[Reporter] register 失败: 缺少 managerUrl 或 accountId');
        return false;
    }
    try {
        await axios.post(`${managerUrl}/api/internal/register`, {
            accountId,
            pid: process.pid
        }, { timeout: 5000 });
        console.log('[Reporter] register 成功');
        return true;
    } catch (e) {
        console.log('[Reporter] register 失败:', e.message);
        return false;
    }
}

async function heartbeat() {
    if (!managerUrl || !accountId) return;
    try {
        await axios.post(`${managerUrl}/api/internal/heartbeat`, {
            accountId,
            timestamp: Date.now()
        }, { timeout: 5000 });
    } catch (e) {}
}

async function reportStatus(data) {
    if (!managerUrl || !accountId) return;
    try {
        await axios.post(`${managerUrl}/api/internal/status`, {
            accountId,
            data
        }, { timeout: 5000 });
    } catch (e) {}
}

async function reportLands(landsData) {
    if (!managerUrl || !accountId) return;
    try {
        await axios.post(`${managerUrl}/api/internal/lands`, {
            accountId,
            data: landsData
        }, { timeout: 5000 });
    } catch (e) {}
}

async function reportLandsNotify(changedLands) {
    if (!managerUrl || !accountId) return;
    try {
        await axios.post(`${managerUrl}/api/internal/lands_notify`, {
            accountId,
            changedLands
        }, { timeout: 5000 });
    } catch (e) {}
}

async function reportLog(level, message) {
    if (!managerUrl || !accountId) return;
    try {
        await axios.post(`${managerUrl}/api/internal/log`, {
            accountId,
            level,
            message,
            timestamp: new Date().toISOString()
        }, { timeout: 5000 });
    } catch (e) {}
}

async function reportOnline(online) {
    if (!managerUrl || !accountId) return;
    try {
        await axios.post(`${managerUrl}/api/internal/online`, {
            accountId,
            online
        }, { timeout: 5000 });
    } catch (e) {}
}

function saveDataJson(data) {
    if (!accountDir) return;
    const dataPath = path.join(accountDir, 'data.json');
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
}

function saveLandsJson(landsData) {
    if (!accountDir) return;
    const landsPath = path.join(accountDir, 'lands.json');
    try {
        fs.writeFileSync(landsPath, JSON.stringify(landsData, null, 2), 'utf8');
    } catch (e) {}
}

function saveConfigJson(config) {
    if (!accountDir) return;
    const configPath = path.join(accountDir, 'config.json');
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {}
}

module.exports = {
    getManagerUrl,
    getAccountId,
    getAccountDir,
    register,
    heartbeat,
    reportStatus,
    reportLands,
    reportLandsNotify,
    reportLog,
    reportOnline,
    saveDataJson,
    saveLandsJson,
    saveConfigJson
};
