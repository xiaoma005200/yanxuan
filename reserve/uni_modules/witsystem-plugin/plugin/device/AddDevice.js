//添加设备
import Ble from '../ble/Ble';
import Devices from '../model/Devices';
import Location from '../location/Location';
import BleError from '../error/BleError';
import StrUtils from '../utils/StrUtils';
import CommandUtil from './command/CommandUtil';
import Command from './command/Command';


import {
    initVueI18n
} from '@dcloudio/uni-i18n'
import messages from '../i18n/index.js'
import Config from "../config/Config";

const {
    t
} = initVueI18n(messages)

let that;

class AddDevice {
    constructor() {
        that = this;
        this.MODEL_SERVICES = '0000180A-0000-1000-8000-00805F9B34FB'; //设备信息服务

        this.BATTERY = '00002A23-0000-1000-8000-00805F9B34FB'; //设备电量

        this.MODEL = '00002A24-0000-1000-8000-00805F9B34FB'; //设备型号

        this.VERSION = '00002A26-0000-1000-8000-00805F9B34FB'; //固件版本

        this.SERVICES = '0000FFF1-0000-1000-8000-00805F9B34FB'; //添加设备

        this.WRITE = '0000FF01-0000-1000-8000-00805F9B34FB'; //写入数据的特征

        this.READ = '0000FF02-0000-1000-8000-00805F9B34FB'; //读取数据的特征，或者是通知的特征

        this.TOKEN = '0000FF03-0000-1000-8000-00805F9B34FB'; //读取token

        this.BROAD_CAST = '0000F1FF-0000-1000-8000-00805F9B34FB'; //判断是否进入设置状态广播标记

        this.READ_KEY_COMMAND = "E701E8";//读取密钥的指令

        this.ADD_SUCCESS_COMMAND = "E702E9";//确认添加设备成功

    }

    /* -------------------------------------------通过ble添加设备-----------------------------------------------*/
    //扫描可以添加的设备

    scanAddDevice = function ({result, error, scanEnd}) {
        Ble.scan({
            scanTime: 12000,
            interval: 0,
            allowDuplicatesKey: true,
            result(res) {
                let length = res.devices.length;
                for (let i = 0; i < length; i++) {
                    if (that.BROAD_CAST === res.devices[i].advertisServiceUUIDs[0]) {
                        result(res.devices[i]);
                    }
                }
            },
            error: error,
            scanEnd: scanEnd
        });
    }; //停止扫描获取可以添加的设备

    stopScanAddDevice = function () {
        Ble.stopScan();
    };

