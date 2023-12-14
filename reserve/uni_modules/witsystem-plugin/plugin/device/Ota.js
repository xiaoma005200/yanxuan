/**
 * 空中升级
 */
import Ble from '../ble/Ble';
import Devices from '../model/Devices';
import Util from '../utils/util';
import Crc32 from '../utils/crc32';
import BleSerialPort from './BleSerialPort';
import Network from '../net/network';
import BleError from '../error/BleError';
import Command from "./command/Command";
import CommandUtil from "./command/CommandUtil";

let that;
let failCallback; //失败的回调
let newVar;


class Ota {

    constructor() {
        that = this;

        this.SERVICES = '0000FFF1-0000-1000-8000-00805F9B34FB';

        this.WRITE = '0000FF01-0000-1000-8000-00805F9B34FB'; //写入数据的特征

        this.firmwareUid = null;//新固件的编号
        this.firmwareUrl = null;
        this.newVersion = null; //最新版本的版本号

        this.directionalPush = false; //是否是定向推送

        this.newDeviceModel = null; //最新的设备型号，部分升级增加功能的时候才有

        this.deviceId = null;
        this.isStopSend = false; //是否停止发送数据，在出现错误的时候标记为停止发送数据


    }


    /**
     * 检查版本信息
     */
    checkUpVersion = function (deviceId) {
        return new Promise(async (resolve, reject) => {
            try {
                let deviceInfo = Devices.getDeviceInfo(deviceId);
                let info = await Devices.getDeviceFirmwareInfo(deviceId);
                let data = info.data.data;
                console.log('老版本', deviceInfo);
                console.log('新版本', info);
                let valVersion = deviceInfo.device.version ? parseInt(deviceInfo.device.version.replace(/\./g, ''), 16) : 0;
                let newVersion = parseInt(data.version.replace(/\./g, ''), 16);
                console.log('老版本' + valVersion);
                console.log('新版本' + newVersion);
                this.firmwareUid = data.uid;
                this.firmwareUrl = data.url.split(',');
                this.newVersion = data.version.replace(/\./g, '');
                this.newDeviceModel = data.newDeviceModel;
                this.directionalPush = data.directionalPush ? data.directionalPush : false;
                this.deviceId = deviceId;
                let isActivated = deviceInfo.device.version.indexOf('1') === 0 && data.version.indexOf('0') === 0; //判断是否从待激活版本激活到正式版 版本好1开头代表待激活 0开头代表正式版
                this.firmwareUrl = this.firmwareUrl.sort(function (a, b) { //key进行acsll排序，倒叙,因为多文件升级必须是按从大到小依次发送
                    return parseInt(b.split('.')[0].substring(0, 1), 16) - parseInt(a.split('.')[0].substring(0, 1), 16);
                });
                console.log('固件信息', this.firmwareUrl);
                console.log('固件信息UID', this.firmwareUid);
                resolve({
                    valVersion: deviceInfo.device.version,
                    newVersion: data.version,
                    isNewVersion: valVersion < newVersion,
                    isActivated: isActivated,
                    msg: info.data.data.msg
                });
            } catch (e) {
                reject(e);
            }

        });


    };


