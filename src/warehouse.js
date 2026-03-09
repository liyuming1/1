/**
 * 仓库系统 - 自动出售果实
 * 协议说明：BagReply 使用 item_bag（ItemBag），item_bag.items 才是背包物品列表
 */

const { CONFIG } = require('./config');
const { types } = require('./proto');
const { sendMsgAsync } = require('./network');
const { toLong, toNum, log, logWarn } = require('./utils');
const { getFruitName, getItemName, getPlantByFruitId, getPlantBySeedId, getItemImageById, getItemInfoById } = require('./gameConfig');
const seedShopData = require('../tools/seed-shop-merged-export.json');
const reporter = require('./reporter');

// 游戏内金币和点券的物品 ID (GlobalData.GodItemId / DiamondItemId)
const GOLD_ITEM_ID = 1001;
const FRUIT_ID_SET = new Set(
    ((seedShopData && seedShopData.rows) || [])
        .map(row => Number(row.fruitId))
        .filter(Number.isFinite)
);

let sellTimer = null;
let sellInterval = 60000;

function isFruitIdBySeedData(id) {
    return FRUIT_ID_SET.has(toNum(id));
}

/**
 * 从 SellReply 中提取获得的金币数量
 * 新版 SellReply 返回 get_items (repeated Item)，其中 id=1001 为金币
 */
function extractGold(sellReply) {
    if (sellReply.get_items && sellReply.get_items.length > 0) {
        for (const item of sellReply.get_items) {
            const id = toNum(item.id);
            if (id === GOLD_ITEM_ID) {
                return toNum(item.count);
            }
        }
        return 0;
    }
    if (sellReply.gold !== undefined && sellReply.gold !== null) {
        return toNum(sellReply.gold);
    }
    return 0;
}

async function getBag() {
    const body = types.BagRequest.encode(types.BagRequest.create({})).finish();
    const { body: replyBody } = await sendMsgAsync('gamepb.itempb.ItemService', 'Bag', body);
    return types.BagReply.decode(replyBody);
}

/**
 * 将 item 转为 Sell 请求所需格式（id/count/uid 保留 Long 或转成 Long，与游戏一致）
 */
function toSellItem(item) {
    const id = item.id != null ? toLong(item.id) : undefined;
    const count = item.count != null ? toLong(item.count) : undefined;
    const uid = item.uid != null ? toLong(item.uid) : undefined;
    return { id, count, uid };
}

async function sellItems(items) {
    const payload = items.map(toSellItem);
    const body = types.SellRequest.encode(types.SellRequest.create({ items: payload })).finish();
    const { body: replyBody } = await sendMsgAsync('gamepb.itempb.ItemService', 'Sell', body);
    return types.SellReply.decode(replyBody);
}

/**
 * 从 BagReply 取出物品列表（兼容 item_bag 与旧版 items）
 */
function getBagItems(bagReply) {
    if (bagReply.item_bag && bagReply.item_bag.items && bagReply.item_bag.items.length)
        return bagReply.item_bag.items;
    return bagReply.items || [];
}

async function sellAllFruits() {
    if (!CONFIG.autoSell) return;
    try {
        // 每次出售前重新获取背包数据，确保数据最新
        const bagReply = await getBag();
        const items = getBagItems(bagReply);

        const toSell = [];
        const names = [];
        for (const item of items) {
            const id = toNum(item.id);
            const count = toNum(item.count);
            const uid = item.uid ? toNum(item.uid) : 0;
            if (isFruitIdBySeedData(id) && count > 0) {
                if (uid === 0) continue;  // 跳过无效格子
                toSell.push(item);
                names.push(`${getFruitName(id)}x${count}`);
            }
        }

        if (toSell.length === 0) return;

        const reply = await sellItems(toSell);
        const totalGold = extractGold(reply);
        log('仓库', `出售 ${names.join(', ')}，获得 ${totalGold} 金币`);
        if (totalGold > 0) {
            reporter.reportStats({ sellGold: totalGold });
        }
    } catch (e) {
        // 静默忽略"XX不足"错误
        if (!e.message.includes('不足')) {
            logWarn('仓库', `出售失败: ${e.message}`);
        }
    }
}

async function debugSellFruits() {
    try {
        log('仓库', '正在检查背包...');
        const bagReply = await getBag();
        const items = getBagItems(bagReply);
        log('仓库', `背包共 ${items.length} 种物品`);

        for (const item of items) {
            const id = toNum(item.id);
            const count = toNum(item.count);
            const isFruit = isFruitIdBySeedData(id);
            if (isFruit) {
                const name = getFruitName(id);
                log('仓库', `  [果实] ${name}(${id}) x${count}`);
            }
        }

        const toSell = [];
        for (const item of items) {
            const id = toNum(item.id);
            const count = toNum(item.count);
            if (isFruitIdBySeedData(id) && count > 0)
                toSell.push(item);
        }

        if (toSell.length === 0) {
            log('仓库', '没有果实可出售');
            return;
        }

        log('仓库', `准备出售 ${toSell.length} 种果实...`);
        const reply = await sellItems(toSell);
        const totalGold = extractGold(reply);
        log('仓库', `出售完成，共获得 ${totalGold} 金币`);
    } catch (e) {
        logWarn('仓库', `调试出售失败: ${e.message}`);
        console.error(e);
    }
}

function startSellLoop(interval = 60000) {
    if (sellTimer) return;
    sellInterval = interval;
    // 延迟30秒启动，避免和巡田同时进行
    setTimeout(() => {
        sellAllFruits();
        sellTimer = setInterval(() => sellAllFruits(), sellInterval);
    }, 30000);
}

