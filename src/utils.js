/**
 * 通用工具函数
 */

const Long = require('long');
const { RUNTIME_HINT_MASK, RUNTIME_HINT_DATA } = require('./config');

let webUIAddLog = null;
let currentAccountId = null;
try {
    const webUI = require('./webUI');
    webUIAddLog = webUI.addLog || ((accountId, tag, msg) => {
        console.log(`[LOG] ${tag}: ${msg}`);
    });
} catch (e) {
    webUIAddLog = (accountId, tag, msg) => {
        console.log(`[LOG] ${tag}: ${msg}`);
    };
}

function setCurrentAccountId(accountId) {
    currentAccountId = accountId;
}

function getCurrentAccountId() {
    return currentAccountId;
}

// ============ 服务器时间状态 ============
let serverTimeMs = 0;
let localTimeAtSync = 0;

// ============ 类型转换 ============
function toLong(val) {
    return Long.fromNumber(val);
}

function toNum(val) {
    if (Long.isLong(val)) return val.toNumber();
    return val || 0;
}

// ============ 时间相关 ============
function now() {
    return new Date().toLocaleTimeString();
}

/** 获取当前推算的服务器时间(秒) */
function getServerTimeSec() {
    if (!serverTimeMs) return Math.floor(Date.now() / 1000);
    const elapsed = Date.now() - localTimeAtSync;
    return Math.floor((serverTimeMs + elapsed) / 1000);
}

/** 同步服务器时间 */
function syncServerTime(ms) {
    serverTimeMs = ms;
    localTimeAtSync = Date.now();
}

/**
 * 将时间戳归一化为秒级
 * 大于 1e12 认为是毫秒级，转换为秒级
 */
function toTimeSec(val) {
    const n = toNum(val);
    if (n <= 0) return 0;
    if (n > 1e12) return Math.floor(n / 1000);
    return n;
}

// 终端需要输出的标签（游戏操作日志不输出到终端，只发前端）
const CONSOLE_TAGS = ['WS', '登录', '系统', '心跳', '推送', '限制', '好友', '申请', '声明', '错误'];

// ============ 日志 ============
function log(tag, msg) {
    // 终端输出：只输出关键日志
    if (CONSOLE_TAGS.includes(tag)) {
        console.log(`[${now()}] [${tag}] ${msg}`);
    }
    // 前端：所有日志都发送
    if (webUIAddLog && currentAccountId) {
        webUIAddLog(currentAccountId, tag, msg);
    }
}

function logWarn(tag, msg) {
    // 终端始终输出警告
    console.log(`[${now()}] [${tag}] ⚠ ${msg}`);
    // 前端
    if (webUIAddLog && currentAccountId) {
        webUIAddLog(currentAccountId, tag, '⚠ ' + msg);
    }
}

// ============ 异步工具 ============
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

let hintPrinted = false;
function decodeRuntimeHint() {
    return String.fromCharCode(...RUNTIME_HINT_DATA.map(n => n ^ RUNTIME_HINT_MASK));
}

/**
 * 输出开源声明：
 * - force=true 时必定输出（用于启动）
 * - 默认低频输出（用于业务流程中的隐性提示）
 */
function emitRuntimeHint(force = false) {
    if (!force) {
        // 约 3.3% 概率，且同一次进程最多输出 2 次
        if (Math.random() > 0.033) return;
        if (hintPrinted && Math.random() > 0.2) return;
    }
    log('声明', decodeRuntimeHint());
    hintPrinted = true;
}

module.exports = {
    toLong, toNum, now,
    getServerTimeSec, syncServerTime, toTimeSec,
    log, logWarn, sleep,
    emitRuntimeHint,
    setCurrentAccountId,
    getCurrentAccountId,
};
