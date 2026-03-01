/**
 * 任务系统 - 自动领取任务奖励
 */

const { CONFIG } = require('./config');
const { types } = require('./proto');
const { sendMsgAsync, networkEvents } = require('./network');
const { toLong, toNum, log, logWarn, sleep } = require('./utils');
const { getItemName } = require('./gameConfig');

// ============ 任务 API ============

async function getTaskInfo() {
    const body = types.TaskInfoRequest.encode(types.TaskInfoRequest.create({})).finish();
    const { body: replyBody } = await sendMsgAsync('gamepb.taskpb.TaskService', 'TaskInfo', body);
    return types.TaskInfoReply.decode(replyBody);
}

async function claimTaskReward(taskId, doShared = false) {
    const body = types.ClaimTaskRewardRequest.encode(types.ClaimTaskRewardRequest.create({
        id: toLong(taskId),
        do_shared: doShared,
    })).finish();
    const { body: replyBody } = await sendMsgAsync('gamepb.taskpb.TaskService', 'ClaimTaskReward', body);
    return types.ClaimTaskRewardReply.decode(replyBody);
}

async function batchClaimTaskReward(taskIds, doShared = false) {
    const body = types.BatchClaimTaskRewardRequest.encode(types.BatchClaimTaskRewardRequest.create({
        ids: taskIds.map(id => toLong(id)),
        do_shared: doShared,
    })).finish();
    const { body: replyBody } = await sendMsgAsync('gamepb.taskpb.TaskService', 'BatchClaimTaskReward', body);
    return types.BatchClaimTaskRewardReply.decode(replyBody);
}

// ============ 任务分析 ============

/**
 * 分析任务列表，找出可领取的任务
 */
function analyzeTaskList(tasks) {
    const claimable = [];
    for (const task of tasks) {
        const id = toNum(task.id);
        const progress = toNum(task.progress);
        const totalProgress = toNum(task.total_progress);
        const isClaimed = task.is_claimed;
        const isUnlocked = task.is_unlocked;
        const shareMultiple = toNum(task.share_multiple);

        // 可领取条件: 已解锁 + 未领取 + 进度完成
        if (isUnlocked && !isClaimed && progress >= totalProgress && totalProgress > 0) {
            claimable.push({
                id,
                desc: task.desc || `任务#${id}`,
                shareMultiple,
                rewards: task.rewards || [],
            });
        }
    }
    return claimable;
}

/**
 * 计算奖励摘要
 */
function getRewardSummary(items) {
    const summary = [];
    for (const item of items) {
        const id = toNum(item.id);
        const count = toNum(item.count);
        // 常见物品ID: 1=金币, 2=经验
        if (id === 1) summary.push(`金币${count}`);
        else if (id === 2) summary.push(`经验${count}`);
        summary.push(`${getItemName(id)}(${id})x${count}`);
    }
    return summary.join('/');
}

// ============ 自动领取 ============

/**
 * 检查并领取所有可领取的任务奖励
 */
async function checkAndClaimTasks() {
    try {
        const reply = await getTaskInfo();
        if (!reply.task_info) return;

        const taskInfo = reply.task_info;
        const allTasks = [
            ...(taskInfo.growth_tasks || []),
            ...(taskInfo.daily_tasks || []),
            ...(taskInfo.tasks || []),
        ];

        const claimable = analyzeTaskList(allTasks);
        if (claimable.length === 0) return;

        log('任务', `发现 ${claimable.length} 个可领取任务`);

        for (const task of claimable) {
            try {
                // 如果有分享翻倍，使用翻倍领取
                const useShare = task.shareMultiple > 1;
                const multipleStr = useShare ? ` (${task.shareMultiple}倍)` : '';

                const claimReply = await claimTaskReward(task.id, useShare);
                const items = claimReply.items || [];
                const rewardStr = items.length > 0 ? getRewardSummary(items) : '无';

                log('任务', `领取: ${task.desc}${multipleStr} → ${rewardStr}`);
                await sleep(300);
            } catch (e) {
                logWarn('任务', `领取失败 #${task.id}: ${e.message}`);
            }
        }
    } catch (e) {
        // 静默失败
    }
}

