/**
 * 好友缓存管理模块
 * 手动导入GID好友，持久化存储，支持热更新
 */

const fs = require('fs');
const path = require('path');

let friendCache = [];
let blacklist = [];
let cacheFilePath = null;
let blacklistFilePath = null;
let cacheWatcher = null;
let currentAccountId = null;

function setAccountId(accountId) {
    currentAccountId = accountId;
    cacheFilePath = null;
    blacklistFilePath = null;
    friendCache = [];
    blacklist = [];
    
    if (accountId) {
        const accountDir = path.join(process.cwd(), 'accounts', accountId);
        if (fs.existsSync(accountDir)) {
            cacheFilePath = path.join(accountDir, 'friend-cache.json');
            blacklistFilePath = path.join(accountDir, 'friend-blacklist.json');
        }
    }
}

function getCacheFilePath() {
    if (cacheFilePath) return cacheFilePath;
    
    let accountDir = null;
    
    if (currentAccountId) {
        accountDir = path.join(process.cwd(), 'accounts', currentAccountId);
    }
    
    if (!accountDir || !fs.existsSync(accountDir)) {
        const args = process.argv;
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('--account-dir=')) {
                accountDir = args[i].split('=')[1];
            } else if (args[i] === '--account-dir' && args[i + 1]) {
                accountDir = args[++i];
            }
        }
    }
    
    if (!accountDir) {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        cacheFilePath = path.join(dataDir, 'friend-cache.json');
    } else {
        cacheFilePath = path.join(accountDir, 'friend-cache.json');
    }
    
    return cacheFilePath;
}

function loadFriendCache() {
    const filePath = getCacheFilePath();
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                friendCache = parsed;
            }
        }
    } catch (e) {
        // ignore
    }
    return friendCache;
}

function saveFriendCache() {
    const filePath = getCacheFilePath();
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(friendCache, null, 2), 'utf8');
        return true;
    } catch (e) {
        return false;
    }
}

function getFriendCache() {
    loadFriendCache();
    return friendCache;
}

function importFriendGids(gidList) {
    if (!Array.isArray(gidList) || gidList.length === 0) {
        return { success: false, message: 'GID列表为空', count: 0 };
    }
    
    const existingGids = new Set(friendCache.map(f => f.gid));
    const newFriends = [];
    
    for (const gid of gidList) {
        const numGid = Number(gid);
        if (!numGid || numGid <= 0 || isNaN(numGid)) continue;
        if (existingGids.has(numGid)) continue;
        
        existingGids.add(numGid);
        newFriends.push({
            gid: numGid,
            nick: `GID:${numGid}`,
            open_id: '',
            avatarUrl: ''
        });
    }
    
    if (newFriends.length > 0) {
        friendCache = [...friendCache, ...newFriends];
        saveFriendCache();
    }
    
    return {
        success: true,
        message: `成功导入 ${newFriends.length} 个GID`,
        count: newFriends.length,
        total: friendCache.length
    };
}

function clearFriendCache() {
    friendCache = [];
    saveFriendCache();
    console.log('[好友缓存] 已清空');
    return true;
}

function getBlacklistFilePath() {
    if (blacklistFilePath) return blacklistFilePath;
    
    let accountDir = null;
    
    if (currentAccountId) {
        accountDir = path.join(process.cwd(), 'accounts', currentAccountId);
    }
    
    if (!accountDir || !fs.existsSync(accountDir)) {
        const args = process.argv;
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('--account-dir=')) {
                accountDir = args[i].split('=')[1];
            } else if (args[i] === '--account-dir' && args[i + 1]) {
                accountDir = args[++i];
            }
        }
    }
    
    if (!accountDir) {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        blacklistFilePath = path.join(dataDir, 'friend-blacklist.json');
    } else {
        blacklistFilePath = path.join(accountDir, 'friend-blacklist.json');
    }
    
    return blacklistFilePath;
}

function loadBlacklist() {
    const filePath = getBlacklistFilePath();
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                blacklist = parsed;
            }
        }
    } catch (e) {
        // ignore
    }
    return blacklist;
}

function saveBlacklist() {
    const filePath = getBlacklistFilePath();
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(blacklist, null, 2), 'utf8');
        return true;
    } catch (e) {
        return false;
    }
}

function getBlacklist() {
    loadBlacklist();
    return blacklist;
}

function addToBlacklist(gid) {
    const numGid = Number(gid);
    if (!numGid || numGid <= 0 || isNaN(numGid)) {
        return { success: false, message: '无效的GID', count: 0 };
    }
    
    loadBlacklist();
    
    if (blacklist.some(f => f.gid === numGid)) {
        return { success: false, message: '该好友已在黑名单中', count: 0 };
    }
    
    blacklist.push({
        gid: numGid,
        nick: `GID:${numGid}`,
        addedAt: new Date().toISOString()
    });
    
    saveBlacklist();
    
    return { success: true, message: `已将 ${numGid} 加入黑名单`, count: 1, total: blacklist.length };
}

function removeFromBlacklist(gid) {
    const numGid = Number(gid);
    if (!numGid || numGid <= 0 || isNaN(numGid)) {
        return { success: false, message: '无效的GID', count: 0 };
    }
    
    loadBlacklist();
    
    const idx = blacklist.findIndex(f => f.gid === numGid);
    if (idx === -1) {
        return { success: false, message: '该好友不在黑名单中', count: 0 };
    }
    
    blacklist.splice(idx, 1);
    saveBlacklist();
    
    return { success: true, message: `已将 ${numGid} 从黑名单移除`, count: 1, total: blacklist.length };
}

function isInBlacklist(gid) {
    const numGid = Number(gid);
    if (!numGid) return false;
    
    if (blacklist.length === 0) {
        loadBlacklist();
    }
    
    return blacklist.some(f => f.gid === numGid);
}

function watchFriendCache(callback) {
    const filePath = getCacheFilePath();
    
    // 先加载一次
    loadFriendCache();
    
    // 使用 fs.watch 监听文件变化
    try {
        if (cacheWatcher) {
            cacheWatcher.close();
        }
        
        cacheWatcher = fs.watch(filePath, (eventType) => {
            if (eventType === 'change') {
                setTimeout(() => {
                    const oldCache = [...friendCache];
                    loadFriendCache();
                    
                    if (JSON.stringify(oldCache) !== JSON.stringify(friendCache)) {
                        if (callback && typeof callback === 'function') {
                            callback(friendCache);
                        }
                    }
                }, 500);
            }
        });
    } catch (e) {
        // ignore
    }
}

function stopWatchFriendCache() {
    if (cacheWatcher) {
        cacheWatcher.close();
        cacheWatcher = null;
    }
}

module.exports = {
    setAccountId,
    loadFriendCache,
    saveFriendCache,
    getFriendCache,
    importFriendGids,
    clearFriendCache,
    getBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    isInBlacklist,
    watchFriendCache,
    stopWatchFriendCache
};
