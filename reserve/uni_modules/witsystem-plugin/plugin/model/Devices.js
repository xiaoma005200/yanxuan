/**
 * 客户端和服务器交互操作设备的方法 所有设备通用
 * 通过网络和设备交互或者是操作设备在服务器上的信息
 */

import Network from '../net/network';
import Util from '../utils/util';
import SystemTimeManage from '../ble/SystemTimeManage';
import Config from '../config/Config';
import CommandUtil from '../device/command/CommandUtil';
import AESUtil from '../utils/AESUtil';
import BleErrMsg from "../error/BleError";
import BleError from "../error/BleError";

const devicesCacheKey = 'witsystemDevicesCacheKey';
let that;

let deviceModelEncodedCache = {}; //设备功能编码缓存，防止多次验证同一个设备进行的多次编码

let deviceSoftwareEncodedCache = {}; //设备对应的软件支持信息缓存， 防止同一个型号进行多次解析

class Devices {

    constructor() {
        that = this;
        this._deviceMap = new Map();
        this._deviceList = [];
        this.deviceInfoChange();
    }

    /**
     * 监听设备信息变化
     * @returns {Promise<unknown>}
     */
    deviceInfoChange() {
        uni.$on("witsystemOnPush", async function (data) {
            switch (data.data.type) {
                case "getDevice":
                case "deleteDevice":
                    await that.refurbishDeviceInfo(data.data.data);
                    uni.$emit("witsystemDeviceInfoChange", {deviceId: data.data.data})
                    break

            }
        });
    }


    initBleDevice() {
        return new Promise((resolve, reject) => {
            uni.getNetworkType({
                async success(res) {
                    try {
                        if (res.networkType !== 'none') {
                            await that.getNetworkBleDevice();
                            resolve(that._deviceList);
                        } else {
                            let cacheList = that.readCacheDevices();
                            if (cacheList) that._handleData(cacheList);

                            if (that._deviceList.length !== 0) {
                                resolve(that._deviceList);
                            } else {
                                reject({
                                    errMsg: '首次初始化必须保持网络畅通', errCode: -1
                                });
                            }
                        }
                    } catch (e) {
                        reject(e);
                    }
                },

                fail(e) {
                    reject(e);
                }
            });
        });
    }//初始化设备信息