/**
 * 处理任务状态变化推送
 */
function onTaskInfoNotify(taskInfo) {
    if (!taskInfo) return;

    const allTasks = [
        ...(taskInfo.growth_tasks || []),
        ...(taskInfo.daily_tasks || []),
        ...(taskInfo.tasks || []),
    ];

    const claimable = analyzeTaskList(allTasks);
    if (claimable.length === 0) return;

    // 有可领取任务，延迟后自动领取
    log('任务', `有 ${claimable.length} 个任务可领取，准备自动领取...`);
    setTimeout(() => claimTasksFromList(claimable), 1000);
}

/**
 * 从任务列表领取奖励
 */
async function claimTasksFromList(claimable) {
    for (const task of claimable) {
        try {
            const useShare = task.shareMultiple > 1;
            const multipleStr = useShare ? ` (${task.shareMultiple}倍)` : '';

            const claimReply = await claimTaskReward(task.id, useShare);
            const items = claimReply.items || [];
            const rewardStr = items.length > 0 ? getRewardSummary(items) : '无';

            log('任务', `领取: ${task.desc}${multipleStr} → ${rewardStr}`);
            await sleep(300);
        } catch (e) {
            logWarn('任务', `领取失败 #${task.id}: ${e.message}`);
        }
    }
}

// ============ 初始化 ============

let taskCheckTimer = null;
let taskSystemInitialized = false;
const TASK_CHECK_INTERVAL = 60000; // 每60秒检查一次任务

function initTaskSystem() {
    if (taskSystemInitialized) return;
    taskSystemInitialized = true;
    
    // 监听任务状态变化推送
    networkEvents.on('taskInfoNotify', onTaskInfoNotify);

    // 启动时检查一次任务（只有在 autoClaim 为 true 时才执行）
    if (CONFIG.autoClaim) {
        console.log('[任务] autoClaim 已开启，启动任务检查');
        setTimeout(() => checkAndClaimTasks(), 4000);
        setTimeout(() => checkAllRewards(), 5000);
    } else {
        console.log('[任务] autoClaim 未开启，跳过启动时检查');
    }
    
    // 启动定期检查循环（始终启动，但内部判断是否执行）
    taskCheckTimer = setInterval(() => {
        if (CONFIG.autoClaim) {
            checkAndClaimTasks();
            checkAllRewards();
        }
    }, TASK_CHECK_INTERVAL);
}

function cleanupTaskSystem() {
    networkEvents.off('taskInfoNotify', onTaskInfoNotify);
    if (taskCheckTimer) {
        clearInterval(taskCheckTimer);
        taskCheckTimer = null;
    }
    taskSystemInitialized = false;
}

// ============ 奖励领取 ============

async function checkAllRewards() {
    if (!CONFIG.autoClaim) return;
    try {
        await claimFreeGifts();
        await claimShareReward();
        await claimMonthCard();
        await claimEmailReward();
        await claimVipGift();
        await claimIllustrated();
        if (CONFIG.autoUseFertilizer) {
            await useFertilizerPacks();
        }
    } catch (e) {
        logWarn('奖励', `检查失败: ${e.message}`);
    }
}

async function claimFreeGifts() {
    try {
        const reqBody = types.GetMallListBySlotTypeRequest.encode(
            types.GetMallListBySlotTypeRequest.create({ slot_type: 1 })
        ).finish();
        const { body: replyBody } = await sendMsgAsync(
            'gamepb.mallpb.MallService', 'GetMallListBySlotType', reqBody
        );
        const reply = types.GetMallListBySlotTypeResponse.decode(replyBody);
        
        let claimed = 0;
        for (const goodsBytes of reply.goods_list || []) {
            try {
                const goods = types.MallGoods.decode(goodsBytes);
                if (goods.is_free && goods.goods_id > 0) {
                    const purchaseReq = types.PurchaseRequest.encode(
                        types.PurchaseRequest.create({ goods_id: goods.goods_id, count: 1 })
                    ).finish();
                    await sendMsgAsync('gamepb.mallpb.MallService', 'Purchase', purchaseReq);
                    claimed++;
                    await sleep(200);
                }
            } catch (e) { /* 解析失败或购买失败，继续下一个 */ }
        }
        if (claimed > 0) {
            log('奖励', `免费礼包已领取 ×${claimed}`);
        }
    } catch (e) {
        logWarn('奖励', `免费礼包失败: ${e.message}`);
    }
}

