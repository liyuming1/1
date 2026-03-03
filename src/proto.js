/**
 * Proto 加载与消息类型管理
 */

const protobuf = require('protobufjs');
const path = require('path');
const { log } = require('./utils');

// Proto 根对象与所有消息类型
let root = null;
const types = {};

async function loadProto() {
    const protoDir = path.join(__dirname, '..', 'proto');
    root = new protobuf.Root();
    await root.load([
        path.join(protoDir, 'game.proto'),
        path.join(protoDir, 'userpb.proto'),
        path.join(protoDir, 'plantpb.proto'),
        path.join(protoDir, 'corepb.proto'),
        path.join(protoDir, 'shoppb.proto'),
        path.join(protoDir, 'friendpb.proto'),
        path.join(protoDir, 'visitpb.proto'),
        path.join(protoDir, 'notifypb.proto'),
        path.join(protoDir, 'taskpb.proto'),
        path.join(protoDir, 'itempb.proto'),
        path.join(protoDir, 'mallpb.proto'),
    ], { keepCase: true });

    // 网关
    types.GateMessage = root.lookupType('gatepb.Message');
    types.GateMeta = root.lookupType('gatepb.Meta');
    types.EventMessage = root.lookupType('gatepb.EventMessage');

    // 用户
    types.LoginRequest = root.lookupType('gamepb.userpb.LoginRequest');
    types.LoginReply = root.lookupType('gamepb.userpb.LoginReply');
    types.HeartbeatRequest = root.lookupType('gamepb.userpb.HeartbeatRequest');
    types.HeartbeatReply = root.lookupType('gamepb.userpb.HeartbeatReply');
    types.ReportArkClickRequest = root.lookupType('gamepb.userpb.ReportArkClickRequest');
    types.ReportArkClickReply = root.lookupType('gamepb.userpb.ReportArkClickReply');

    // 农场
    types.AllLandsRequest = root.lookupType('gamepb.plantpb.AllLandsRequest');
    types.AllLandsReply = root.lookupType('gamepb.plantpb.AllLandsReply');
    types.HarvestRequest = root.lookupType('gamepb.plantpb.HarvestRequest');
    types.HarvestReply = root.lookupType('gamepb.plantpb.HarvestReply');
    types.WaterLandRequest = root.lookupType('gamepb.plantpb.WaterLandRequest');
    types.WaterLandReply = root.lookupType('gamepb.plantpb.WaterLandReply');
    types.WeedOutRequest = root.lookupType('gamepb.plantpb.WeedOutRequest');
    types.WeedOutReply = root.lookupType('gamepb.plantpb.WeedOutReply');
    types.InsecticideRequest = root.lookupType('gamepb.plantpb.InsecticideRequest');
    types.InsecticideReply = root.lookupType('gamepb.plantpb.InsecticideReply');
    types.RemovePlantRequest = root.lookupType('gamepb.plantpb.RemovePlantRequest');
    types.RemovePlantReply = root.lookupType('gamepb.plantpb.RemovePlantReply');
    types.PutInsectsRequest = root.lookupType('gamepb.plantpb.PutInsectsRequest');
    types.PutInsectsReply = root.lookupType('gamepb.plantpb.PutInsectsReply');
    types.PutWeedsRequest = root.lookupType('gamepb.plantpb.PutWeedsRequest');
    types.PutWeedsReply = root.lookupType('gamepb.plantpb.PutWeedsReply');
    types.FertilizeRequest = root.lookupType('gamepb.plantpb.FertilizeRequest');
    types.FertilizeReply = root.lookupType('gamepb.plantpb.FertilizeReply');

    // 背包/仓库
    types.BagRequest = root.lookupType('gamepb.itempb.BagRequest');
    types.BagReply = root.lookupType('gamepb.itempb.BagReply');
    types.SellRequest = root.lookupType('gamepb.itempb.SellRequest');
    types.SellReply = root.lookupType('gamepb.itempb.SellReply');
    types.PlantRequest = root.lookupType('gamepb.plantpb.PlantRequest');
    types.PlantReply = root.lookupType('gamepb.plantpb.PlantReply');
    types.UnlockLandRequest = root.lookupType('gamepb.plantpb.UnlockLandRequest');
    types.UnlockLandReply = root.lookupType('gamepb.plantpb.UnlockLandReply');
    types.UpgradeLandRequest = root.lookupType('gamepb.plantpb.UpgradeLandRequest');
    types.UpgradeLandReply = root.lookupType('gamepb.plantpb.UpgradeLandReply');
    types.UseGoodsRequest = root.lookupType('gamepb.plantpb.UseGoodsRequest');
    types.UseGoodsReply = root.lookupType('gamepb.plantpb.UseGoodsReply');
    types.UseRequest = root.lookupType('gamepb.itempb.UseRequest');
    types.UseReply = root.lookupType('gamepb.itempb.UseReply');
    types.BatchUseRequest = root.lookupType('gamepb.itempb.BatchUseRequest');
    types.BatchUseReply = root.lookupType('gamepb.itempb.BatchUseReply');

    // 商店
    types.ShopProfilesRequest = root.lookupType('gamepb.shoppb.ShopProfilesRequest');
    types.ShopProfilesReply = root.lookupType('gamepb.shoppb.ShopProfilesReply');
    types.ShopInfoRequest = root.lookupType('gamepb.shoppb.ShopInfoRequest');
    types.ShopInfoReply = root.lookupType('gamepb.shoppb.ShopInfoReply');
    types.BuyGoodsRequest = root.lookupType('gamepb.shoppb.BuyGoodsRequest');
    types.BuyGoodsReply = root.lookupType('gamepb.shoppb.BuyGoodsReply');

    // 商城
    types.GetMallListBySlotTypeRequest = root.lookupType('gamepb.mallpb.GetMallListBySlotTypeRequest');
    types.GetMallListBySlotTypeResponse = root.lookupType('gamepb.mallpb.GetMallListBySlotTypeResponse');
    types.MallGoods = root.lookupType('gamepb.mallpb.MallGoods');
    types.PurchaseRequest = root.lookupType('gamepb.mallpb.PurchaseRequest');
    types.PurchaseResponse = root.lookupType('gamepb.mallpb.PurchaseResponse');
    types.GetMonthCardInfosRequest = root.lookupType('gamepb.mallpb.GetMonthCardInfosRequest');
    types.GetMonthCardInfosReply = root.lookupType('gamepb.mallpb.GetMonthCardInfosReply');
    types.ClaimMonthCardRewardRequest = root.lookupType('gamepb.mallpb.ClaimMonthCardRewardRequest');
    types.ClaimMonthCardRewardReply = root.lookupType('gamepb.mallpb.ClaimMonthCardRewardReply');

    // 好友
    types.GetAllFriendsRequest = root.lookupType('gamepb.friendpb.GetAllRequest');
    types.GetAllFriendsReply = root.lookupType('gamepb.friendpb.GetAllReply');
    types.GetApplicationsRequest = root.lookupType('gamepb.friendpb.GetApplicationsRequest');
    types.GetApplicationsReply = root.lookupType('gamepb.friendpb.GetApplicationsReply');
    types.AcceptFriendsRequest = root.lookupType('gamepb.friendpb.AcceptFriendsRequest');
    types.AcceptFriendsReply = root.lookupType('gamepb.friendpb.AcceptFriendsReply');

    // 访问
    types.VisitEnterRequest = root.lookupType('gamepb.visitpb.EnterRequest');
    types.VisitEnterReply = root.lookupType('gamepb.visitpb.EnterReply');
    types.VisitLeaveRequest = root.lookupType('gamepb.visitpb.LeaveRequest');
    types.VisitLeaveReply = root.lookupType('gamepb.visitpb.LeaveReply');

    // 任务
    types.TaskInfoRequest = root.lookupType('gamepb.taskpb.TaskInfoRequest');
    types.TaskInfoReply = root.lookupType('gamepb.taskpb.TaskInfoReply');
    types.ClaimTaskRewardRequest = root.lookupType('gamepb.taskpb.ClaimTaskRewardRequest');
    types.ClaimTaskRewardReply = root.lookupType('gamepb.taskpb.ClaimTaskRewardReply');
    types.BatchClaimTaskRewardRequest = root.lookupType('gamepb.taskpb.BatchClaimTaskRewardRequest');
    types.BatchClaimTaskRewardReply = root.lookupType('gamepb.taskpb.BatchClaimTaskRewardReply');

    // 服务器推送通知
    types.LandsNotify = root.lookupType('gamepb.plantpb.LandsNotify');
    types.BasicNotify = root.lookupType('gamepb.userpb.BasicNotify');
    types.KickoutNotify = root.lookupType('gatepb.KickoutNotify');
    types.FriendApplicationReceivedNotify = root.lookupType('gamepb.friendpb.FriendApplicationReceivedNotify');
    types.FriendAddedNotify = root.lookupType('gamepb.friendpb.FriendAddedNotify');
    types.ItemNotify = root.lookupType('gamepb.itempb.ItemNotify');
    types.GoodsUnlockNotify = root.lookupType('gamepb.shoppb.GoodsUnlockNotify');
    types.TaskInfoNotify = root.lookupType('gamepb.taskpb.TaskInfoNotify');

    // 加载额外的 proto 文件
    const extraRoot = new protobuf.Root();
    await extraRoot.load([
        path.join(protoDir, 'sharepb.proto'),
        path.join(protoDir, 'emailpb.proto'),
        path.join(protoDir, 'illustratedpb.proto'),
        path.join(protoDir, 'qqvippb.proto'),
    ], { keepCase: true });

    // 分享奖励
    types.CheckCanShareRequest = extraRoot.lookupType('gamepb.sharepb.CheckCanShareRequest');
    types.CheckCanShareReply = extraRoot.lookupType('gamepb.sharepb.CheckCanShareReply');
    types.ReportShareRequest = extraRoot.lookupType('gamepb.sharepb.ReportShareRequest');
    types.ReportShareReply = extraRoot.lookupType('gamepb.sharepb.ReportShareReply');
    types.ClaimShareRewardRequest = extraRoot.lookupType('gamepb.sharepb.ClaimShareRewardRequest');
    types.ClaimShareRewardReply = extraRoot.lookupType('gamepb.sharepb.ClaimShareRewardReply');

    // 邮箱
    types.GetEmailListRequest = extraRoot.lookupType('gamepb.emailpb.GetEmailListRequest');
    types.GetEmailListReply = extraRoot.lookupType('gamepb.emailpb.GetEmailListReply');
    types.ClaimEmailRequest = extraRoot.lookupType('gamepb.emailpb.ClaimEmailRequest');
    types.ClaimEmailReply = extraRoot.lookupType('gamepb.emailpb.ClaimEmailReply');
    types.BatchClaimEmailRequest = extraRoot.lookupType('gamepb.emailpb.BatchClaimEmailRequest');
    types.BatchClaimEmailReply = extraRoot.lookupType('gamepb.emailpb.BatchClaimEmailReply');

    // 图鉴
    types.GetIllustratedListV2Request = extraRoot.lookupType('gamepb.illustratedpb.GetIllustratedListV2Request');
    types.GetIllustratedListV2Reply = extraRoot.lookupType('gamepb.illustratedpb.GetIllustratedListV2Reply');
    types.ClaimAllRewardsV2Request = extraRoot.lookupType('gamepb.illustratedpb.ClaimAllRewardsV2Request');
    types.ClaimAllRewardsV2Reply = extraRoot.lookupType('gamepb.illustratedpb.ClaimAllRewardsV2Reply');

    // QQ会员
    types.GetDailyGiftStatusRequest = extraRoot.lookupType('gamepb.qqvippb.GetDailyGiftStatusRequest');
    types.GetDailyGiftStatusReply = extraRoot.lookupType('gamepb.qqvippb.GetDailyGiftStatusReply');
    types.ClaimDailyGiftRequest = extraRoot.lookupType('gamepb.qqvippb.ClaimDailyGiftRequest');
    types.ClaimDailyGiftReply = extraRoot.lookupType('gamepb.qqvippb.ClaimDailyGiftReply');

    // Proto 加载完成
}

function getRoot() {
    return root;
}

module.exports = { loadProto, types, getRoot };