    /**
     *  必须先调用checkUpVersion
     * 开始空中升级
     * @param deviceId
     * @param success 升级成功的回调
     * @param fail 升级失败的回调
     * @param progress 升级进度的回调
     */
    start = async function ({deviceId, success, fail, progress}) {
        try {
            //检测设备ID和去服务器检测的id是否相同
            if (deviceId !== this.deviceId || !this.firmwareUrl) {
                if (fail) {//请先用该设备id检查是否有升级信息'   请先调用checkUpVersion检查版本信息，并且确认有可以升级的版本
                    fail(BleError['10116']);
                }
                return;
            }
            failCallback = fail; //下载文件文件信息，可能会有多个


            let downloadList = [];
            this.firmwareUrl.forEach((item) => {
                downloadList.push(Network.syncNet({
                    url: '/v2/device/download/firmware',
                    data: {fileName: item, deviceId: deviceId},
                    responseType: "arraybuffer"
                }));

            });//下载所有固件列表
            let otaFileInfoList = await Promise.all(downloadList);//下载文件的名称，注意只有多个文件的时候才存在
            let mtu = 23;
            let otaFileNumber = otaFileInfoList.length; //获得总文件数
            let cmd = new Command();
            cmd.send = '03';
            cmd.accepter = '03';
            cmd.cmd = '0D';
            for (let y = 0; y < otaFileNumber; y++) {
                //cmd.data = parseInt(that.firmwareUrl[y].substring(0, 2)).toString().padStart(2, "0"); //文件名称的前面两个字符添加为发送参数
                cmd.data = (otaFileNumber - y).toString().padStart(2, "0"); //按文件排序好的顺序发送,犹豫文件排序是从大到小排序，所有发送的参数数长度减y，发送必须从大到小发送
                cmd.check = undefined;
                //文件循环发送
                //第一步发送升级命令并且得到mtu值进行数据分包
                let newVar = await that._syncSendDataAndAccept({
                    scanDeviceName: deviceId,
                    data: CommandUtil.commandToHex(cmd),
                    deviceConnectState: that._connectStateChange
                });
                console.log('发送消息返回的数据', newVar); //判断当发送第一个问的时候进行mtu交互，其他时候不需要


                if (y === 0) {
                    mtu = await Ble.getMtu({deviceId: newVar.deviceId});
                }

                let fileHexData = Ble.ab2hex(otaFileInfoList[y].data); // console.log("发送的完整数据", fileHexData);

                let dataPacket = that._splitDataPacket(fileHexData, mtu - 3); //进行数据拆包

                let dataPacketLength = dataPacket.length;
                console.log('拆包好的数据个数', dataPacketLength);
                this.isStopSend = false; //标记为可以发送数据
                //第二步发送文件数据
                await Util.wait(500);
                for (let i = 0; i < dataPacketLength; i++) {
                    if (this.isStopSend) return; //判断是否停止发送数据
                    // await BleSerialPort.sendSerialPortData({
                    //     scanDeviceName: deviceId,
                    //     scanDeviceId: newVar.scanDeviceId,
                    //     data: i.toString(16).padStart(4, '0') + dataPacket[i],
                    //     //前面是生成两个字节的第几个包的信息
                    //     deviceConnectState: that._connectStateChange
                    // });

                    await Ble.writeValue({
                        deviceId: newVar.deviceId,
                        serviceId: that.SERVICES,
                        characteristicId: that.WRITE,
                        buffer: Ble.hex2ab(i.toString(16).padStart(4, '0') + dataPacket[i]).buffer
                    });

                    console.log('第几帧', i);
                    if (progress) progress(((100 / otaFileNumber) * y + (((i + 1) / dataPacketLength) * 100) / otaFileNumber).toFixed(2)); //延迟发送

                    // #ifdef APP-PLUS
                    //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>APP-PLUS>>>>>>>>>>>>>>>>>>>>>>>22>>")
                    await Util.wait(400);
                    // #endif

                    if (this.isStopSend) return; //判断是否停止发送数据
                } //第三步发送已经完成数据包的指令
                let crc32Hex = Crc32.crc32Hex(fileHexData);
                let crcCmd = new Command();
                crcCmd.send = '03';
                crcCmd.accepter = '03';
                crcCmd.cmd = '0E';
                crcCmd.data = crc32Hex;
                console.log('校验码', crc32Hex);
                await that._syncSendDataAndAccept({
                    scanDeviceName: deviceId,
                    scanDeviceId: newVar.scanDeviceId,
                    data: CommandUtil.commandToHex(crcCmd),
                    deviceConnectState: that._connectStateChange
                });
            }

            Ble.disconnection({deviceId:newVar.scanDeviceId});
            console.log('蓝牙数据发送完成调用断开');
            //console.log('校验码', this.firmwareUid);
            //第4步更新服务器上设备的版本信息并且返回提示成功
            if (this.newDeviceModel) {
                //判断是否需要更新新的设备型号
                await that.upgradeSuccess({
                    deviceId: deviceId,
                    newVersion: this.newVersion,
                    newModel: this.newDeviceModel,
                    envVersion: 'Release',
                    firmwareUid: this.firmwareUid
                });
            } else {
                await that.upgradeSuccess({
                    deviceId: deviceId,
                    newVersion: this.newVersion,
                    envVersion: "Release",
                    firmwareUid: this.firmwareUid
                });
            }

            await Devices.refurbishDeviceInfo(deviceId); //重新获取该设备的信息

            if (success)
                success({
                    msg: 'success',
                    version: this.newVersion,
                    deviceId: deviceId
                });
        } catch (e) {
            console.log(e);
            this.isStopSend = true;
            if (fail) fail(e);
        }
    };

