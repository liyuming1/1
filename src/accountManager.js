const fs = require('fs');
const path = require('path');
const { createQrCode, checkQrStatus } = require('./qqQrLogin');
const { CONFIG } = require('./config');

const ACCOUNTS_FILE = path.join(__dirname, '../accounts.json');

let accounts = [];

function loadAccounts() {
    try {
        const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
        const json = JSON.parse(data);
        accounts = json.accounts || [];
    } catch (e) {
        accounts = [];
    }
    return accounts;
}

function saveAccounts() {
    try {
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({ accounts }, null, 2));
    } catch (e) {
        console.error('保存账号失败:', e.message);
    }
}

function generateAccountId() {
    return 'acc_' + Date.now();
}

function addAccount(name, platform, ownerId = null) {
    const id = generateAccountId();
    const account = {
        id,
        name: name || `账号${accounts.length + 1}`,
        platform,
        ownerId,
        code: '',
        qrStatus: 'pending',
        config: {
            farmCheckInterval: CONFIG.farmCheckInterval / 1000,
            friendCheckInterval: CONFIG.friendCheckInterval / 1000,
            seedId: null,
            autoFarm: false,
            autoFertilize: false,
            autoSteal: false,
            autoHelp: false,
            autoPutBug: false,
            autoPutWeed: false,
            autoSell: false,
            autoTask: false,
            stealMinLevel: 0,
        },
        enabled: false,
        status: {
            online: false,
            name: '',
            level: 0,
            gold: 0,
            exp: 0,
            landsCount: 18,
            warehouse: {},
            lands: [],
            startTime: null,
        },
        logs: [],
    };
    accounts.push(account);
    saveAccounts();
    return account;
}

function removeAccount(id) {
    const index = accounts.findIndex(a => a.id === id);
    if (index !== -1) {
        accounts.splice(index, 1);
        saveAccounts();
        return true;
    }
    return false;
}

function updateAccount(id, data) {
    const account = accounts.find(a => a.id === id);
    if (account) {
        Object.assign(account, data);
        saveAccounts();
        return account;
    }
    return null;
}

function getAccount(id) {
    return accounts.find(a => a.id === id);
}

function getAllAccounts(ownerId = null) {
    if (ownerId === null || ownerId === undefined || ownerId === '') {
        return accounts;
    }
    return accounts.filter(a => a.ownerId === ownerId);
}

function updateAccountStatus(id, status) {
    const account = accounts.find(a => a.id === id);
    if (account) {
        Object.assign(account.status, status);
    }
}

function updateAccountConfig(id, config) {
    const account = accounts.find(a => a.id === id);
    if (account) {
        Object.assign(account.config, config);
        saveAccounts();
    }
}

function getAccountConfig(id) {
    const account = accounts.find(a => a.id === id);
    return account ? account.config : null;
}

function addAccountLog(id, type, message) {
    const account = accounts.find(a => a.id === id);
    if (account) {
        if (!account.logs) account.logs = [];
        account.logs.unshift({
            time: new Date().toLocaleTimeString(),
            type,
            message
        });
        if (account.logs.length > 100) {
            account.logs.pop();
        }
    }
}

let currentQrLoginCode = null;
let currentQrOwnerId = null;

async function createQrCodeForAccount(ownerId = null) {
    const { loginCode, qrImage } = await createQrCode();
    currentQrLoginCode = loginCode;
    currentQrOwnerId = ownerId;
    return { qrImage };
}

async function checkQrAndStartAccount(ownerId = null) {
    if (!currentQrLoginCode) {
        return { status: 'no_qr' };
    }

    const result = await checkQrStatus(currentQrLoginCode);
    
    if (result.status === 'OK') {
        const account = addAccount(`账号${accounts.length + 1}`, 'qq', currentQrOwnerId || ownerId);
        account.code = result.code;
        account.enabled = true;
        account.status.startTime = Date.now();
        account.name = '扫码成功，启动中...';
        saveAccounts();
        
        currentQrLoginCode = null;
        
        return { 
            status: 'success', 
            account: {
                id: account.id,
                name: account.name,
                code: account.code,
                platform: account.platform,
                enabled: account.enabled,
                config: account.config,
                status: account.status
            }
        };
    }
    
    if (result.status === 'Used') {
        currentQrLoginCode = null;
        return { status: 'used' };
    }
    
    return { status: result.status };
}

module.exports = {
    loadAccounts,
    saveAccounts,
    addAccount,
    removeAccount,
    updateAccount,
    getAccount,
    getAllAccounts,
    updateAccountStatus,
    updateAccountConfig,
    getAccountConfig,
    addAccountLog,
    createQrCodeForAccount,
    checkQrAndStartAccount,
};