async function claimShareReward() {
    try {
        const checkReq = types.CheckCanShareRequest.encode(
            types.CheckCanShareRequest.create({})
        ).finish();
        const { body: checkBody } = await sendMsgAsync(
            'gamepb.sharepb.ShareService', 'CheckCanShare', checkReq
        );
        const checkReply = types.CheckCanShareReply.decode(checkBody);
        
        if (!checkReply.can_share) {
            return;
        }
        
        const reportReq = types.ReportShareRequest.encode(
            types.ReportShareRequest.create({ shared: true })
        ).finish();
        await sendMsgAsync('gamepb.sharepb.ShareService', 'ReportShare', reportReq);
        await sleep(300);
        
        const claimReq = types.ClaimShareRewardRequest.encode(
            types.ClaimShareRewardRequest.create({ claimed: true })
        ).finish();
        const { body: claimBody } = await sendMsgAsync(
            'gamepb.sharepb.ShareService', 'ClaimShareReward', claimReq
        );
        const claimReply = types.ClaimShareRewardReply.decode(claimBody);
        
        if (claimReply.success || claimReply.has_reward) {
            const items = claimReply.items || [];
            const rewardStr = items.length > 0 ? getRewardSummary(items) : '无';
            log('奖励', `分享奖励已领取: ${rewardStr}`);
        }
    } catch (e) {
        if (!e.message.includes('1009001') && !e.message.includes('已领取')) {
            logWarn('奖励', `分享奖励失败: ${e.message}`);
        }
    }
}

async function claimMonthCard() {
    try {
        const reqBody = types.GetMonthCardInfosRequest.encode(
            types.GetMonthCardInfosRequest.create({})
        ).finish();
        const { body: replyBody } = await sendMsgAsync('gamepb.mallpb.MallService', 'GetMonthCardInfos', reqBody);
        const reply = types.GetMonthCardInfosReply.decode(replyBody);
        const infos = reply.infos || [];
        
        for (const info of infos) {
            if (info.can_claim) {
                const claimReq = types.ClaimMonthCardRewardRequest.encode(
                    types.ClaimMonthCardRewardRequest.create({ goods_id: info.goods_id })
                ).finish();
                await sendMsgAsync('gamepb.mallpb.MallService', 'ClaimMonthCardReward', claimReq);
                log('奖励', `月卡奖励已领取: ${info.goods_id}`);
            }
        }
    } catch (e) {
        logWarn('奖励', `月卡奖励失败: ${e.message}`);
    }
}

async function claimEmailReward() {
    try {
        // 检查收件箱
        const inboxReq = types.GetEmailListRequest.encode(
            types.GetEmailListRequest.create({ box_type: 1 })
        ).finish();
        const { body: inboxBody } = await sendMsgAsync('gamepb.emailpb.EmailService', 'GetEmailList', inboxReq);
        const inboxReply = types.GetEmailListReply.decode(inboxBody);
        
        // 检查系统邮件
        const sysReq = types.GetEmailListRequest.encode(
            types.GetEmailListRequest.create({ box_type: 2 })
        ).finish();
        const { body: sysBody } = await sendMsgAsync('gamepb.emailpb.EmailService', 'GetEmailList', sysReq);
        const sysReply = types.GetEmailListReply.decode(sysBody);
        
        const allEmails = [...(inboxReply.emails || []), ...(sysReply.emails || [])];
        const claimableEmails = allEmails.filter(e => e.has_reward && !e.claimed);
        
        if (claimableEmails.length > 0) {
            log('奖励', `发现 ${claimableEmails.length} 封可领取的邮件`);
            for (const email of claimableEmails) {
                try {
                    // 优先尝试批量领取
                    try {
                        const batchReq = types.BatchClaimEmailRequest.encode(
                            types.BatchClaimEmailRequest.create({ box_type: email.mail_type, email_id: email.id })
                        ).finish();
                        const { body: batchBody } = await sendMsgAsync('gamepb.emailpb.EmailService', 'BatchClaimEmail', batchReq);
                        const batchReply = types.BatchClaimEmailReply.decode(batchBody);
                        const items = batchReply.items || [];
                        const rewardStr = items.length > 0 ? getRewardSummary(items) : '无';
                        log('奖励', `邮件[${email.title}]批量已领取: ${rewardStr}`);
                        await sleep(100);
                        continue;
                    } catch (e) { /* 批量失败，尝试单个 */ }
                    
                    // 单个领取
                    const claimReq = types.ClaimEmailRequest.encode(
                        types.ClaimEmailRequest.create({ box_type: email.mail_type, email_id: email.id })
                    ).finish();
                    const { body: claimBody } = await sendMsgAsync('gamepb.emailpb.EmailService', 'ClaimEmail', claimReq);
                    const claimReply = types.ClaimEmailReply.decode(claimBody);
                    const items = claimReply.items || [];
                    const rewardStr = items.length > 0 ? getRewardSummary(items) : '无';
                    log('奖励', `邮件[${email.title}]已领取: ${rewardStr}`);
                    await sleep(300);
                } catch (e) {
                    logWarn('奖励', `邮件[${email.title}]领取失败: ${e.message}`);
                }
            }
        }
    } catch (e) {
        logWarn('奖励', `邮箱奖励失败: ${e.message}`);
    }
}

