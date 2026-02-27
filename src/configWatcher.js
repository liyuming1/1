/**
 * 配置热更新监听模块
 * 监听 config.json 文件变化，动态更新运行时配置
 */

const fs = require('fs');
const path = require('path');
const { CONFIG, validateConfig } = require('./config');

let accountDir = null;
let configWatcher = null;
let onConfigChangeCallback = null;

function init() {
    const args = process.argv;
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--account-dir=')) {
            accountDir = args[i].split('=')[1];
        } else if (args[i] === '--account-dir' && args[i + 1]) {
            accountDir = args[++i];
        }
    }

    if (!accountDir) {
        return false;
    }

    const configPath = path.join(accountDir, 'config.json');
    
    if (!fs.existsSync(configPath)) {
        console.log('[ConfigWatcher] 配置文件不存在，跳过监听');
        return false;
    }

    // 加载初始配置
    try {
        const initialConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        validateConfig(initialConfig);
        applyConfig(initialConfig);
        console.log('[ConfigWatcher] 已加载初始配置');
    } catch (e) {
        console.log('[ConfigWatcher] 加载初始配置失败:', e.message);
    }
    
    let lastMtime = null;
    try {
        const stats = fs.statSync(configPath);
        lastMtime = stats.mtimeMs;
    } catch (e) {
        // ignore
    }

    configWatcher = fs.watch(configPath, { interval: 1000 }, (eventType) => {
        if (eventType !== 'change') return;
        
        try {
            const stats = fs.statSync(configPath);
            if (lastMtime && stats.mtimeMs > lastMtime) {
                lastMtime = stats.mtimeMs;
                const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                applyConfig(newConfig);
            }
        } catch (e) {
            // 忽略读取错误
        }
    });

    console.log(`[ConfigWatcher] 已启动监听: ${configPath}`);
    return true;
}

