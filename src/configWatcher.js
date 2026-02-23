/**
 * 配置热更新监听模块
 * 监听 config.json 文件变化，动态更新运行时配置
 */

const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config');

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

    if (newConfig.autoTask !== undefined) {
        if (CONFIG.autoTask !== newConfig.autoTask) {
            CONFIG.autoTask = newConfig.autoTask;
            changed = true;
            console.log(`[Config] 热更新: autoTask=${newConfig.autoTask}`);
        }
    }

    if (newConfig.autoSteal !== undefined) {
        if (CONFIG.autoSteal !== newConfig.autoSteal) {
            CONFIG.autoSteal = newConfig.autoSteal;
            changed = true;
            console.log(`[Config] 热更新: autoSteal=${newConfig.autoSteal}`);
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

    if (newConfig.autoHelp !== undefined) {
        if (CONFIG.autoHelp !== newConfig.autoHelp) {
            CONFIG.autoHelp = newConfig.autoHelp;
            changed = true;
            console.log(`[Config] 热更新: autoHelp=${newConfig.autoHelp}`);
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