async function claimVipGift() {
    try {
        const statusReq = types.GetDailyGiftStatusRequest.encode(
            types.GetDailyGiftStatusRequest.create({})
        ).finish();
        const { body: statusBody } = await sendMsgAsync(
            'gamepb.qqvippb.QQVipService', 'GetDailyGiftStatus', statusReq
        );
        const statusReply = types.GetDailyGiftStatusReply.decode(statusBody);
        
        if (!statusReply.can_claim) {
            return;
        }
        
        const claimReq = types.ClaimDailyGiftRequest.encode(
            types.ClaimDailyGiftRequest.create({})
        ).finish();
        const { body: claimBody } = await sendMsgAsync(
            'gamepb.qqvippb.QQVipService', 'ClaimDailyGift', claimReq
        );
        const claimReply = types.ClaimDailyGiftReply.decode(claimBody);
        
        if (claimReply.items && claimReply.items.length > 0) {
            const rewardStr = getRewardSummary(claimReply.items);
            log('奖励', `QQ会员礼包已领取: ${rewardStr}`);
        }
    } catch (e) {
        if (!e.message.includes('1021002') && !e.message.includes('已领取')) {
            logWarn('奖励', `QQ会员礼包失败: ${e.message}`);
        }
    }
}

async function claimIllustrated() {
    try {
        // 先检查是否有可领取的奖励
        const listReq = types.GetIllustratedListV2Request.encode(
            types.GetIllustratedListV2Request.create({ full: true })
        ).finish();
        const { body: listBody } = await sendMsgAsync('gamepb.illustratedpb.IllustratedService', 'GetIllustratedListV2', listReq);
        
        let listReply;
        try {
            listReply = types.GetIllustratedListV2Reply.decode(listBody);
        } catch (decodeErr) {
            return;
        }
        
        // 检查是否有奖励可领取
        const hasReward = (listReply.items || []).some(item => item.has_reward);
        if (!hasReward) {
            return;
        }
        
        // 实际领取
        const claimReq = types.ClaimAllRewardsV2Request.encode(
            types.ClaimAllRewardsV2Request.create({})
        ).finish();
        const { body: claimBody } = await sendMsgAsync('gamepb.illustratedpb.IllustratedService', 'ClaimAllRewardsV2', claimReq);
        
        let claimReply;
        try {
            claimReply = types.ClaimAllRewardsV2Reply.decode(claimBody);
        } catch (decodeErr) {
            return;
        }
        
        if (claimReply.error_code && claimReply.error_code !== 0) {
            const errMsg = `code=${claimReply.error_code}`;
            if (!errMsg.includes('1013002') && !errMsg.includes('图鉴未解锁')) {
                logWarn('奖励', `图鉴奖励失败: ${errMsg}`);
            }
            return;
        }
        
        const allItems = [...(claimReply.items || []), ...(claimReply.bonus_items || [])];
        
        if (allItems.length > 0) {
            // 领取成功，不显示日志
        }
    } catch (e) {
        if (!e.message.includes('1013002') && !e.message.includes('图鉴未解锁')) {
            logWarn('奖励', `图鉴奖励失败: ${e.message}`);
        }
    }
}