    getNetworkBleDevice() {
        return new Promise(async (resolve, reject) => {
            try {
                let devices = await Network.syncNet({url: '/v2/device/list', data: {}});
                this._handleData(devices.data.data);
                uni.setStorage({
                    data: JSON.stringify(this._deviceList), key: devicesCacheKey
                });
                SystemTimeManage.phoneTimeHandle(); //设备更新一次更新一次时间

                resolve(devices.data.data);
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });
    }//网络获取设备

    readCacheDevices() {
        let deviceStr = uni.getStorageSync(devicesCacheKey);
        return deviceStr ? JSON.parse(deviceStr) : null;
    }//读取设备的缓存信息

    _handleData(data) {
        if (!data) {
            this._deviceList = [];
            return;
        }

        let length = data.length; //this._deviceMap.length = 0;

        for (let i = 0; i < length; i++) {
            this._deviceMap[data[i].device.deviceId] = data[i];
        }

        this._deviceList = data;
    } //处理数据

    //网络获取设备    //刷新指定设备的数据
    refurbishDeviceInfo(deviceId) {
        return new Promise(async (resolve, reject) => {
            try {
                let devices = await Network.syncNet({
                    url: '/v2/device/info', data: {
                        deviceId: deviceId
                    }
                }); //判断如果返回没有该数据直接删除该设备的信息

                if (!devices.data.data || devices.data.data.length === 0) {
                    delete that._deviceMap[deviceId];
                } else {
                    that._deviceMap[deviceId] = devices.data.data[0];
                } //处理list集合 当返回的自己为空或者长度为0代表是删除了设备

                if (!devices.data.data || devices.data.data.length === 0) {
                    let length = that._deviceList.length;

                    for (let i = 0; i < length; i++) {
                        if (that._deviceList[i].device.deviceId === deviceId) {
                            that._deviceList.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    //接受到新设备
                    //判断是否已经存在该设备的信息存在就替换该设备信息没有就新加该设备
                    let deviceTag = false; //用来标记在查询之前集合是否存在该设备

                    let length = that._deviceList.length;

                    for (let i = 0; i < length; i++) {
                        if (that._deviceList[i].device.deviceId === deviceId) {
                            that._deviceList[i] = devices.data.data[0];
                            deviceTag = true;
                            break;
                        }
                    }

                    if (!deviceTag) {
                        that._deviceList.unshift(devices.data.data[0]);
                    }
                }

                uni.setStorage({
                    data: JSON.stringify(this._deviceList), key: devicesCacheKey
                });
                resolve(devices.data.data);
            } catch (e) {
                reject(e);
            }
        });
    }


    //刷新指定设备和指定设备的从设备  比如中继和子设备
    async refurbishDeviceListInfo(deviceId) {
        await this.refurbishDeviceInfo(deviceId);
        let deviceInfo;

        for (let i = 0; i < this._deviceList.length; i++) {
            deviceInfo = this._deviceList[i];
            if (deviceInfo.device && deviceInfo.device.superDeviceId && deviceInfo.device.superDeviceId === deviceId) await this.refurbishDeviceInfo(deviceInfo.deviceId);
        }
    }

    /**
     * 服务器查询设备是否已经存在
     *
     */
    async isExistenceDevice(deviceId) {
        return await Network.syncNet({
            url: '/v2/device/is/exist', data: {
                deviceId: deviceId
            }
        });
    }

    /**
     * 通过设备的deviceId获得设备信息
     */
    getDeviceInfo(deviceId) {
        return this._deviceMap[deviceId];
    }

    /**
     * 指定设备是否在线
     */
    isDeviceOnline(deviceId) {
        let userDevice = this._deviceMap[deviceId];
        return userDevice ? userDevice.device.onLine : false;
    }

    /**
     * 是否是指定设备的管理员
     */
    isDeviceAdmin(deviceId) {
        let userDevice = this._deviceMap[deviceId];
        return userDevice ? userDevice.authType !== 'Admin' : false;
    }


    //获得所有设备列表
    getDeviceList() {
        return this._deviceList;
    }


    async getDeviceQrCode(codeInfo) {
        return await Network.syncNet({
            url: '/v2/file/created/base64/qr/code', data: {
                codeInfo: codeInfo
            }
        });
    }

    //添加设备到服务器
    async addDevice(data) {
        if (data.mac && data.mac.length > 18) {
            data.mac = Util.strToMac(data.deviceId.substring(data.deviceId.length - 12));
        }

        // let ciphertext = AESUtil.encryptBase64({
        //     key: Config.appSecret, data: JSON.stringify(data)
        // });
        return await Network.syncNet({
            url: '/v2/device/add',
            isEncrypt: true,
            data: data
        });
    }

    /**
     * 转让设备
     * @param userId
     * @param deviceId
     * @returns {Promise<*>}
     */
    async transferDevice({userId, deviceId}) {
        let data = {
            userId: userId, deviceId: deviceId
        };
        return await Network.syncNet({url: '/v2/device/translation', data: data});
    }


    /**
     * 删除服务器设备
     * @param data
     * @returns {Promise<*>}
     */
    async deleteDevices(data) {
        return await Network.syncNet({url: '/v2/device/delete', data: data});
    }

    /**
     * 发送设备
     * @param data
     * @returns {Promise<*>}
     */
    async sendDevice(data) {
        return await Network.syncNet({url: '/v2/device/share', data: data});
    }


    //获得指定门锁设备的信息列表，比如密码列表
    async getSlockInfoList(deviceId, type) {
        let map = {
            deviceId: deviceId
        };

        if (type) {
            map.type = type;
        }

        return await Network.syncNet({url: '/v2/device/slock/expand/list', data: map});
    }

    //设备 二维码分享
    async deviceQrCodeShare(date) {
        return await Network.syncNet({
            url: '/v2/device/qr/code/share', data: date
        });
    }

    //关闭设备二维码分享
    async closeDeviceQrCodeShare(codeUuid) {
        return await Network.syncNet({
            url: '/v2/device/close/qr/code/share', data: {
                codeUuid: codeUuid
            }
        });
    }

    //面对面分享的二维码
    async shareQrCode(codeInfo) {
        return await Network.syncNet({
            url: '/v2/file/created/base64/qr/code', data: {
                codeInfo: codeInfo
            }
        });
    }

    //面对面分享扫描二维码后提交的信息
    async submitShareCodeInfo(codeUuid) {
        return await Network.syncNet({
            url: '/v2/device/scan/qr/code/share', data: {
                codeUuid: codeUuid
            }
        });
    } //给设备绑定网关
    //superDeviceId
    //deviceId

    /**
     * 主设备获得子设备列表信息
     * @param deviceId
     */
    async getDeviceJoinDeviceInfo({deviceId}) {
        return await Network.syncNet({
            url: '/v2/device/super/sub/device/list', data: {
                deviceId: deviceId
            }
        });
    }

    /**
     * 绑定子设备
     * @param deviceId 子设备ID
     * @param superDeviceId 主设备ID
     */
    async bindSubDevice({deviceId, superDeviceId}) {
        return await Network.syncNet({
            url: '/v2/device/join/device',
            data: {deviceId: deviceId, superDeviceId: superDeviceId}
        });
    }

    /**
     * 设备取消和网关的关联
     * @param deviceId 子设备ID
     */
    async unbindSubDevice({deviceId}) {
        return await Network.syncNet({url: '/v2/device/cancel/join/device', data: {deviceId: deviceId}});
    }

    //修改wifi设备的wifi信息（暂时后台有问题）
    async updateWifiInfo(data) {
        return await Network.syncNet({url: '/v2/device/update/device/wifi/info', data: data});
    }

    //远程开启设备
    async longOpenDevice(data) {
        return await Network.syncNet({url: '/v2/device/slock/remote/unlock', data: data});
    }

    //拉闸合闸
    //type  off 的时候拉闸，其他都是合闸
    async offOrOn(deviceId, switchState) {
        let data = {
            deviceId: deviceId, switchState: switchState
        };
        return await Network.syncNet({url: '/v2/device/ammeter/switch', data: data});
    }

    //管理员远程修改电价
    async updateElectricity(deviceId, price1) {
        let data = {
            deviceId: deviceId, price1: price1
        };
        return await Network.syncNet({url: '/v2/device/ammeter/update/electricity/price', data: data});
    }

    //管理员远程充值
    async deviceRecharge(deviceId, money) {
        let data = {
            deviceId: deviceId, money: money * 100
        };
        return await Network.syncNet({url: '/v2/device/ammeter/recharge', data: data});
    }

    //远程清空设备信息
    async cleanDeviceInfo(deviceId) {
        let data = {
            deviceId: deviceId
        };
        return await Network.syncNet({url: '/v2/device/clean', data: data});
    }

    /**
     *  给门锁设备添加信息 卡、指纹、密码
     */

    async addSlockDeviceInfo(data) {
        return await Network.syncNet({url: '/v2/device/slock/add/expand/info', data: data});
    }

    /**
     * 删除服务器门锁设备添加信息 卡、指纹、密码
     * @param deviceId 设备id
     * @param uid 删除位置的uid
     * @param type 删除什么类型的数据 PASSWORD密码，Card门卡，MARK指纹
     */

    async deleteSlockDeviceInfo(deviceId, uid, type) {
        let data = {
            deviceId: deviceId, uid: uid, type: type
        };
        return await Network.syncNet({url: '/v2/device/slock/delete/expand/info', data: data});
    }

    /**
     * 修改门锁设备密码、指纹、门卡等信息 現在主要冻结状态
     * @param deviceId 设备id
     * @param uid 删除位置的uid
     * @param type 删除什么类型的数据 PASSWORD密码，IC_CARD门卡，MARK指纹
     * @param freeze 是否冻结
     */
    async updateSlockDeviceInfo(deviceId, uid, type, freeze) {
        let data = {
            deviceId: deviceId, uid: uid, type: type, isFreeze: freeze
        };
        return await Network.syncNet({url: '/v2/device/slock/frezee/expand/info', data: data});
    }

    /**
     * 修改门锁设备的扩展信息的名称
     */
    async updateSlockExpandName({deviceId, uid, type, name}) {
        let data = {
            deviceId: deviceId, uid: uid, type: type, name: name
        };
        return await Network.syncNet({url: '/v2/device/slock/update/expand/name', data: data});
    }


    /**
     *  修改门锁设备的信息 volume battery statusCode rssi
     * @param data  需要修改的设备信息 必须包含设备的ID
     */

    async updateDevicesInfo({deviceId, volume, battery, statusCode, rssi}) {
        let data = {deviceId: deviceId};
        if (volume) {
            data.volume = volume;
        }
        if (battery) {
            data.battery = battery;
        }
        if (statusCode) {
            data.statusCode = statusCode;
        }
        if (rssi) {
            data.rssi = rssi;
        }
        return await Network.syncNet({url: '/v2/device/slock/update/status', data: data});
    }


    /**
     * 修改设备名称 管理员和普通用户都可以使用
     * @param deviceId
     * @param deviceName
     */
    async updateDevicesName({deviceId, deviceName}) {
        return new Promise(async (resolve, reject) => {
            try {
                let newVar = await Network.syncNet({
                    url: '/v2/device/change/name', data: {
                        deviceId: deviceId, deviceName: deviceName
                    }
                });
                await this.refurbishDeviceListInfo(deviceId);
                resolve(newVar);
            } catch (e) {
                reject(e);
            }
        })
    }


    /**
     * 上传门锁事件信息
     * @param deviceId 设备ID
     * @param list 事件列表 {"event":"01","mode":"71","uid":"0000","timestamp":1669002224}
     */
    uploadRecord = function ({deviceId, list}) {
        let data = {
            deviceId: deviceId, list: list
        }
        Network.post({
            url: '/v2/device/slock/upload/record', data: data, isSing: true, success: function (res) {
                console.log('批量上传记录成功:', res); //判断如果是一次性钥匙开门成功直接删除
                let deviceUserD = that.getDeviceInfo(deviceId);
                if (deviceUserD.authType != null && deviceUserD.authType === 'Disposable') {
                    that.refurbishDeviceInfo(deviceId);
                }
            },

            fail(err) {
                console.log('删除开锁记录失败', err);
            }
        });
    };


    /**
     * 获取门锁设备事件记录
     */
    getRecords = async function (deviceId, pager) {
        return await Network.syncNet({
            url: '/v2/device/slock/record/list', data: {
                deviceId: deviceId, pageIndex: pager
            }
        });
    };

    /**
     * 获得指定设备的所有用户只设备管理员用户可以获得
     * @param deviceId
     */
    getDeviceUserList = async function (deviceId) {
        return await Network.syncNet({
            url: '/v2/device/user/list', data: {
                deviceId: deviceId
            }
        });
    };

    /**
     * 管理员删除指定设备用户
     * @param recallUserUuid
     * @param deviceId
     */
    manageDeleteDeviceUser = async function ({recallUserUuid, deviceId}) {
        return await Network.syncNet({
            url: '/v2/device/admin/recall/auth', data: {
                recallUserUuid: recallUserUuid, deviceId: deviceId
            }
        });
    };

    /**
     *获取指定设备类型的固件版本最新信息
     */
    async getDeviceFirmwareInfo(deviceId) {
        // let envVersion;
        // //#ifdef MP
        // envVersion = __wxConfig.envVersion;
        // envVersion = envVersion[0].toUpperCase() + envVersion.substring(1);
        // //#endif
        //
        // //#ifndef MP
        // envVersion = "Release";//不是小程序的默认正式版本
        // //#endif

        let envVersion = "Release";
        console.log('配置信息', envVersion);
        return await Network.syncNet({
            url: '/v2/device/new/firmware', data: {
                deviceId: deviceId, envVersion: envVersion
            }
        });
    }

    /**
     *设备ota成功更新版本等信息
     */
    async updateDeviceFirmwareVersion({deviceId, newVersion}) {
        let envVersion = __wxConfig.envVersion;
        envVersion = envVersion[0].toUpperCase() + envVersion.substring(1);
        return await Network.syncNet({
            url: '/v2/device/update/firmware/version', data: {
                deviceId: deviceId, newVersion: newVersion, envVersion: envVersion
            }
        });
    }


    /**
     * 获得固件升级记录
     */
    async getOtaLogList(model) {
        return await Network.syncNet({
            url: '/v2/device/firmware/update/log', data: {
                model: model
            }
        });
    }


    /**
     * 获得设备金额的消费情况
     */
    async getDeviceMoneyRecord({deviceId, page}) {
        return await Network.syncNet({
            url: '/v2/device/amount/record', data: {
                deviceId: deviceId, pageIndex: page
            }
        });
    }

    /**
     * 获得常见问题列表
     */
    async getFaqList() {
        return await Network.syncNet({
            url: '/v2/device/faq/list', data: {
                language: "Chinese"
            }
        });
    }


    /**
     * 获得说明书列表
     */
    async getInstructionList() {
        return await Network.syncNet({
            url: '/v2/device/instruction/list', data: {
                language: "Chinese"
            }
        });
    }


    /**
     * 远程网关数据透传
     * @param deviceId
     * @param command
     * @param overtime 超时时间 单位秒
     * @returns {Promise<unknown>}
     */
    async remoteRelayPenetrateDevice({deviceId, command, overtime = 15}) {
        return new Promise((resolve, reject) => {
            //判断是否有该设备的权限
            let deviceInfo = that.getDeviceInfo(deviceId);
            let authCode = that.devicesAuthDateVerify(deviceInfo);
            if (authCode.errCode !== BleError["0"].errCode) {
                reject(authCode);
                return;
            }
            if (!deviceInfo.device.onLine) {
                console.log("设备不在线");
                reject(BleErrMsg["10121"]);
                return;
            }
            let penetrateData = {
                "command": command,
                "nonceStr": Util.randomStr(16),
                "messageId": Util.randomStr(16),
                "timestamp": Math.ceil(new Date().getTime() / 1000)
            }
            let payload = AESUtil.encryptBase64({
                iv: deviceInfo.device.deviceKey.substring(0, 16),
                key: deviceInfo.device.deviceKey, data: JSON.stringify(penetrateData)
            });

            let device = deviceInfo.device;
            let receiveTopic = "sub/";
            //添加消息的接收者的唯一设备ID
            if (device.superDeviceId) {
                receiveTopic = receiveTopic + device.superDeviceId + "/";
            } else {
                receiveTopic = receiveTopic + device.deviceId + "/";
            }
            //添加该主题的唯一识别码
            receiveTopic = receiveTopic + new Date().getTime() + "/";

            //添加该信息的执行者的唯一设备ID
            receiveTopic = receiveTopic + device.deviceId;


            let data = {
                deviceId: deviceId,
                payload: payload,
                receiveTopic: receiveTopic,
                overtime: overtime
            };
            console.log("发送数据", data);

            Network.syncNet({url: '/v2/mqtt/penetrate/message', data: data, isEncrypt: true})
                .then((value) => {
                    value.data.data = JSON.parse(AESUtil.decryptBase64({
                        iv: deviceInfo.device.deviceKey.substring(0, 16),
                        key: deviceInfo.device.deviceKey,
                        ciphertext: value.data.data
                    }));
                    if (!value.data.data || !value.data.data.replyCommand) {
                        reject(JSON.parse(JSON.stringify(BleError["-1"])));
                        return;
                    }
                    // console.log("远程添加密钥返回的数组", value.data.data);
                    resolve(value);
                })
                .catch((reason) => reject(reason));
        });
    }


    /**
     * 暂时关闭
     *  校验用户微信一次性钥匙是否存在
     * @param platformAppId 平台的APPID
     * @param wxAppId 小程序的appId
     * @param deviceId 开启的设备ID
     * @param userId  可以使用该权限的手机号
     * @param wxCode 微信的wx.login 返回的登陆code
     * @param encryptedData 获取当前微信登陆的手机号的加密信息
     * @param iv 用于解密微信加密的IV
     */
    async isWxOneTimeKey({platformAppId, wxAppId, deviceId, userId, wxCode, encryptedData, iv}) {
        let data = {
            type: 'WhatsApp',
            platformAppId: platformAppId,
            appid: wxAppId,
            deviceId: deviceId,
            userId: userId,
            wxCode: wxCode,
            encryptedData: encryptedData,
            iv: iv
        };
        let info = await Network.syncNet({
            url: '/user/devices/wx_disposable_key_auth', data: data, isSing: false
        });
        console.log('后台返回的信息', info);
        return info;
    }

    /**
     * 冻结或者解冻设备
     * @param deviceId
     * @param freezeUserUuid
     * @param isFreeze
     */
    async isFreezeDevice({deviceId, freezeUserUuid, isFreeze}) {
        return await Network.syncNet({
            url: '/v2/device/freeze/user/auth', data: {
                deviceId: deviceId, freezeUserUuid: freezeUserUuid, isFreeze: isFreeze
            }
        });
    }

    //设备支持的硬件，比如指纹，键盘等 //判断设备是否支持该功能
    isDeviceFunction({deviceId, types}) {
        //02001F, 0400000001
        //console.log("查询的类型", types);
        if (!deviceId) return false;
        let device = this.getDeviceInfo(deviceId).device;
        let deviceFunction = deviceModelEncodedCache[device.model]; //取出缓存的数据如果没有再去重新解析新的数据

        if (!deviceFunction) {
            //减去4是为了去除末尾两个自己的厂家编码,新版本已经升级到4个字节,所以新版需要减去8个字节
            let functionStr = device.model.substring(2, 2 + parseInt(device.model.substring(0, 2), 16) * 2);
            deviceFunction = Util.hexToBin(functionStr); //调用16进制转2进制
            deviceModelEncodedCache[device.model] = deviceFunction; //添加到缓存
        }

        // let functionList = ['gprs', 'ethernet', 'wifi', 'lora', 'zigbee', 'catEye', 'face', 'buzzer', 'voice', 'mark', 'card', 'keyboard', 'ble'];

        switch (types) {

            case 'gprs':
                //是否支持GPRS连接网络
                return deviceFunction[0] === 1;

            case 'ethernet':
                //是否支持以太网
                return deviceFunction[1] === 1;

            case 'wifi':
                //是否支持wifi
                return deviceFunction[2] === 1;

            case 'lora':
                //是否支持lora
                return deviceFunction[3] === 1;


            case 'zigbee':
                //是否支持zigbee
                return deviceFunction[4] === 1;


            case 'catEye':
                //是否支持猫眼
                return deviceFunction[5] === 1;


            case 'face':
                //是否支持人脸
                return deviceFunction[6] === 1;

            case 'buzzer':
                //是否支持蜂鸣器
                return deviceFunction[7] === 1;


            case 'voice':
                //是否支持语音
                return deviceFunction[8] === 1;


            case 'mark':
                //是否支持指纹
                return deviceFunction[9] === 1;

            case 'card':
                //是否支持刷卡
                return deviceFunction[10] === 1;

            case 'keyboard':
                //是否支持键盘
                return deviceFunction[11] === 1;


            case 'ble':
                //是否支持蓝牙
                return deviceFunction[12] === 1;


            case 'net':
                //是否支持联网（不管是什么联网方式只要支持其中一种都返回true）
                return deviceFunction[0] + deviceFunction[2] + deviceFunction[3] + deviceFunction[4] > 0;
            //还可以继续添加其他条件

            default:
                return this._isDeviceSoftware(device, types);
        }
    }

    /**
     * 解析设备支持的软件功能 返回false
     */
    _isDeviceSoftware(device, types) {
        let deviceFunction = deviceModelEncodedCache[device.softwareCode]; //取出缓存的数据如果没有再去重新解析新的数据

        if (!deviceFunction) {
            deviceFunction = Util.hexToBin(device.softwareCode); //调用16进制转2进制

            deviceModelEncodedCache[device.softwareCode] = deviceFunction; //添加到缓存
        }

        switch (types) {
            case 'ota':
                //是否支持固件上升级
                return deviceFunction[176] === 1;
            //软件编码176位为1代表可以升级

            case 'closeCard':
                //是否支持关闭刷卡功能
                return deviceFunction[177] === 1;

            case 'initAdmin':
                //是否初始化需要输入管理员信息
                return deviceFunction[178] === 1;

            default:
                return false;
        }
    }

    /**
     * 解析设备支持的软件功能
     */
    deviceSoftware(deviceId) {
        let device = this.getDeviceInfo(deviceId).device;
        let deviceFunction = deviceSoftwareEncodedCache[device.softwareCode]; //取出缓存的数据如果没有再去重新解析新的数据

        if (deviceFunction) return deviceFunction; //判断如果有缓存数据直接返回

        let softwareCode = device.softwareCode;
        let list = []; //把16进制字符串切割成2个字节的字符串

        for (let i = 0; i < softwareCode.length;) {
            list.push(softwareCode.substring(i, (i += 4)));
        }

        let pwdTypeList = [{
            name: 'Admin', cmd: '00'
        }, {
            name: 'User', cmd: '01'
        }, {
            name: 'Disposable', cmd: '02'
        }, {
            name: 'Kidnap', cmd: '03'
        }, {
            name: 'Time', cmd: '04'
        }]; //支持的密码列表，还可以继续往后添加最多16种

        let cardTypeList = [{
            name: 'Admin', cmd: '01'
        }, {
            name: 'User', cmd: '02'
        }]; //支持的卡列表，还可以继续往后添加最多16种

        let markTypeList = [{
            name: 'Admin', cmd: '01'
        }, {
            name: 'User', cmd: '02'
        }, {
            name: 'Disposable', cmd: '03'
        }]; //支持的指纹列表，还可以继续往后添加最多16种

        let faceTypeList = [{
            name: 'Admin', cmd: '01'
        }, {
            name: 'User', cmd: '02'
        }, {
            name: 'Disposable', cmd: '03'
        }]; //支持的人脸列表，还可以继续往后添加最多16种

        let modelTypeList = [{
            name: 'Normal', //正常模式
            cmd: '00'
        }, {
            name: 'DoNotDisturb',//勿扰模式
            cmd: '01'
        }, {
            name: 'NormallyOpen',//常开模式
            cmd: '02'
        }, {
            name: 'Safe',//安全模式
            cmd: '03'
        }, {
            name: 'Taste',//体验模式
            cmd: '04'
        }]; //支持的模式列表，还可以继续往后添加最多16种

        let otherList = [{
            name: 'Ota', cmd: '00'
        }, {
            name: 'CloseCard', //关闭刷卡功能
            cmd: '01'
        }, {
            name: 'PasswordInit',//输入密码初始化
            cmd: '02'
        }]; //特殊功能
        //解析出的设备信息

        let deviceInfo = {
            deviceType: list[0], //设备类型
            passwordSum: parseInt(list[1], 16), //支持的密码总数
            passwordType: this._indexArrayData(pwdTypeList, list[2]), //支持的密码类型
            cardSum: parseInt(list[3], 16), //支持卡的总数
            cardType: this._indexArrayData(cardTypeList, list[4]), //支持的密码类型
            markSum: parseInt(list[5], 16), //支持的指纹总数
            markType: this._indexArrayData(markTypeList, list[6]), //支持的指纹类型
            faceSum: parseInt(list[7], 16), //支持的人脸总数
            faceType: this._indexArrayData(faceTypeList, list[8]), //支持的人脸类型
            modelType: this._indexArrayData(modelTypeList, list[9]), //支持的模式
            connectionNumber: parseInt(list[10], 16), //支持的同时连接数
            otherFunction: this._indexArrayData(otherList, list[11] + list[12]) //特殊功能
        };
        deviceSoftwareEncodedCache[softwareCode] = deviceInfo; //添加到缓存

        return deviceInfo;
    }

    /**
     * 通过制定指令的二进制位来索引制定数据的数据，二进制位为1返回对应位置的数据
     * @param list 索引的数组
     * @param code 解析的code 必须是16进制
     */

    _indexArrayData = function (list, code) {
        let hexToBin = Util.hexToBin(code); //字节取出转换成2进制安位进行索引，1代表支持0代表不支持
        let indexList = []; //支持的列表
        for (let i = 0; i < hexToBin.length; i++) {
            if (hexToBin[i] === 1 && list[i]) indexList.push(list[i]); //二进制未1 取出的值不为空
        }
        return indexList;
    };

    //解析指定设备的状态信息,根据状态码获得的设备的状态
    getDeviceStatusInfo(deviceId) {
        let deviceInfo = this._deviceMap[deviceId];
        if (!deviceInfo) return {};
        console.log("设备的状态信息", deviceInfo.device.statusCode)
        return CommandUtil.analyzeDeviceStateCode(deviceInfo.device.statusCode);
    }


    /**
     * 数字转成中文权限
     */
    numberToCh(authType) {
        switch (authType) {
            case 1:
                return '管理员';

            case 2:
                return '普通用户';

            case 3:
                return '一次性';

            case 4:
                return '周期用户';

            case 5:
                return '防劫持';

            case 6:
                return '微信一次性钥匙';

            default:
                return '未知';
        }
    }

    /**
     * 英文转数字
     */
    enToNumber(authType) {
        switch (authType) {
            case 'Admin':
                return 0x1;

            case 'User':
                return 0x2;

            case 'Anti'://防劫持密码
                return 0x3;

            case 'Disposable':
                return 0x4;

            case 'DoubleAuth'://双重认证
                return 0x5;


            default:
                return 0xf;
        }
    }


    /**
     * 设备权限验证 还需要实现周期用户
     * 返回0代表成功 1代表过期 2代表还未生效 3代表设备被冻结，
     */

    devicesAuthDateVerify(deviceUserD) {
        if (!deviceUserD || !deviceUserD.device) {
            return BleError["10110"];
        }
        //判断是否被冻结
        if (deviceUserD.freeze) return BleErrMsg["10118"];

        if (deviceUserD.authType === 'Admin') return BleErrMsg["0"]; //管理员权限不用验证

        if (deviceUserD.endDate * 1000 < SystemTimeManage.getServerTime()) {//除了管理员所有的权限都要验证日期
            console.log('设备过期' + deviceUserD.endDate);
            return BleErrMsg["10111"];
        }

        if (deviceUserD.startDate * 1000 > SystemTimeManage.getServerTime()) {
            console.log('还未到达生效时间' + deviceUserD.startDate);
            return BleErrMsg["10112"];
        } //普通用户和一次用户和一次微信钥匙到这个位置代表有权限

        if (deviceUserD.authType === 'User' || deviceUserD.authType === 'Disposable' || deviceUserD.authType === 'WXDisposable') return BleErrMsg["0"]; //这里就还剩下周期用户


        return BleErrMsg["0"];
    }


    /**
     * 清空所有设备缓存信息
     */
    cleanCacheInfo = function () {
        uni.removeStorage({
            key: devicesCacheKey
        });

        this._deviceMap.clear();

        this._deviceList.length = 0;
    };
}

Devices.getInstance = function () {
    let devices;
    if (!devices) devices = new Devices();
    return devices;
};

// module.exports = Devices.getInstance();
export default Devices.getInstance();