function applyConfig(newConfig) {
    let changed = false;
    
    validateConfig(newConfig);
    
    if (newConfig.farmInterval !== undefined) {
        const newInterval = Math.max(1, parseInt(newConfig.farmInterval)) * 1000;
        if (CONFIG.farmCheckInterval !== newInterval) {
            CONFIG.farmCheckInterval = newInterval;
            changed = true;
            console.log(`[Config] 热更新: farmInterval=${newConfig.farmInterval}s`);
        }
    }

    if (newConfig.friendInterval !== undefined) {
        const newInterval = Math.max(1, parseInt(newConfig.friendInterval)) * 1000;
        if (CONFIG.friendCheckInterval !== newInterval) {
            CONFIG.friendCheckInterval = newInterval;
            changed = true;
            console.log(`[Config] 热更新: friendInterval=${newConfig.friendInterval}s`);
        }
    }

    if (newConfig.platform !== undefined) {
        if (CONFIG.platform !== newConfig.platform) {
            CONFIG.platform = newConfig.platform;
            changed = true;
            console.log(`[Config] 热更新: platform=${newConfig.platform}`);
        }
    }

    if (newConfig.autoSell !== undefined) {
        if (CONFIG.autoSell !== newConfig.autoSell) {
            CONFIG.autoSell = newConfig.autoSell;
            changed = true;
            console.log(`[Config] 热更新: autoSell=${newConfig.autoSell}`);
        }
    }

    if (newConfig.autoFarm !== undefined) {
        if (CONFIG.autoFarm !== newConfig.autoFarm) {
            CONFIG.autoFarm = newConfig.autoFarm;
            changed = true;
            console.log(`[Config] 热更新: autoFarm=${newConfig.autoFarm}`);
        }
    }

    if (newConfig.autoFertilize !== undefined) {
        if (CONFIG.autoFertilize !== newConfig.autoFertilize) {
            CONFIG.autoFertilize = newConfig.autoFertilize;
            changed = true;
            console.log(`[Config] 热更新: autoFertilize=${newConfig.autoFertilize}`);
        }
    }

    if (newConfig.forceLowestLevelCrop !== undefined) {
        if (CONFIG.forceLowestLevelCrop !== newConfig.forceLowestLevelCrop) {
            CONFIG.forceLowestLevelCrop = newConfig.forceLowestLevelCrop;
            changed = true;
            console.log(`[Config] 热更新: forceLowestLevelCrop=${newConfig.forceLowestLevelCrop}`);
        }
    }

    if (newConfig.autoSteal !== undefined) {
        if (CONFIG.autoSteal !== newConfig.autoSteal) {
            CONFIG.autoSteal = newConfig.autoSteal;
            changed = true;
            console.log(`[Config] 热更新: autoSteal=${newConfig.autoSteal}`);
        }
    }

    if (newConfig.autoFriend !== undefined) {
        if (CONFIG.autoFriend !== newConfig.autoFriend) {
            CONFIG.autoFriend = newConfig.autoFriend;
            changed = true;
            console.log(`[Config] 热更新: autoFriend=${newConfig.autoFriend}`);
        }
    }

    if (newConfig.autoClaim !== undefined) {
        if (CONFIG.autoClaim !== newConfig.autoClaim) {
            CONFIG.autoClaim = newConfig.autoClaim;
            changed = true;
            console.log(`[Config] 热更新: autoClaim=${newConfig.autoClaim}`);
        }
    }

    if (newConfig.autoLandUnlock !== undefined) {
        if (CONFIG.autoLandUnlock !== newConfig.autoLandUnlock) {
            CONFIG.autoLandUnlock = newConfig.autoLandUnlock;
            changed = true;
            console.log(`[Config] 热更新: autoLandUnlock=${newConfig.autoLandUnlock}`);
        }
    }

    if (newConfig.autoLandUpgrade !== undefined) {
        if (CONFIG.autoLandUpgrade !== newConfig.autoLandUpgrade) {
            CONFIG.autoLandUpgrade = newConfig.autoLandUpgrade;
            changed = true;
            console.log(`[Config] 热更新: autoLandUpgrade=${newConfig.autoLandUpgrade}`);
        }
    }

    if (newConfig.autoBuyFertilizer !== undefined) {
        if (CONFIG.autoBuyFertilizer !== newConfig.autoBuyFertilizer) {
            CONFIG.autoBuyFertilizer = newConfig.autoBuyFertilizer;
            changed = true;
            console.log(`[Config] 热更新: autoBuyFertilizer=${newConfig.autoBuyFertilizer}`);
        }
    }

    if (newConfig.autoUseFertilizer !== undefined) {
        if (CONFIG.autoUseFertilizer !== newConfig.autoUseFertilizer) {
            CONFIG.autoUseFertilizer = newConfig.autoUseFertilizer;
            changed = true;
            console.log(`[Config] 热更新: autoUseFertilizer=${newConfig.autoUseFertilizer}`);
        }
    }

    if (newConfig.notStealPlants !== undefined) {
        if (JSON.stringify(CONFIG.notStealPlants) !== JSON.stringify(newConfig.notStealPlants)) {
            CONFIG.notStealPlants = newConfig.notStealPlants;
            changed = true;
            console.log(`[Config] 热更新: notStealPlants=${JSON.stringify(newConfig.notStealPlants)}`);
        }
    }

    if (newConfig.selectedSeed !== undefined) {
        if (CONFIG.selectedSeed !== newConfig.selectedSeed) {
            CONFIG.selectedSeed = newConfig.selectedSeed;
            changed = true;
            console.log(`[Config] 热更新: selectedSeed=${newConfig.selectedSeed}`);
        }
    }

    if (onConfigChangeCallback) {
        onConfigChangeCallback(newConfig, changed);
    }
}

function onConfigChange(callback) {
    onConfigChangeCallback = callback;
}

function cleanup() {
    if (configWatcher) {
        configWatcher.close();
        configWatcher = null;
    }
}

module.exports = {
    init,
    applyConfig,
    onConfigChange,
    cleanup
};
