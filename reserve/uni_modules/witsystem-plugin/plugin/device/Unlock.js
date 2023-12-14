//开门的js
import Ble from '../ble/Ble';
import Devices from '../model/Devices';
import BleSerialPort from './BleSerialPort';
import Network from "../net/network";
import BleError from "../error/BleError";
import Command from "./command/Command";
import CommandUtil from "./command/CommandUtil";

let that;

class Unlock {
    constructor() {
        that = this;

    }

    /**
     * 蓝牙扫描附近可以开启的设备只扫描，其他动作需要用户来处理
     * @param fail 错误的时候调用
     * @param deviceChange 可用设备个数发生变化的时候调用
     * @param scanTimeOut 扫描结束或者超市的时候调用
     * @param scanTime 扫描时长最短1100毫秒
     */
    scanAvailableBle = function ({fail, deviceChange, scanEnd, scanTime}) {
        let array = [];
        Ble.scan({
            scanTime: scanTime && scanTime > 1100 ? scanTime : 1100,
            interval: 200,
            allowDuplicatesKey: true,
            result(res) {
                res.devices.forEach((item) => {
                    if (item.localName && Devices.getDeviceInfo(item.localName) && item.localName.indexOf('Slock') > -1) {
                        array.push(item);
                    }
                });
                if (deviceChange) deviceChange(array);
            },

            error(err) {
                if (fail) fail(err);
            },

            scanEnd() {
                if (scanEnd)
                    scanEnd(array)
            }
        });
    };

    /**
     * 停止扫描附近可以用的设备
     */
    stopScanAvailableBle = function () {
        Ble.stopScan();
    };


    /** 新版本还需要修改成功根据信号强度来开启设备
     * 蓝牙一键开门
     * 蓝牙自动搜索附近的设备完成开启设备
     * 如果扫描到多个选择信号最强的那个进行开启设备
     */
    bleUnlockDevices = function () {
        let deviceNames = '';
        let device = [];
        return new Promise((resolve, reject) => {
            Ble.scan({
                scanTime: 8000,
                interval: 700,
                allowDuplicatesKey: true,
                result(res) {
                    let devices = res.devices;
                    let length = devices.length;
                    let deviceInfo;
                    for (let i = 0; i < length; i++) {
                        deviceInfo = Devices.getDeviceInfo(devices[i].localName);
                        if (deviceInfo && devices[i].localName && deviceNames.indexOf(devices[i].localName) === -1 && devices[i].localName.indexOf('Slock') > -1) {
                            deviceNames = deviceNames + ',' + devices[i].localName;
                            devices[i]['deviceName'] = deviceInfo.deviceName;
                            device.push(devices[i]);
                        }
                    }
                    if (device.length === 0) return;
                    Ble.stopScan(); //这里判断有几个值是符合要求的如果有多个返回让用户选择，只有一个直接连接开门
                    if (device.length === 1) {
                        that.bleUnlockDevice({
                            scanDeviceName: device[0].localName,
                            scanDeviceId: device[0].deviceId
                        })

                    }
                },

                error(err) {
                    reject(err);
                },

                scanEnd() {
                    reject({
                        errMsg: '没有发现设备,请重试'
                    });
                }
            });
        });
    };


    /**
     * 蓝牙开启指定设备
     * scanDeviceName 开启指定设备的名字/在json返回里面是deviceId
     * 两种个值任意指定一个就生效
     */
    bleUnlockDevice = function ({scanDeviceName}) {
        return new Promise(async (resolve, reject) => {
            try {
                await BleSerialPort.sendSerialPortData({
                    scanDeviceName: scanDeviceName,
                    isUnlockAuth: true
                });
                BleSerialPort.closeSerialPort(scanDeviceName);
                that.uploadUnlockRecord({
                    state: 'Success',
                    deviceId: scanDeviceName,
                    battery: 100
                });
                resolve(Devices.getDeviceInfo(scanDeviceName));
            } catch (e) {
                that.uploadUnlockRecord({
                    state: 'Fail',
                    deviceId: scanDeviceName,
                    errCode: e.errCode,
                    errMsg: '' + e.errMsg
                });
                reject(e);
            }
        });
    };


    /*》》》》》》》》》》》》》》》》下面的开锁方法scanConnectAuth，sendUnlockCmd，disconnectUnCertification 必须配合使用》》》》》》》》》》》》》》》》》》》》》》》》*/

    /**
     * 连续开启设备，一次完成可以立马再次调用，注意必须开启的是同一个设备
     * @param scanDeviceName 扫描获得设备设备名称 和api返回的deviceId对应
     * @param scanDeviceId  扫描获得的设备ID android是mac地址 IOS是一个UUID
     * @param isUnlock 是否开门，如果为false 只进行连接认证
     */
    continuationUnlock = function ({scanDeviceName, scanDeviceId, isUnlock}) {
        return new Promise(async (resolve, reject) => {
            try {
                isUnlock = !isUnlock ? isUnlock : true;
                let newVar = await BleSerialPort.sendSerialPortData({
                    scanDeviceName: scanDeviceName,
                    scanDeviceId: scanDeviceId,
                    isUnlockAuth: isUnlock
                });
                console.log("开门返回的信息", newVar);
                let deviceInfo = Devices.getDeviceInfo(scanDeviceName);
                if (isUnlock && newVar.battery) {
                    deviceInfo.device.battery = parseInt(newVar.battery, 16);
                    setTimeout(function () {
                        that.uploadUnlockRecord({
                            state: 'Success',
                            deviceId: scanDeviceName,
                            battery: parseInt(newVar.battery, 16)
                        });
                    }, 10);
                }
                resolve(deviceInfo);
            } catch (e) {
                if (isUnlock) {
                    setTimeout(function () {
                        that.uploadUnlockRecord({
                            state: 'Fail',
                            deviceId: scanDeviceName,
                            errCode: e.errCode,
                            errMsg: '' + e.errMsg
                        });
                    }, 10);
                }
                reject(e);
            }
        });
    };