    /**
     * wiatSetState函数，只有在设备没有进入设置状态的时候进行回调，
     * 并且等待设备进入设置状态，等待10秒，否则超时,返回的参数，-1代表等待进入设置状态 0代表进入设置状态
     * wifiName 和 wifiPwd 添加需要连接wifi的设备时候才需要传入
     * 添加
     * @param scanDeviceName//扫描返回的设备name
     * @param scanDeviceId//扫描返回的设备id android 为mac地址
     * @param deviceNickname//用户给设备取名
     * @param setState//进入设置状态的回调函数，必须从非设置状态 到 设置状态
     */
    addBleDevice = function ({scanDeviceName, scanDeviceId, deviceNickname, wifiName, wifiPassword}) {
        return new Promise(async (resolve, reject) => {
            console.log(">>>>>>>>>>>>>>>>>", scanDeviceName + "::" + scanDeviceId);
            try {
                if (!scanDeviceName) {
                    reject(JSON.parse(JSON.stringify(BleError["10107"])));
                    return;
                }
                let info = await Devices.isExistenceDevice(scanDeviceName);
                if (info.data.data.isExistence) {
                    // reject({errCode: -5, errMsg: '设备已存在于“' + info.data.data.userId + '”用户名下，需要该用户删除后才能添加'});
                    let parse = JSON.parse(JSON.stringify(BleError["10105"]));//拷贝出一个全新的对象
                    parse.userId = info.data.data.userId;
                    reject(parse);
                    return;
                }

                if (scanDeviceName && !scanDeviceId && Ble.platform === 'ios') {
                    let deviceInfo = await Ble.scanDesignatedDevice({
                        deviceName: scanDeviceName,
                        interval: 100,
                        allowDuplicatesKey: true
                    });
                    scanDeviceId = deviceInfo.deviceId;
                } else if (scanDeviceName && !scanDeviceId) {
                    scanDeviceId = Ble.deviceNameToMac(scanDeviceName);
                }
                console.log("连接设备");
                //连接设备
                await Ble.connection({deviceId: scanDeviceId, timeout: 10000});

                await Ble._asyncTimer(100);
                console.log("发现服务");
                //发现服务
                await Ble.getBleServices({deviceId: scanDeviceId});


                //发现特征值
                console.log("发现特征值");
                await Ble._asyncTimer(100);
                await Ble.getBleCharacteristics({deviceId: scanDeviceId, serviceId: that.SERVICES});
                console.log("获取密钥");
                //获取密钥
                let keyInfo = await that._readKey({scanDeviceId: scanDeviceId, data: that.READ_KEY_COMMAND});
                console.log("返回的密钥解析完成数据", JSON.stringify(keyInfo));

                //判断是否需要添加wifi信息
                if (wifiName && wifiPassword) {
                    await Ble.setBleMtu({deviceId: scanDeviceId, mtu: 255});
                    console.log("更新完mtu");
                    await that._sendWifiInfo({scanDeviceId: scanDeviceId, wifiInfo: wifiName, cmd: "05"});
                    await that._sendWifiInfo({scanDeviceId: scanDeviceId, wifiInfo: wifiPassword, cmd: "06"});
                    console.log("wifi信息添加成功");
                }


                await Ble._asyncTimer(100);
                await Ble.getBleCharacteristics({deviceId: scanDeviceId, serviceId: that.MODEL_SERVICES});
                await Ble._asyncTimer(100);

                //读取设备型号
                let deviceModel = await Ble.readValue({
                    deviceId: scanDeviceId,
                    serviceId: that.MODEL_SERVICES,
                    characteristicId: that.MODEL
                });
                console.log("读取设备型号", Ble.ab2hex(deviceModel.value));
                //读取设备固件版本
                let deviceVersion = await Ble.readValue({
                    deviceId: scanDeviceId,
                    serviceId: that.MODEL_SERVICES,
                    characteristicId: that.VERSION
                });
                console.log("读取设备固件版本", Ble.ab2hex(deviceVersion.value));
                //设备电量
                let deviceBattery = await Ble.readValue({
                    deviceId: scanDeviceId,
                    serviceId: that.MODEL_SERVICES,
                    characteristicId: that.BATTERY
                });

                console.log("设备电量", Ble.ab2hex(deviceBattery.value));

                let addInfo = await Devices.addDevice({
                    type: scanDeviceName.substring(0, 5),
                    deviceId: scanDeviceName,
                    deviceKey: keyInfo.data,
                    mac: scanDeviceId,
                    model: Ble.ab2hex(deviceModel.value),
                    version: Ble.ab2hex(deviceVersion.value),
                    deviceName: deviceNickname ? deviceNickname : t("plugin.smart-device"),
                    battery: parseInt(Ble.ab2hex(deviceBattery.value), 16),
                    longitude: Location.getLocation().longitude ? Location.getLocation().longitude : null,
                    latitude: Location.getLocation().latitude ? Location.getLocation().latitude : null
                });
                await Ble._asyncTimer(300);
                console.log('添加到服务器成功', addInfo);

                //发送确认指令
                try {
                 //   this.ADD_SUCCESS_COMMAND = "E702E9";//确认添加设备成功
                    let date = new Date();
                    const utcTimestamp = date.getTime();//utc时间戳
                    const localTimestamp = date.getTimezoneOffset() * -60 * 1000 + utcTimestamp;//本地时间戳
                    let command = new Command();
                    command.head = "E7"
                    command.cmd = "02"
                    command.data = command.data + Math.floor(utcTimestamp / 1000).toString(16).padStart(8, "0");
                    command.data = command.data + Math.floor(localTimestamp / 1000).toString(16).padStart(8, "0");
                    let successData = CommandUtil.commandToHex(command);
                    console.log("发送添加成功的指令", JSON.stringify(command))
                    await that._readKey({scanDeviceId: scanDeviceId, data: successData});
                } catch (e) {
                    console.log("确认指令失败删除已经添加到服务器的设备信息",e);
                    await Devices.deleteDevices({deviceId: scanDeviceId});//添加失败删除设备
                    reject(e);
                    return;
                }

                let deviceInfo = await Devices.refurbishDeviceInfo(scanDeviceName);
                await Ble.disconnection({deviceId: scanDeviceId});
                console.log('添加成功', deviceInfo);
                resolve(deviceInfo);
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });
    };


    /**
     *获取密钥
     * @param scanDeviceId 监听设备的ID
     * @param data  发送的数据
     */
    _readKey = function ({scanDeviceId, data}) {
        return new Promise(async (resolve, reject) => {
            let timoutNumber = setTimeout(function () {
                Ble.closeCharacteristicValueChange();
                reject(JSON.parse(JSON.stringify(BleError["10106"])));
            }, 1500);
            Ble.characteristicValueChange({
                deviceId: scanDeviceId,
                serviceId: that.SERVICES,
                characteristicId: that.READ,
                result(res) {
                    clearTimeout(timoutNumber);
                    Ble.closeCharacteristicValueChange();
                    let keyInfo = CommandUtil.hexToCommand(Ble.ab2hex(res.value))
                    if (keyInfo.stateCode !== "00") {
                        that.stopAddBle(scanDeviceId);
                        reject(JSON.parse(JSON.stringify(BleError[keyInfo.stateCode.toUpperCase()])));
                    } else {
                        resolve(keyInfo);
                    }
                },
                error(err) {
                    clearTimeout(timoutNumber);
                    reject(err);
                }
            });
            await Ble._asyncTimer(300);
            console.log("写入的数据", data)
            await Ble.writeValue({
                deviceId: scanDeviceId,
                serviceId: that.SERVICES,
                characteristicId: that.WRITE,
                buffer: Ble.hex2ab(data).buffer
            });
        });
    };


    /**
     *发送wifi信息
     * @param wifiInfo wifi名称或者wifi密码
     * @param cmd 05 wifi名称 06 wifi密码
     */
    _sendWifiInfo = function ({scanDeviceId, wifiInfo, cmd}) {
        return new Promise(async (resolve, reject) => {
            await Ble._asyncTimer(300);
            let timoutNumber = setTimeout(function () {
                Ble.closeCharacteristicValueChange();
                reject(JSON.parse(JSON.stringify(BleError["10120"])));
            }, 16000);
            Ble.characteristicValueChange({
                deviceId: scanDeviceId,
                serviceId: that.SERVICES,
                characteristicId: that.READ,
                result(res) {
                    clearTimeout(timoutNumber);
                    Ble.closeCharacteristicValueChange();
                    let hex = Ble.ab2hex(res.value);
                    let reply = CommandUtil.hexToCommand(hex);
                    if (reply.stateCode !== '00') {
                        reject(JSON.parse(JSON.stringify(BleError[reply.stateCode.toUpperCase()])));
                    } else {
                        resolve(reply);
                    }
                },
                error(err) {
                    clearTimeout(timoutNumber);
                    reject(err);
                }
            });
            await Ble._asyncTimer(300);
            let wifiHex = StrUtils.strToHexCharCode(wifiInfo);
            let command = new Command();
            command.head = "E7";
            command.cmd = cmd;
            command.data = wifiHex;
            let sendHex = CommandUtil.commandToHex(command);
            await Ble.writeValue({
                deviceId: scanDeviceId,
                serviceId: that.SERVICES,
                characteristicId: that.WRITE,
                buffer: Ble.hex2ab(sendHex).buffer
            });
        });
    };


    //停止添加
    stopAddBle = function (scanDeviceId) {
        that.stopScanAddDevice();
        Ble.disconnection({deviceId: scanDeviceId});
    };


}


AddDevice.getInstance = function () {
    let addDevice;
    if (!addDevice) addDevice = new AddDevice();
    return addDevice;
};

export default {
    scanAddDevice: AddDevice.getInstance().scanAddDevice,
    //扫描蓝牙设备
    stopScanAddDevice: AddDevice.getInstance().stopScanAddDevice,
    //停止扫描蓝牙设备
    addBleDevice: AddDevice.getInstance().addBleDevice,
    //添加蓝牙设备
    stopAddBle: AddDevice.getInstance().stopAddBle,
    //停止添加蓝牙设备
    addWifiDevice: AddDevice.getInstance().addWifiDevice,
};