async function useFertilizerPacks() {
    const FERTILIZER_GIFT_IDS = new Set([100003, 100004]);
    const FERTILIZER_ITEM_IDS = new Map([
        [80001, { type: 'normal', hours: 1 }],
        [80002, { type: 'normal', hours: 4 }],
        [80003, { type: 'normal', hours: 8 }],
        [80004, { type: 'normal', hours: 12 }],
        [80011, { type: 'organic', hours: 1 }],
        [80012, { type: 'organic', hours: 4 }],
        [80013, { type: 'organic', hours: 8 }],
        [80014, { type: 'organic', hours: 12 }],
    ]);
    const CONTAINER_LIMIT_HOURS = 990;
    const NORMAL_CONTAINER_ID = 1011;
    const ORGANIC_CONTAINER_ID = 1012;
    
    try {
        const { getBag, getBagItems } = require('./warehouse');
        const bagReply = await getBag();
        const items = getBagItems(bagReply);
        
        let normalSec = 0, organicSec = 0;
        for (const it of items) {
            const id = toNum(it.id);
            const count = toNum(it.count);
            if (id === NORMAL_CONTAINER_ID) normalSec = count;
            if (id === ORGANIC_CONTAINER_ID) organicSec = count;
        }
        
        const containerHours = {
            normal: normalSec / 3600,
            organic: organicSec / 3600,
        };
        
        const toUse = [];
        for (const it of items) {
            const id = toNum(it.id);
            const count = toNum(it.count);
            if (count <= 0) continue;
            
            if (FERTILIZER_GIFT_IDS.has(id)) {
                toUse.push({ id, count, isGift: true });
            } else if (FERTILIZER_ITEM_IDS.has(id)) {
                const info = FERTILIZER_ITEM_IDS.get(id);
                const currentHours = info.type === 'normal' ? containerHours.normal : containerHours.organic;
                if (currentHours < CONTAINER_LIMIT_HOURS) {
                    const remainHours = CONTAINER_LIMIT_HOURS - currentHours;
                    const maxCount = Math.floor(remainHours / info.hours);
                    const useCount = Math.min(count, maxCount);
                    if (useCount > 0) {
                        toUse.push({ id, count: useCount, isGift: false, type: info.type, hours: info.hours });
                    }
                }
            }
        }
        
        if (toUse.length === 0) {
            return;
        }
        
        let used = 0;
        for (const item of toUse) {
            try {
                const batchReq = types.BatchUseRequest.encode(
                    types.BatchUseRequest.create({
                        items: [{ item_id: toLong(item.id), count: toLong(item.count) }]
                    })
                ).finish();
                await sendMsgAsync('gamepb.itempb.ItemService', 'BatchUse', batchReq);
                used += item.count;
                
                if (!item.isGift && item.type && item.hours) {
                    if (item.type === 'normal') containerHours.normal += item.count * item.hours;
                    else containerHours.organic += item.count * item.hours;
                }
            } catch (e) {
                try {
                    const singleReq = types.UseRequest.encode(
                        types.UseRequest.create({ item_id: toLong(item.id), count: toLong(item.count) })
                    ).finish();
                    await sendMsgAsync('gamepb.itempb.ItemService', 'Use', singleReq);
                    used += item.count;
                } catch (e2) {
                    if (e2.message.includes('1003002') || e2.message.includes('上限')) {
                        continue;
                    }
                }
            }
            await sleep(100);
        }
        
        if (used > 0) {
            log('奖励', `化肥: 已使用化肥道具 ×${used}`);
        }
    } catch (e) {
        logWarn('奖励', `化肥使用失败: ${e.message}`);
    }
}

module.exports = {
    checkAndClaimTasks,
    initTaskSystem,
    cleanupTaskSystem,
    checkAllRewards,
    useFertilizerPacks,
};
