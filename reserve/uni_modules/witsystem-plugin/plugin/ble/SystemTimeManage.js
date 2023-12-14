/**
 * 校验手机的时间，要使用蓝牙手机时间必须正确
 */
import network from '../net/network';
let that;
let serverTime;

class SystemTimeManage {

    constructor() {
        that = this;
    }

    /**
     * 处理手机的时间和服务器的时间
     */
    async phoneTimeHandle() {
        try {
            await network.syncNetworkState(); //网络读取服务器时间
            let info = await network.syncNet({
                url: '/v2/user/app/sync/time',
                isSing: true,
                data: {}
            });
            serverTime = info.data.data.timestamp;
            uni.setStorage({
                key: 'witsystemTimeKey',
                data: serverTime
            });
        } catch (e) {
            serverTime = uni.getStorageSync('witsystemTimeKey');
        }

        if (!serverTime) serverTime = new Date().getTime();
    }


    /**
     * 获得服务器时间
     */
    getServerTime = function () {
        return serverTime;
    };
}

SystemTimeManage.getInstance = function () {
    let systemTimeManage;

    if (!systemTimeManage) {
        systemTimeManage = new SystemTimeManage();
    }

    return systemTimeManage;
};

export default SystemTimeManage.getInstance();