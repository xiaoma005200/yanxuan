import Config from './config/Config';
import Ble from './ble/Ble.js';
import Unlock from './device/Unlock';
import Devices from './model/Devices';
import SystemTimeManage from './ble/SystemTimeManage';
import AddDevice from './device/AddDevice';
import BleDevice from './device/method/BleDevice';
import BleSerialPort from './device/BleSerialPort';
import Location from './location/Location';
import Util from './utils/util';
import Network from './net/network';
import Ota from './device/Ota';
import UserRemarks from './model/UserRemarks';
import Pay from './model/Pay';
import GePush from './model/GePush';
import AES from './ble/aes';
import AESUntil from './utils/AESUtil';
import RSA from './utils/Rsa';
import RSAUtil from './utils/RSAUtil';
import StrUtils from './utils/StrUtils';

let initState = false; //初始化状态

let netState = false; //网络是否可用状态

let mqttConnectState = false; //mqtt是否启动连接

module.exports = {

    //监听网络的变化
    _linerNetChange() {
        //启动监听网络变化
        let that = this;
        uni.onNetworkStatusChange(function (res) {
            if (res.isConnected && res.networkType !== 'none' && !netState) {
                that.initPlugin();
            }
        });
    },

    //初始化插件
    initPlugin: async function () {

         //初始化配置信息
        try {
            await Network.syncNetworkState();
            netState = true;
        } catch (e) {
            //没有网络启动网路状态监听
            this._linerNetChange();
            netState = false;
        }
        return new Promise(async (resolve, reject) => {
            try {

                Location.initLocation(); //校验插件和手机的钥匙

                let systemTimeManagePromise = SystemTimeManage.phoneTimeHandle();//初始化时间和设备信息

                let devicesPromise = Devices.initBleDevice(); //初始化设备信息

                await Promise.all([systemTimeManagePromise, devicesPromise]); //console.log("获得设备信息1", Devices.getDeviceList());
                //初始化mqtt 判断mqtt是否已经连接，如果已经连接就不在执行连接 如果网络异常也不初始化mqtt

                //console.log('获得设备信息1', netState + '::::' + mqttConnectState);

                if (netState && !mqttConnectState) {
                    setTimeout(function () {
                        //获取信息成功等待完成初始化后在去连接mqtt 所以添加延迟是为了提高初始速度
                        UserRemarks.getRemarksList(); //更新用户备注信息
                        GePush.register();
                    }, 0);
                    mqttConnectState = true;
                }

                initState = true;
                resolve({
                    err: 0,
                    msg: 'success'
                });
            } catch (e) {
                reject(e);
            }
        });
    },

    //取消初始化
    unInitPlugin: function () {
        GePush.logoutCid();
        Devices.cleanCacheInfo();
        initState = false; //初始化状态

        netState = false; //网络是否可用状态

        mqttConnectState = false; //mqtt是否启动连接
    },

    //插件是否已经初始化
    isInitPlugin:function (){
        return initState;
    },

    //获得蓝牙对象
    getBle: function () {
        return initState ? Ble : null;
    },
    //获得开锁对象
    getBleUnlock: function () {
        return initState ? Unlock : null;
    },
    //获得添加设备的对象
    getAddDevice: function () {
        return initState ? AddDevice : null;
    },
    //获得蓝牙串口通讯对象
    getBleSerialPort: function () {
        return initState ? BleSerialPort : null;
    },
    //获得设备方法的对象
    //已经过时 替代的方法为getBleDevice
    getDeviceMethod: function () {
        return initState ? BleDevice : null;
    },
    //获得通过蓝牙操作设备的方法,该方法代替上面getDeviceMethod
    getBleDevice: function () {
        return initState ? BleDevice : null;
    },
    //获得新的设备对象
    getDevices: function () {
        return initState ? Devices : null;
    },
    //获得用户备注对象
    getUserRemarks: function () {
        return initState ? UserRemarks : null;
    },

    //支付相关的对象
    getPay: function () {
        return initState ? Pay : null;
    },

    //获得空中升级
    getOta: function () {
        return initState ? Ota : null;
    },
    //返回插件配置信息
    getConfig: function () {
        return Config;
    },

    getGePush: function () {
        return initState ? GePush : null;
    },
    //关闭插件所有开启的页面
    closePage: function () {
        return new Promise((resolve, reject) => {
            let currentPages = getCurrentPages();

            if (currentPages !== null && currentPages.length !== 0) {
                uni.navigateBack({
                    delta: currentPages.length - 1,

                    success() {
                        resolve();
                    },

                    fail(e) {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    },

    //返回插件时间
    getWitsystemTime() {
        return SystemTimeManage.getServerTime();
    },

    //获得工具对象初始化失败也可以使用
    getUtil: function () {
        return Util;
    },
    //获得完整的aes对象
    getAES: function () {
        return AES;
    },
    //获得aes 已经封装好的对象
    getAESUtil: function () {
        return AESUntil;
    },
    //获得RSA 已经封装好的对象
    getRSA: function () {
        return RSA;
    },
    //获得RSAUtil 已经封装好的对象
    getRSAUtil: function () {
        return RSAUtil;
    },
   //字符串处理
    getStrUtils: function () {
        return StrUtils;
    },
    //提供已经封装好的网络请求
    getNetwork: function () {
        return Network;
    },
    // 校验用户微信一次性钥匙是否存在 不需要初始化SDK
    isWxOneTimeKey: async function ({platformAppId, wxAppId, deviceId, userId, wxCode, encryptedData, iv}) {
        return await Devices.isWxOneTimeKey({
            platformAppId: platformAppId,
            wxAppId: wxAppId,
            deviceId: deviceId,
            userId: userId,
            wxCode: wxCode,
            encryptedData: encryptedData,
            iv: iv
        });
    }
};
