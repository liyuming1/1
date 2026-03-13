/**
 * 访客记录模块
 * 获取谁来过你的农场
 */

const { types } = require('./proto');
const { sendMsgAsync } = require('./network');
const { toNum, toLong, logWarn } = require('./utils');
const { getPlantName, getPlantById, getFruitName, getPlantByFruitId, getPlantBySeedId } = require('./gameConfig');

const RPC_CANDIDATES = [
    ['gamepb.interactpb.InteractService', 'InteractRecords'],
    ['gamepb.interactpb.InteractService', 'GetInteractRecords'],
    ['gamepb.interactpb.VisitorService', 'InteractRecords'],
    ['gamepb.interactpb.VisitorService', 'GetInteractRecords'],
];

const ACTION_LABELS = {
    1: '偷菜',
    2: '帮忙',
    3: '捣乱',
};

function getActionLabel(actionType) {
    return ACTION_LABELS[actionType] || '互动';
}

function resolveCropName(cropId) {
    const id = Number(cropId) || 0;
    if (id <= 0) return '';
    if (getPlantById(id)) return getPlantName(id);
    if (getPlantByFruitId(id)) return getFruitName(id);
    return '';
}

function getCropNumBySeedId(seedId) {
    const plant = getPlantBySeedId(seedId);
    if (plant && plant.fruit) {
        return plant.fruit.id;
    }
    return null;
}

function normalizeInteractRecord(record, index) {
    const actionType = toNum(record && record.action_type);
    const visitorGid = toNum(record && record.visitor_gid);
    const cropId = toNum(record && record.crop_id);
    const cropCount = toNum(record && record.crop_count);
    const times = toNum(record && record.times);
    const level = toNum(record && record.level);
    const fromType = toNum(record && record.from_type);
    const serverTimeSec = toNum(record && record.server_time);
    const cropName = resolveCropName(cropId);
    const cropNum = getCropNumBySeedId(cropId);
    const nick = String((record && record.nick) || '').trim() || `GID:${visitorGid}`;
    const avatarUrl = String((record && record.avatar_url) || '').trim();
    
    const extra = record && record.extra;
    const landId = extra ? toNum(extra.land_id) : 0;

    return {
        key: `${serverTimeSec || 0}-${visitorGid || 0}-${actionType || 0}-${index}`,
        serverTimeSec,
        serverTimeMs: serverTimeSec > 0 ? serverTimeSec * 1000 : 0,
        actionType,
        actionLabel: getActionLabel(actionType),
        visitorGid,
        nick,
        avatarUrl,
        cropId,
        cropName,
        cropNum,
        cropCount,
        times,
        level,
        fromType,
        landId,
    };
}

async function getInteractRecords() {
    if (!types.InteractRecordsRequest) {
        throw new Error('访客记录 proto 未加载');
    }

    const body = types.InteractRecordsRequest.encode(types.InteractRecordsRequest.create({})).finish();
    const errors = [];

    for (const [serviceName, methodName] of RPC_CANDIDATES) {
        try {
            const { body: replyBody } = await sendMsgAsync(serviceName, methodName, body, 2500);
            const reply = types.InteractRecordsReply.decode(replyBody);
            const records = (reply.records || []).map(normalizeInteractRecord);
            return records.sort((a, b) => b.serverTimeSec - a.serverTimeSec);
        } catch (error) {
            const message = error && error.message ? error.message : String(error || 'unknown');
            errors.push(`${serviceName}.${methodName}: ${message}`);
        }
    }

    return [];
}

module.exports = {
    getInteractRecords,
    getActionLabel,
};