    /**(内部)
     * 监听连接状态的变化
     */
    _connectStateChange(state) {
        if (state.type === 'adapter') {
            if (failCallback)
                failCallback(BleError['10104']);//蓝牙关闭升级失败
        } else if (!state.connected) {
            that.isStopSend = true;
            if (failCallback)
                failCallback(BleError['10006']); //连接断开升级失败

        }
    }

    /**
     * 拆分数据(内部)
     * @param hex 拆分的16进制字符串
     * @param packetSize 每一包的字符串个数
     */
    _splitDataPacket = function (hex, packetSize) {
        let length = hex.length;
        let byteLength = packetSize * 2; //乘以2是因为两个16进制字符为一个字节，拆分的数据安字节大小
        let number = Math.ceil(length / byteLength);
        let array = [];
        for (let i = 0; i < number; i++) {
            array.push(hex.slice(i * byteLength, (i + 1) * byteLength));
        }
        return array;
    };


    /**(内部)
     * 返送数据并且必须有数据回复
     * 并且判断回复的结果正确性
     */
    _syncSendDataAndAccept({scanDeviceName, data, deviceConnectState}) {
        return new Promise(async (resolve, reject) => {
            try {
                newVar = await BleSerialPort.sendSerialPortData({
                    scanDeviceName: scanDeviceName,
                    data: data,
                    deviceConnectState: deviceConnectState,
                    acceptData: function (res) {
                        let command = CommandUtil.hexToCommand(res);
                        if (command.stateCode !== '00') {
                            reject(BleError[command.stateCode]);
                            return;
                        } //关闭无应答定时器
                        clearTimeout(timeout); //添加延时是因为发送还没有确认就已经接受到返回消息
                        setTimeout(function () {
                            resolve(newVar);
                        }, 150);
                    }
                });
                let timeout = setTimeout(function () {
                    reject(BleError['0F']);
                }, 1500);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 停止升级，停止升级蓝牙将会断开
     */
    stop() {
        this.isStopSend = true;
        if (newVar) BleSerialPort.closeSerialPort(newVar.scanDeviceId);
    }

    /**
     * 提交升级成功的网络请求
     */
    async upgradeSuccess({deviceId, newVersion, newModel, envVersion, firmwareUid}) {
        let data = {deviceId: deviceId, newVersion: newVersion, envVersion: envVersion, firmwareUid: firmwareUid};
        if (newModel) {
            data.newModel = newModel;
        }
        return await Network.syncNet({url: '/v2/device/update/firmware/version', data: data});
    }


    /**
     * 发送远程ota指令 必须是能连网的设备
     *
     */
    async remoteOta(deviceId) {
        let envVersion = "Release";
        return await Network.syncNet({
            url: '/v2/device/remote/ota',
            data: {deviceId: deviceId, envVersion: envVersion}
        }); // return await Network.sysncNet('/device/connect_network_ota', {deviceId: deviceId});
    }
}

Ota.getInstance = function () {
    let ota;
    if (!ota) ota = new Ota();
    return ota;
};


export default Ota.getInstance();
