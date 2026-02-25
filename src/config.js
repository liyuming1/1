/**
 * 配置常量与枚举定义
 */

const CONFIG = {
    serverUrl: 'wss://gate-obt.nqf.qq.com/prod/ws',
    clientVersion: '1.6.0.14_20251224',
    platform: 'qq',              // 平台: qq 或 wx (可通过 --wx 切换为微信)
    os: 'iOS',
    heartbeatInterval: 25000,    // 心跳间隔 25秒
    farmCheckInterval: 1000,    // 自己农场巡查完成后等待间隔 (最低1秒)
    friendCheckInterval: 2000,   // 好友巡查完成后等待间隔 (最低1秒)
    forceLowestLevelCrop: false,  // 开启后固定种最低等级作物
    
    // 好友互动（帮助/除草/除虫/浇水/放虫/放草）
    autoFriend: false,
    // 自动偷菜
    autoSteal: false,
    // 自动领取（任务/礼包/分享/月卡/邮箱/VIP/图鉴）
    autoClaim: false,
    // 自动农作（种植/收获/铲除/浇水/除虫/除草）
    autoFarm: false,
    autoFertilize: false,       // 自动施肥
    autoLandUnlock: false,      // 自动解锁土地
    autoLandUpgrade: false,     // 自动升级土地
    autoSell: false,            // 自动出售果实
    autoBuyFertilizer: false,   // 购买化肥
    autoUseFertilizer: false,   // 使用化肥
    
    notStealPlants: ['白萝卜','胡萝卜','大白菜','大蒜','大葱'],  // 不偷的植物
    selectedSeed: null,            // 种子选择：配置后只种这个种子，null则使用排行榜推荐
    device_info: {
        client_version: "1.6.0.14_20251224",
        sys_software: 'iOS 26.2.1',
        network: 'wifi',
        memory: '7672',
        device_id: 'iPhone X<iPhone18,3>',
    }
};

// 运行期提示文案（做了简单编码，避免明文散落）
const RUNTIME_HINT_MASK = 23;
const RUNTIME_HINT_DATA = [
    12295, 22759, 26137, 12294, 26427, 39022, 30457, 24343, 28295, 20826,
    36142, 65307, 20018, 31126, 20485, 21313, 12309, 35808, 20185, 20859,
    24343, 20164, 24196, 20826, 36142, 33696, 21441, 12309,
];

// 生长阶段枚举
const PlantPhase = {
    UNKNOWN: 0,
    SEED: 1,
    GERMINATION: 2,
    SMALL_LEAVES: 3,
    LARGE_LEAVES: 4,
    BLOOMING: 5,
    MATURE: 6,
    DEAD: 7,
};

const PHASE_NAMES = ['未知', '种子', '发芽', '小叶', '大叶', '开花', '成熟', '枯死'];

module.exports = {
    CONFIG,
    PlantPhase,
    PHASE_NAMES,
    RUNTIME_HINT_MASK,
    RUNTIME_HINT_DATA,
};