function stopSellLoop() {
    if (sellTimer) {
        clearInterval(sellTimer);
        sellTimer = null;
    }
}

// ============ 化肥购买/使用 ============

const FERTILIZER_ITEM_ID = 1011;  // 化肥ID
const FERTILIZER_NORMAL_ID = 1003;  // 普通化肥ID
const FERTILIZER_ORGANIC_ID = 1002; // 有机化肥ID
const { getUserState } = require('./network');

async function buyFertilizer(type = 2) {
    // type: 1=普通肥, 2=有机肥
    const targetId = type === 1 ? FERTILIZER_NORMAL_ID : FERTILIZER_ORGANIC_ID;
    const typeName = type === 1 ? '普通' : '有机';
    
    const { toLong } = require('./utils');
    try {
        // 获取商城列表
        const reqBody = types.GetMallListBySlotTypeRequest.encode(
            types.GetMallListBySlotTypeRequest.create({ slot_type: 1 })
        ).finish();
        const { body: replyBody } = await sendMsgAsync('gamepb.mallpb.MallService', 'GetMallListBySlotType', reqBody);
        const reply = types.GetMallListBySlotTypeResponse.decode(replyBody);
        const goodsList = reply.goods_list || [];

        // 查找化肥商品
        let fertilizerGoods = null;
        for (const goodsBytes of goodsList) {
            try {
                const goods = types.MallGoods.decode(goodsBytes);
                if (goods.goods_id === targetId) {
                    fertilizerGoods = goods;
                    break;
                }
            } catch (e) { /* 解析失败 */ }
        }

        if (!fertilizerGoods) {
            log('商城', `未找到${typeName}化肥商品`);
            return false;
        }

        // 检查点券是否足够
        const state = getUserState();
        const price = fertilizerGoods.price || 0;
        if (price > 0 && state.voucher < price) {
            log('商城', `点券不足! 需要 ${price} 点券, 当前 ${state.voucher} 点券`);
            return false;
        }

        // 购买化肥
        const purchaseReq = types.PurchaseRequest.encode(
            types.PurchaseRequest.create({ goods_id: fertilizerGoods.goods_id, count: 1 })
        ).finish();
        await sendMsgAsync('gamepb.mallpb.MallService', 'Purchase', purchaseReq);
        log('商城', `购买${typeName}化肥成功`);
        return true;
    } catch (e) {
        logWarn('商城', `购买${typeName}化肥失败: ${e.message}`);
        throw e;
    }
}

async function useFertilizer(landId) {
    const { toLong } = require('./utils');
    try {
        const body = types.UseGoodsRequest.encode(
            types.UseGoodsRequest.create({
                land_id: toLong(landId),
                goods_id: toLong(FERTILIZER_ITEM_ID),
                num: toLong(1),
            })
        ).finish();
        const { body: replyBody } = await sendMsgAsync('gamepb.plantpb.PlantService', 'UseGoods', body);
        log('施肥', `土地#${landId} 施肥成功`);
        return reply;
    } catch (e) {
        logWarn('施肥', `土地#${landId} 施肥失败: ${e.message}`);
        throw e;
    }
}

async function getBagDetail() {
    const bagReply = await getBag();
    const rawItems = getBagItems(bagReply);
    const merged = new Map();
    
    for (const it of (rawItems || [])) {
        const id = toNum(it.id);
        const count = toNum(it.count);
        if (id <= 0 || count <= 0) continue;
        
        let name = '';
        let category = 'item';
        
        if (id === 1 || id === 1001) {
            name = '金币';
            category = 'gold';
        } else if (id === 1002) {
            name = '点券';
            category = 'voucher';
        } else if (id === 1101) {
            name = '经验';
            category = 'exp';
        } else if (getPlantByFruitId(id)) {
            name = `${getFruitName(id)}果实`;
            category = 'fruit';
        } else if (getPlantBySeedId(id)) {
            const p = getPlantBySeedId(id);
            name = p ? `${p.name}种子` : `种子${id}`;
            category = 'seed';
        } else {
            name = getItemName(id);
        }
        
        if (!name) name = `物品${id}`;
        
        const image = getItemImageById(id);
        const info = getItemInfoById(id);
        const interactionType = info && info.interaction_type ? String(info.interaction_type) : '';
        
        if (!merged.has(id)) {
            merged.set(id, {
                id,
                count: 0,
                uid: 0,
                name,
                image,
                category,
                itemType: info ? (Number(info.type) || 0) : 0,
                price: info ? (Number(info.price) || 0) : 0,
                level: info ? (Number(info.level) || 0) : 0,
                interactionType,
                hoursText: '',
            });
        }
        const row = merged.get(id);
        row.count += count;
    }
    
    const items = Array.from(merged.values()).map((row) => {
        if (row.interactionType === 'fertilizerbucket' && row.count > 0) {
            const hoursFloor1 = Math.floor((row.count / 3600) * 10) / 10;
            row.hoursText = `${hoursFloor1.toFixed(1)}小时`;
        } else {
            row.hoursText = '';
        }
        return row;
    });
    
    items.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.id - b.id;
    });
    
    return { totalKinds: items.length, items };
}

module.exports = {
    getBag,
    sellItems,
    sellAllFruits,
    debugSellFruits,
    getBagItems,
    getBagDetail,
    startSellLoop,
    stopSellLoop,
    buyFertilizer,
    useFertilizer,
};