    /**
     * 监听蓝牙的状态
     * @param bleStateCall 连接状态的回调
     */
    bleState = function (bleStateCall) {
        BleSerialPort.addBleStateObserver(bleStateCall);
    }


    /**
     * 关闭连续开门
     * @param scanDeviceId
     * @param bleStateCall 监听蓝牙的连接状态和蓝牙适配器的状态 关闭务必传入，否则会有资源浪费
     */
    closeContinuationUnlock = function ({scanDeviceName, bleStateCall}) {
        Ble.stopScan();
        BleSerialPort.deleteBleStateObserver(bleStateCall);
        if (scanDeviceName) BleSerialPort.closeSerialPort(scanDeviceName);
    };


    /**
     * 上传门锁的开锁记录
     *
     * @param state 状态
     * @param deviceId 开门设备ID
     * @param battery 电量
     * @param occurTime 开锁事件
     * @param errorCode 错误代码
     * @param errMsg 错误信息
     */
    uploadUnlockRecord = function ({state, deviceId, battery, occurTime, errCode, errMsg, mode = "3"}) {
        let dat = {
            results: state,
            deviceId: deviceId,
            occurTime: occurTime ? occurTime : Math.trunc(new Date().getTime() / 1000),
            event: '01',//01代表是开门
            mode: mode + Devices.enToNumber(Devices.getDeviceInfo(deviceId).authType).toString()//高位代表开锁方式3代表蓝牙开锁，低位代表权限 1代表网关
        };
        if (errCode !== undefined) {
            dat.errorCode = errCode;
        }
        if (errMsg) {
            dat.errorMsg = errMsg;
        }
        if (battery) {
            dat.battery = battery;
        }
        Network.post({
            url: '/v2/device/slock/add/record',
            data: dat,
            isSing: true,
            success: function (res) {
                console.log('上传记录成功:', res); //判断如果是一次性钥匙开门成功直接删除
                if (state !== 'Success') return;
                let deviceUserD = Devices.getDeviceInfo(deviceId);

                if (deviceUserD.authType != null && deviceUserD.authType === 'Disposable') {
                    Devices.refurbishDeviceInfo(deviceId);
                }
            },

            fail(err) {
                console.log('上传记录失败', err);
            }
        });
    };


    /**
     * 远程开启指定设备
     * @param deviceId
     * @param appoint 指定开启哪一个设备00代表开启自己也是默认
     * @returns {Promise<unknown>}
     */
    remoteUnlock = async function ({deviceId, appoint = "00"}) {
        return new Promise(async (resolve, reject) => {

            try {
                let date = new Date();
                const utcTimestamp = date.getTime();//utc时间戳
                const localTimestamp = date.getTimezoneOffset() * -60 * 1000 + utcTimestamp;//本地时间戳

                let cmd = new Command();
                // cmd.send = "00";
                cmd.send = "03";//临时改为蓝牙未发送者后面需要改成网关
                cmd.accepter = "0B";
                cmd.cmd = '08';
                cmd.data = appoint;//指定开启那个锁 00默认开启自己
                cmd.data = cmd.data + Math.floor(utcTimestamp / 1000).toString(16).padStart(8, "0");
                cmd.data = cmd.data + Math.floor(localTimestamp / 1000).toString(16).padStart(8, "0");
                let toHex = CommandUtil.commandToHex(cmd);
                let info = await Devices.remoteRelayPenetrateDevice({
                    deviceId: deviceId,
                    command: [toHex]
                });

                let replyCommand = info.data.data.replyCommand;
                let replyCmd = CommandUtil.hexToCommand(replyCommand[0]);

                // console.log("开门结果", JSON.stringify(BleError));
                //  console.log("开门结果", replyCmd);
                let bleError = BleError[replyCmd.stateCode];
                if (replyCmd.stateCode === "00") {
                    let deviceInfo = Devices.getDeviceInfo(deviceId);
                    if (replyCmd.data) {
                        deviceInfo.device.battery = parseInt(replyCmd.data, 16);
                    }
                    resolve(JSON.parse(JSON.stringify(deviceInfo)));
                } else {
                    reject(JSON.parse(JSON.stringify(bleError)));
                }
                // console.log("开门结果", replyCmd);
                that.uploadUnlockRecord({
                    state: replyCmd.stateCode !== "00" ? 'Fail' : "Success",
                    deviceId: deviceId,
                    errCode: parseInt(bleError.errCode, 16),
                    errMsg: '' + bleError.errMsg,
                    mode: "1",
                    battery: parseInt(replyCmd.data, 16)
                });
            } catch (e) {
                console.log(e);
                that.uploadUnlockRecord({
                    state: 'Fail',
                    deviceId: deviceId,
                    errCode: e.errCode,
                    errMsg: '' + e.errMsg,
                    mode: "1"
                });
                reject(e);
            }

        });

    }


}

Unlock.getInstance = function () {
    let unlock;
    if (!unlock) unlock = new Unlock();
    return unlock;
};


export default Unlock.getInstance();