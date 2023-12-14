/**
 * 客户端需要和设备、服务器同时交互的方法
 * 通过蓝牙和设备交互的方法,只有可以和蓝牙交互的设备才有
 */
import Devices from '../../model/Devices';
import BleSerialPort from '../BleSerialPort';
import Command from '../command/Command';
import CommandUtil from '../command/CommandUtil';
import BleError from '../../error/BleError';
import Ble from "../../ble/Ble";
import BleErrMsg from "../../error/BleError";
import Util from "../../utils/util";
import AESUtil from "../../utils/AESUtil";
import Network from "../../net/network";

let that;

let clients = {
    app: "00",//app等手机端
    relay: "01",//网关
    telecontroller: "02",//遥控器
    ble: "03",//门锁蓝牙
    wifi: "04",//wifi
    other: "05",//其他模组
    keyboard: "06",//键盘
    card: "07",//卡
    mark: "08",//指纹
    face: "09",//人脸
    dataManage: "20",//数据管理
    log: "22",//记录
}

class BleDevice {


    constructor() {
        that = this;
    }

    /**
     * 设备添加信息
     * @param deviceId 设备ID
     * @param accepter 接受者 如06代表键盘，代表添加密码
     * @param authType 权限类型
     * @param startDate 有效期起始时间戳，需要的才传入
     * @param endDate 有效期到期时间戳， 需要的才传入
     * @param repeat 重复类型 循环类型1字节，分8位(只有周期密码使用该参数；参数不存在用FF代替）
     * @param data //添加的数据
     * @param type 信息的类型，比如密码，指纹等等
     * @param name 添加信息备注 可以不传入。默认为信息编号
     * @param timeout  指令超时时间，可以为空默认1500毫秒
     */
    _deviceAddInfo({deviceId, accepter, authType, startDate, endDate, repeat = "FF", data, type, name, timeout}) {
        return new Promise(async (resolve, reject) => {
            try {
                if(!data){
                    data="";
                }

                let cacheData = data;
                if (type === 'Password') {//判断如果是密码不足10位末尾补f
                    data = data.padEnd(12, 'F');
                }

                if ((startDate && endDate)) {//判断是否有时间如果有时间 把时间转换为16进制
                    data = (startDate.toString(16).padStart(8, "0")) + (endDate.toString(16).padStart(8, "0")) + repeat + data;
                } else {
                    data = "FFFFFFFFFFFFFFFF" + repeat + data;
                }

                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = accepter;
                cmd.cmd = '01';
                cmd.data = CommandUtil.authTypeToAuthHex(authType) + data;
                console.log("生成的指令对象",cmd);
                let toHex = CommandUtil.commandToHex(cmd);
                let command = await that._syncSend({deviceId: deviceId, hexData: toHex, timeout: timeout});
                let addData = {
                    deviceId: deviceId,
                    authType: authType,
                    type: type,
                    data: cacheData,
                    name: name ? name : command.data,
                    uid: command.data,
                    freeze: false
                }
                if (startDate && endDate) {
                    addData.startDate = startDate;
                    addData.endDate = endDate;
                }
                await Devices.addSlockDeviceInfo(addData).catch(async (err) => {
                    console.log(err);
                    that.cancelCmd(deviceId, accepter);//如果失败取消添加
                    reject(err);
                });
                await that._affirmCmd(deviceId, accepter);
                resolve(JSON.parse(JSON.stringify(BleError[command.stateCode])));
            } catch (e) {
                console.log(e)
                reject(e);
            }
        });
    }


    /**
     * 设备远程添加信息
     * @param deviceId 设备ID
     * @param accepter 接受者 如06代表键盘，代表添加密码
     * @param authType 权限类型
     * @param startDate 有效期起始时间戳，需要的才传入
     * @param endDate 有效期到期时间戳， 需要的才传入
     * @param repeat 重复类型
     * @param data //添加的数据
     * @param type 信息的类型，比如密码，指纹等等
     * @param name 添加信息备注 可以不传入。默认为信息编号
     * @param timeout  指令超时时间，可以为空默认1500毫秒
     */
    _remoteDeviceAddInfo({deviceId, accepter, authType, startDate, endDate, repeat = "FF", data, type, name, timeout}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!data) {
                    data = '';
                }
                let cacheData = data;
                if (type === 'Password') {//判断如果是密码不足10位末尾补f
                    data = data.padEnd(10, 'F');
                }

                if ((startDate && endDate)) {//判断是否有时间如果有时间 把时间转换为16进制
                    data = (startDate.toString(16).padStart(8, "0")) + (endDate.toString(16).padStart(8, "0")) + repeat + data;
                } else {
                    data = "FFFFFFFFFFFFFFFF" + repeat + data;
                }


                //创建添加密码指令
                let cmd = new Command();
                cmd.send = clients.relay;
                cmd.accepter = accepter;
                cmd.cmd = '01';
                cmd.data = CommandUtil.authTypeToAuthHex(authType) + data;
                let pwdCommand = CommandUtil.commandToHex(cmd);

                //创建添加密码确认指令
                let affirmCommand = new Command();
                affirmCommand.send = clients.relay;
                affirmCommand.accepter = accepter;
                affirmCommand.cmd = '02';
                let toHex = CommandUtil.commandToHex(affirmCommand);
                let array = [pwdCommand, toHex];


                //发送指令
                let replyArray = await that._remoteSend({
                    deviceId: deviceId,
                    hexArray: array
                });
                //处理返回结果
                if (replyArray[0].stateCode !== "00") {
                    reject(JSON.parse(JSON.stringify(BleError[replyArray[0].stateCode])));
                    return;
                }
                let addData = {
                    deviceId: deviceId,
                    authType: authType,
                    type: type,
                    data: cacheData,
                    name: name ? name : replyArray[0].data,
                    uid: replyArray[0].data,
                    freeze: false
                }
                if (startDate && endDate) {
                    addData.startDate = startDate;
                    addData.endDate = endDate;
                }
                await Devices.addSlockDeviceInfo(addData).catch(async (err) => {
                    console.log(err);
                    await that._remoteDeviceDeleteInfo({
                        deviceId: deviceId,
                        accepter: accepter,
                        uid: replyArray[0].cmd,
                        type: type
                    });//如果失败删除之前添加的信息
                    reject(err);
                });
                resolve(JSON.parse(JSON.stringify(BleError[replyArray[0].stateCode])));
            } catch (e) {
                console.log(e)
                reject(e);
            }
        });
    }


    /**
     * 设备删除信息
     * @param deviceId 设备ID
     * @param accepter 接受者 如06代表键盘，代表添加密码
     * @param uid 删除信息ID
     * @param type 删除信息的类型，比如密码，指纹等等
     */
    _deviceDeleteInfo({deviceId, accepter, uid, type}) {
        return new Promise(async (resolve, reject) => {
            try {
                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = accepter;
                cmd.cmd = '06';
                cmd.data = uid.toString();
                let toHex = CommandUtil.commandToHex(cmd);
                let command = await that._syncSend({deviceId: deviceId, hexData: toHex,timeout:5000});
                await Devices.deleteSlockDeviceInfo(deviceId, uid, type);
                resolve(JSON.parse(JSON.stringify(BleError[command.stateCode])));
            } catch (e) {
                reject(e);
            }
        });
    }


    /**
     * 设备远程删除信息
     * @param deviceId 设备ID
     * @param accepter 接受者 如06代表键盘，代表添加密码
     * @param uid 删除信息ID
     * @param type 删除信息的类型，比如密码，指纹等等
     */
    _remoteDeviceDeleteInfo({deviceId, accepter, uid, type}) {
        return new Promise(async (resolve, reject) => {
            try {
                let cmd = new Command();
                cmd.send = clients.relay;
                cmd.accepter = accepter;
                cmd.cmd = '06';
                cmd.data = uid.toString();
                let toHex = CommandUtil.commandToHex(cmd);
                let replyArray = await that._remoteSend({
                    deviceId: deviceId,
                    hexArray: [toHex]
                });
                //处理返回结果
                if (replyArray[0].stateCode !== "00") {
                    reject(JSON.parse(JSON.stringify(BleError[replyArray[0].stateCode])));
                    return;
                }
                await Devices.deleteSlockDeviceInfo(deviceId, uid, type);
                resolve(JSON.parse(JSON.stringify(BleError[replyArray[0].stateCode])));
            } catch (e) {
                reject(e);
            }
        });
    }


    /**
     * 设备信息冻结或者解冻
     * @param deviceId 设备ID
     * @param accepter 接受者 如06代表键盘，代表添加密码
     * @param isFreeze 是否冻结
     * @param uid 信息ID
     * @param type 信息的类型，比如密码，指纹等等
     */
    _freeze({deviceId, accepter, isFreeze, uid, type}) {
        return new Promise(async (resolve, reject) => {
            try {
                await Devices.updateSlockDeviceInfo(deviceId, uid, type, isFreeze);//更新冻结信息
            } catch (e) {
                reject(e);
                return;
            }
            try {
                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = accepter;
                cmd.cmd = isFreeze ? '04' : '05';
                cmd.data = uid.toString();
                let toHex = CommandUtil.commandToHex(cmd);
                let command = await that._syncSend({deviceId: deviceId, hexData: toHex});
                await Devices.updateSlockDeviceInfo(deviceId, uid, type, isFreeze);
                resolve(JSON.parse(JSON.stringify(BleError[command.stateCode])));
            } catch (e) {
                await Devices.updateSlockDeviceInfo(deviceId, uid, type, !isFreeze);//更新冻结信息
                reject(e);
            }
        });
    }


    /**
     * 设备信息冻结或者解冻
     * @param deviceId 设备ID
     * @param accepter 接受者 如06代表键盘，代表添加密码
     * @param isFreeze 是否冻结
     * @param uid 信息ID
     * @param type 信息的类型，比如密码，指纹等等
     */
    _remoteFreeze({deviceId, accepter, isFreeze, uid, type}) {
        return new Promise(async (resolve, reject) => {
            try {
                await Devices.updateSlockDeviceInfo(deviceId, uid, type, isFreeze);//更新冻结信息
            } catch (e) {
                reject(e);
                return;
            }
            try {
                let cmd = new Command();
                cmd.send = clients.relay;
                cmd.accepter = accepter;
                cmd.cmd = isFreeze ? '04' : '05';
                cmd.data = uid.toString();
                let toHex = CommandUtil.commandToHex(cmd);
                let replyArray = await that._remoteSend({
                    deviceId: deviceId,
                    hexArray: [toHex]
                });
                console.log("冻结返回的信息", replyArray[0].stateCode);
                //处理返回结果
                if (replyArray[0].stateCode !== "00") {
                    reject(JSON.parse(JSON.stringify(BleError[replyArray[0].stateCode])));
                    return;
                }
                resolve(JSON.parse(JSON.stringify(BleError[replyArray[0].stateCode])));
            } catch (e) {
                await Devices.updateSlockDeviceInfo(deviceId, uid, type, !isFreeze);//更新冻结信息
                reject(e);
            }
        });
    }


    /**
     * 取消指定的指令
     * @param deviceId
     * @param accepter 接收者
     */
    async cancelCmd(deviceId, accepter) {
        console.log("调用取消指令", deviceId)
        console.log("调用取消指令", await Ble.isDeviceConnectAndDevice(deviceId))
        if (await Ble.isDeviceConnectAndDevice(deviceId)) {
            let cmd = new Command();
            cmd.send = clients.ble;
            cmd.accepter = accepter;
            cmd.cmd = '03';
            let toHex = CommandUtil.commandToHex(cmd);
            return await that._syncSend({deviceId: deviceId, hexData: toHex});
        }
    }


    /**
     * 确认指定的指令
     * @param deviceId
     * @param accepter 接收者
     */
    async _affirmCmd(deviceId, accepter) {
        let cmd = new Command();
        cmd.send = clients.ble;
        cmd.accepter = accepter;
        cmd.cmd = '02';
        let toHex = CommandUtil.commandToHex(cmd);
        return await that._syncSend({deviceId: deviceId, hexData: toHex});
    }


    /**
     * 添加密码
     * @param deviceId 设备ID
     * @param authType 权限类型
     * @param startDate 有效期起始时间戳，不是管理员密码的时候需要
     * @param endDate 有效期到期时间戳，不是管理员密码需要
     * @param repeat 重复类型 循环类型1字节，分8位(只有周期密码使用该参数；参数不存在用FF代替）
     * @param password 密码6到12 个字符
     * @param name 密码备注，没有就是默认uid
     */
    addPwd({deviceId, authType, startDate, endDate, repeat = "FF", password, name}) {
        return new Promise(async (resolve, reject) => {
            try {
                let info = await that._deviceAddInfo({
                    deviceId: deviceId,
                    accepter: clients.keyboard,
                    authType: authType.toString(),
                    startDate: startDate,
                    endDate: endDate,
                    repeat: repeat,
                    data: password,
                    type: "Password",
                    name: name
                });
                console.log(info)
                resolve(JSON.parse(JSON.stringify(BleError["00"])));
            } catch (e) {
                console.log(e)
                reject(e);
            }

        })
    }

    /**
     * 删除密码
     * @param deviceId 设备ID
     * @param uid 密码编号
     */
    deletePwd({deviceId, uid}) {
        return new Promise(async (resolve, reject) => {
            try {
                await that._deviceDeleteInfo({
                    deviceId: deviceId,
                    accepter: clients.keyboard,
                    uid: uid,
                    type: 'Password'
                });
                resolve(JSON.parse(JSON.stringify(BleError["00"])));
            } catch (e) {
                reject(e);
            }

        })

    }


    /**
     * 冻结/解冻 密码
     * isFreeze true代表冻结 false 解冻
     * @param deviceId
     * @param uid
     * @param isFreeze
     */
    freezePwdId({deviceId, uid, isFreeze}) {
        return that._freeze({
            deviceId: deviceId,
            accepter: clients.keyboard,
            isFreeze: isFreeze,
            uid: uid,
            type: "Password"
        })

    }


    /**
     * 远程添加密码
     */
    remoteAddPwd({deviceId, authType, startDate, endDate, repeat = "FF", password, name}) {
        return new Promise(async (resolve, reject) => {
            try {
                let info = await that._remoteDeviceAddInfo({
                    deviceId: deviceId,
                    accepter: clients.keyboard,
                    authType: authType.toString(),
                    startDate: startDate,
                    endDate: endDate,
                    repeat: repeat,
                    data: password,
                    type: "Password",
                    name: name
                });
                console.log("远程添加密码返回信息", info)
                resolve(JSON.parse(JSON.stringify(BleError["00"])));
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })

    }


    /**
     * 远程删除密码
     * @param deviceId 设备ID
     * @param uid 密码编号
     */
    remoteDeletePwd({deviceId, uid}) {
        return new Promise(async (resolve, reject) => {
            try {
                await that._remoteDeviceDeleteInfo({
                    deviceId: deviceId,
                    accepter: clients.keyboard,
                    uid: uid,
                    type: 'Password'
                });
                resolve(JSON.parse(JSON.stringify(BleError["00"])));
            } catch (e) {
                reject(e);
            }
        })
    }


    /**
     * 冻结/解冻 密码
     * isFreeze true代表冻结 false 解冻
     * @param deviceId
     * @param uid
     * @param isFreeze
     */
    remoteFreezePwdId({deviceId, uid, isFreeze}) {
        return that._remoteFreeze({
            deviceId: deviceId,
            accepter: clients.keyboard,
            isFreeze: isFreeze,
            uid: uid,
            type: "Password"
        })
    }


    /**
     * 新的添加卡
     * @param deviceId 设备ID
     * @param authType 权限类型
     * @param startDate 起始时间戳
     * @param endDate 到期时间戳
     * @param repeat 重复信息
     * @param name 卡的名称
     * @returns {Promise<*>}
     */
    addCard({deviceId, authType, startDate, endDate, repeat = "FF", name}) {
        return new Promise(async (resolve, reject) => {
            try {
                await that._deviceAddInfo({
                    deviceId: deviceId,
                    accepter: clients.card,
                    authType: authType,
                    startDate: startDate,
                    endDate: endDate,
                    repeat: repeat,
                    data: null,
                    type: "Card",
                    name: name,
                    timeout: 15000
                });
                resolve(JSON.parse(JSON.stringify(BleError["00"])));
            } catch (e) {
                console.log(e)
                reject(e);
            }

        });
    }


    /**
     * 取消添加卡
     */
    cancelAddCard(deviceId) {
        return this.cancelCmd(deviceId, clients.card);
    }

    /**
     * 删除卡
     * @param deviceId
     * @param uid
     */
    async deleteCardId({deviceId, uid}) {
        return await that._deviceDeleteInfo({
            deviceId: deviceId,
            accepter: clients.card,
            uid: uid,
            type: 'Card'
        });
    } //开启或者关闭刷卡功能 state true代表开启


    /**
     * 冻结/解冻 卡
     * isFreeze true代表冻结 false 解冻
     * @param deviceId 设备ID
     * @param uid 卡的编号
     * @param isFreeze  true代表冻结 false 解冻
     */
    async freezeCardId({deviceId, uid, isFreeze}) {
        return that._freeze({
            deviceId: deviceId,
            accepter: clients.card,
            isFreeze: isFreeze,
            uid: uid,
            type: "Card"
        })

    }


    /**
     * 远程删除卡
     * @param deviceId 设备ID
     * @param uid 密码编号
     */
    async remoteDeleteCardId({deviceId, uid}) {
        return await that._remoteDeviceDeleteInfo({
            deviceId: deviceId,
            accepter: clients.card,
            uid: uid,
            type: 'Card'
        });
    }


    /**
     * 远程冻结/解冻 卡
     * isFreeze true代表冻结 false 解冻
     * @param deviceId 设备ID
     * @param uid 卡的编号
     * @param isFreeze  true代表冻结 false 解冻
     */
    async remoteFreezeCardId({deviceId, uid, isFreeze}) {
        return that._remoteFreeze({
            deviceId: deviceId,
            accepter: clients.card,
            isFreeze: isFreeze,
            uid: uid,
            type: "Card"
        })

    }


    /**
     * 添加指纹
     * @param deviceId 设备ID
     * @param name 指纹名称,可以不传入，不传入默认就是密码编号
     * @param authType 指纹类型 01管理员指纹，02用户指纹
     * @param startDate 有效期的开始时间段，需要的时候传入
     * @param endDate 有效期到期时段，需要时传入
     * @param sendEnd 指令发送完成回调函数
     * @param repeat 重复信息
     * @param progress 添加指纹进度回调的函数
     */

    addMark({deviceId, name, authType, startDate, endDate, repeat = "FF", sendEnd, progress}) {
        return new Promise(async (resolve, reject) => {
            try {
                let data = "";
                if ((startDate && endDate)) {
                    data = (startDate.toString(16).padStart(8, "0")) + (endDate.toString(16).padStart(8, "0")) + repeat;
                } else {
                    data = "FFFFFFFFFFFFFFFF" + repeat;
                }

                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = clients.mark;
                cmd.cmd = '01';
                cmd.data = CommandUtil.authTypeToAuthHex(authType) + data;
                let toHex = CommandUtil.commandToHex(cmd);
                await BleSerialPort.sendSerialPortData({
                    scanDeviceName: deviceId,
                    data: toHex,
                    async acceptData(hex) {
                        console.log("指纹收到的消息", hex);
                        try {
                            let command = CommandUtil.hexToCommand(hex);
                            console.log("指纹收到的消息", JSON.stringify(command));
                            if (command.stateCode !== '00') {
                                reject(JSON.parse(JSON.stringify(BleError[command.stateCode])));
                                return;
                            }
                            let index = 0;
                            //当前是第几个指纹
                            let current = parseInt(command.data.substring(index, index += 2), 16);
                            //总共需要录入几次
                            let total = parseInt(command.data.substring(index, index += 2), 16);

                            if (progress) {
                                progress(current, total);
                            }
                            if (current !== total) {
                                return;
                            }

                            let addData = {
                                deviceId: deviceId,
                                authType: authType,
                                type: "Mark",
                                data: data,
                                name: name ? name : command.data.substring(4),
                                uid: command.data.substring(4),
                                freeze: false
                            }

                            if ((startDate && endDate)) {
                                addData.startDate = startDate;
                                addData.endDate = endDate;
                            }

                            await Devices.addSlockDeviceInfo(addData).catch(async (err) => {
                                that.cancelCmd(deviceId, clients.mark);
                                reject(err);
                            });
                            await that._affirmCmd(deviceId, clients.mark);
                            resolve(JSON.parse(JSON.stringify(BleError["00"])));
                        } catch (e) {
                            console.log(e);
                            that.cancelAddMark(deviceId);
                            reject(e);
                        }
                    },
                    deviceConnectState(state) {
                        if ((state.type === 'connect' && !state.connected) || !state.available) {
                            resolve(JSON.parse(JSON.stringify(BleError["10006"])));
                        }
                    }
                });
                if (sendEnd) sendEnd(); //接收到消息代表发送成功
            } catch (e) {
                console.log(e)
                that.cancelAddMark(deviceId);
                reject(e);
            }
        });
    }

    /**
     * 取消添加指纹
     */
    cancelAddMark(deviceId) {
        return this.cancelCmd(deviceId, clients.mark);
    }


    /**
     * 删除指纹
     * @param deviceId
     * @param uid
     */
    async deleteMarkId({deviceId, uid}) {
        return await that._deviceDeleteInfo({
            deviceId: deviceId,
            accepter: clients.mark,
            uid: uid,
            type: 'Mark'
        });
    }


    /**
     *  冻结/解冻 指纹
     * @param deviceId 设备ID
     * @param uid 指纹ID
     * @param isFreeze isFreeze true代表冻结 false 解冻
     */
    async freezeMarkId({deviceId, uid, isFreeze}) {
        return that._freeze({
            deviceId: deviceId,
            accepter: clients.mark,
            isFreeze: isFreeze,
            uid: uid,
            type: "Mark"
        })


    }


    /**
     * 远程删除指纹
     * @param deviceId
     * @param uid
     */
    async remoteDeleteMarkId({deviceId, uid}) {
        return await that._remoteDeviceDeleteInfo({
            deviceId: deviceId,
            accepter: clients.mark,
            uid: uid,
            type: 'Mark'
        });
    }

    /**
     *  远程冻结/解冻 指纹
     * @param deviceId 设备ID
     * @param uid 指纹ID
     * @param isFreeze isFreeze true代表冻结 false 解冻
     */
    async remoteFreezeMarkId({deviceId, uid, isFreeze}) {
        return that._remoteFreeze({
            deviceId: deviceId,
            accepter: clients.mark,
            isFreeze: isFreeze,
            uid: uid,
            type: "Mark"
        })


    }


    /**
     * type 01管理员 02普通用户 还没有更新成最新版本
     * @param deviceId
     * @param name 人脸名称
     * @param authType  指纹类型 01管理员人脸，02用户人脸
     * @param startDate  有效期的开始时间
     * @param endDate  有效期的结束时间
     * @param repeat  重复信息
     * @param sendEnd  请求添加人脸完成，正在添加
     * @param progress  添加人脸进度
     */
    addFace({deviceId, name, authType, startDate, endDate, repeat = "FF", sendEnd, progress}) {
        return new Promise(async (resolve, reject) => {
            try {

                let data = "";
                if ((startDate && endDate)) {
                    data = (startDate.toString(16).padStart(8, "0")) + (endDate.toString(16).padStart(8, "0")) + repeat;
                } else {
                    data = "FFFFFFFFFFFFFFFF" + repeat;
                }

                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = clients.face;
                cmd.cmd = '01';
                cmd.data = CommandUtil.authTypeToAuthHex(authType) + data;
                let toHex = CommandUtil.commandToHex(cmd);
                await BleSerialPort.sendSerialPortData({
                    scanDeviceName: deviceId,
                    data: toHex,
                    async acceptData(hex) {
                        console.log("人脸收到的消息", hex);
                        try {
                            let command = CommandUtil.hexToCommand(hex);
                            console.log("人脸收到的消息", JSON.stringify(command));
                            if (command.stateCode !== '00') {
                                reject(JSON.parse(JSON.stringify(BleError[command.stateCode])));
                                return;
                            }
                            let index = 0;
                            //当前是第几个人脸
                            let current = parseInt(command.data.substring(index, index += 2), 16);
                            //总共需要录入几个人脸
                            let total = parseInt(command.data.substring(index, index += 2), 16);

                            if (progress) {
                                progress(current, total);
                            }
                            if (current !== total) {
                                return;
                            }

                            let addData = {
                                deviceId: deviceId,
                                authType: authType,
                                type: "Face",
                                data: data,
                                name: name ? name : command.data.substring(6),
                                uid: command.data.substring(6),
                                freeze: false
                            }

                            if ((startDate && endDate)) {
                                addData.startDate = startDate;
                                addData.endDate = endDate;
                            }

                            await Devices.addSlockDeviceInfo(addData).catch(async (err) => {
                                that.cancelCmd(deviceId, clients.face);
                                reject(err);
                            });
                            await that._affirmCmd(deviceId, clients.face);
                            resolve(JSON.parse(JSON.stringify(BleError["00"])));
                        } catch (e) {
                            console.log(e);
                            that.cancelAddFace(deviceId);
                            reject(e);
                        }
                    },
                    deviceConnectState(state) {
                        if ((state.type === 'connect' && !state.connected) || !state.available) {
                            resolve(JSON.parse(JSON.stringify(BleError["10006"])));
                        }
                    }
                });
                if (sendEnd) sendEnd(); //接收到消息代表发送成功
            } catch (e) {
                console.log(e)
                that.cancelAddFace(deviceId);
                reject(e);
            }
        });
    }


    /**
     * 取消添加人脸
     */
    cancelAddFace(deviceId) {
        return this.cancelCmd(deviceId, clients.face);
    }

    /**
     * 删除人脸
     * @param deviceId 设备ID
     * @param uid 人脸ID
     */
    async deleteFaceId({deviceId, uid}) {
        return await that._deviceDeleteInfo({
            deviceId: deviceId,
            accepter: clients.face,
            uid: uid,
            type: 'Face'
        });
    }

    /**
     * 冻结人脸
     * @param deviceId 设备ID
     * @param uid 人脸ID
     * @param isFreeze  true代表冻结 false 解冻
     */
    freezeFaceId({deviceId, uid, isFreeze}) {
        return that._freeze({
            deviceId: deviceId,
            accepter: clients.face,
            isFreeze: isFreeze,
            uid: uid,
            type: "Face"
        })

    }


    /**
     * 远程删除人脸
     * @param deviceId 设备ID
     * @param uid 人脸ID
     */
    async remoteDeleteFaceId({deviceId, uid}) {
        return await that._remoteDeviceDeleteInfo({
            deviceId: deviceId,
            accepter: clients.face,
            uid: uid,
            type: 'Face'
        });
    }


    /**
     *  远程冻结/解冻 人脸
     * @param deviceId 设备ID
     * @param uid 人脸ID
     * @param isFreeze isFreeze true代表冻结 false 解冻
     */
    async remoteFreezeFaceId({deviceId, uid, isFreeze}) {
        return that._remoteFreeze({
            deviceId: deviceId,
            accepter: clients.face,
            isFreeze: isFreeze,
            uid: uid,
            type: "Face"
        })


    }


    /**
     * 读取日志
     */
    readLog({deviceId}) {
        return new Promise(async (resolve, reject) => {
            try {
                // #ifdef H5
                reject(JSON.parse(JSON.stringify(BleError['10115'])));
                return;
                // #endif
                if (!await Ble.isDeviceConnect(deviceId)) {
                    reject(JSON.parse(JSON.stringify(BleError['10115'])));
                    return;
                }
                let mtu = await Ble.getMtu(deviceId);
                let number = Math.floor((mtu - 10) / 8).toString(16);
                if (number.length < 2) {
                    number = "0" + number;
                }
                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = clients.log;
                cmd.cmd = '0C';
                cmd.data = number;
                let toHex = CommandUtil.commandToHex(cmd);
                while (true) {
                    let command = await that._syncSend({deviceId: deviceId, hexData: toHex, timeout: 3000});
                    let logList = CommandUtil.analyzeLogInfo(command);
                    if (logList.list.length !== 0) {
                        Devices.uploadRecord({deviceId: deviceId, list: logList.list});
                    }
                    if (logList.surplus === '0000') {
                        break;
                    }
                }
                resolve(JSON.parse(JSON.stringify(BleError['00'])));
            } catch (e) {
                console.log(e)
                reject(e);
            }


        })


    }


    /**
     * 读取门锁当前的状态
     * @param deviceId 设备ID
     * @param isConnect 是否必须已经连接才读取 默认必须连接成功读取默认true
     */
    readDeviceState({deviceId, isConnect = true}) {
        return new Promise(async (resolve, reject) => {
            try {

                // #ifdef H5
                reject(JSON.parse(JSON.stringify(BleError['10115'])));
                return;
                // #endif
                if (!await Ble.isDeviceConnect(deviceId)) {
                    reject(JSON.parse(JSON.stringify(BleError['10115'])));
                    return;
                }


                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = clients.dataManage;
                cmd.cmd = '0A';
                let toHex = CommandUtil.commandToHex(cmd);
                let command = await that._syncSend({deviceId: deviceId, hexData: toHex});
                let stateInfo = CommandUtil.analyzeDeviceStateCode(command.data);
                console.log("获得的状态信息", stateInfo)
                await Devices.updateDevicesInfo({
                    deviceId: deviceId,
                    statusCode: command.data,
                    volume: stateInfo.volume
                });
                Devices.refurbishDeviceInfo(deviceId);
                resolve(stateInfo);
            } catch (e) {
                console.log(e)
                reject(e);
            }


        })
    }


    /**
     * 该方法只是内部统一函数
     * 修改门锁状态信息
     * @param 修改状态的hex值
     */
    writeDeviceState({deviceId, hex}) {
        return new Promise(async (resolve, reject) => {
            try {
                // #ifdef H5
                reject(JSON.parse(JSON.stringify(BleError['10115'])));
                return;
                // #endif
                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = clients.dataManage;
                cmd.cmd = '0B';
                cmd.data = hex;
                let toHex = CommandUtil.commandToHex(cmd);
                await that._syncSend({deviceId: deviceId, hexData: toHex});
                let state = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                resolve(state);
            } catch (e) {
                console.log(e)
                reject(e);
            }


        })

    }

    /**
     * 修改门锁模式
     * 0 ->"正常模式", 1->"勿扰模式", 2->"常开模式", 3->"安全模式", 4->"体验模式",//锁的对应模式
     * @param deviceId 设备ID
     * @param model 对应的模式数字
     */
    async updateLockModel({deviceId, model}) {
        return new Promise(async (resolve, reject) => {
            try {
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                stateInfo.lockMode = model;
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })
    }


    /**
     * 修改门锁语言
     * 0 ->"中文", 1->"English",//锁的对应语言
     * @param deviceId 设备ID
     * @param language 对应的模式数字
     *
     */
    async updateLanguage({deviceId, language}) {
        return new Promise(async (resolve, reject) => {
            try {
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                stateInfo.language = language;
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })
    }


    /**
     * 门锁试错锁定是否开启
     * @param deviceId 设备ID
     * @param state true 或者false
     */
    async updateLock({deviceId, state}) {
        return new Promise(async (resolve, reject) => {
            try {
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                stateInfo.lock = state;
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })
    }


    /**
     * 防撬报警是否开启
     * @param deviceId 设备ID
     * @param state true 或者false
     */
    async updateBrakeAlarm({deviceId, state}) {
        return new Promise(async (resolve, reject) => {
            try {
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                console.log("读回来的的设备信息", stateInfo);
                stateInfo.brakeAlarm = state;
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log("异常", e)
                reject(e);
            }
        })
    }


    /**
     * 修改音量
     * @param deviceId 设备ID
     * @param volume 0到8
     */
    async updateVolume({deviceId, volume}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (volume > 8) volume = 8;
                if (volume < 0) volume = 0;
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                stateInfo.volume = volume;
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })
    }


    /**
     * 电机转动时间
     * @param deviceId 设备ID
     * @param time 单位毫秒 最大7650 最小30
     */
    async updateMotorTime({deviceId, time}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (time > 7650) time = 7650;
                if (time < 30) time = 30;
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                stateInfo.motorTime = time;
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })
    }


    /**
     * 自动闭锁时间
     * @param deviceId 设备ID
     * @param time 单位毫秒 最大25500 最小100
     */
    async updateAutoCloseLockTime({deviceId, time}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (time > 25500) time = 25500;
                if (time < 100) time = 100;
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                stateInfo.autoCloseLockTime = time;
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })
    }


    /**
     * 电机正反转
     * @param deviceId 设备ID
     * @param state true 右开门 false 左开门
     */
    async motorReversed({deviceId, state}) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log("开门方向", state)
                //先读取当前状态
                let stateInfo = await that.readDeviceState({deviceId: deviceId, isConnect: false});
                stateInfo.obligate1 = CommandUtil.convertHexToBinary(stateInfo.obligate1, 0, state ? "1" : "0");
                let hex = CommandUtil.deviceStateCodeToHex(stateInfo);
                let promise = that.writeDeviceState({deviceId: deviceId, hex: hex});
                resolve(promise);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        })
    }


    /**
     * 同步时间
     */
    async syncTime({deviceId}) {
        return new Promise(async (resolve, reject) => {
            try {
                let date = new Date();
                const utcTimestamp = date.getTime();//utc时间戳
                const localTimestamp = date.getTimezoneOffset() * -60 * 1000 + utcTimestamp;//本地时间戳
                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = clients.dataManage;
                cmd.cmd = '09';
                cmd.data = cmd.data + Math.floor(utcTimestamp / 1000).toString(16).padStart(8, "0");
                cmd.data = cmd.data + Math.floor(localTimestamp / 1000).toString(16).padStart(8, "0");
                let toHex = CommandUtil.commandToHex(cmd);
                let command = await that._syncSend({deviceId: deviceId, hexData: toHex});
                resolve(command);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        });
    }


    /**
     * 删除并移初始化设备
     */
    async deleteAndInitDevice({deviceId}) {
        return new Promise(async (resolve, reject) => {
            try {
                let cmd = new Command();
                cmd.send = clients.ble;
                cmd.accepter = clients.dataManage;
                cmd.cmd = '0F';
                let toHex = CommandUtil.commandToHex(cmd);
                let command = await that._syncSend({deviceId: deviceId, hexData: toHex});
                await Devices.deleteDevices({deviceId: deviceId});
                resolve(command);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        });

    }


    /**
     * 同步发送一问一答
     * @param deviceId 设备ID
     * @param hexData 发送的数据，必须是16进制数据
     * @param timeout  需要的超时时间 最长超时时间为30000毫秒
     */
    _syncSend({deviceId, hexData, timeout}) {
        return new Promise(async (resolve, reject) => {
            let timeoutNumber = -1;
            try {
                await BleSerialPort.sendSerialPortData({
                    scanDeviceName: deviceId,
                    data: hexData,
                    startWriteDataCall() {
                        timeoutNumber = setTimeout(function () {
                            reject(JSON.parse(JSON.stringify(BleError['0F'])));
                        }, (timeout && timeout < 30000) ? timeout : 1500);
                    },
                    async acceptData(res) {
                        clearTimeout(timeoutNumber);
                        let command = CommandUtil.hexToCommand(res);
                        console.log("解析完成指令信息", command)
                        if (command.stateCode !== '00') {
                            reject(JSON.parse(JSON.stringify(BleError[command.stateCode])));
                        } else {
                            resolve(command);
                        }
                    },
                    deviceConnectState(state) {
                        clearTimeout(timeoutNumber);
                        if ((state.type === 'connect' && !state.connected) || !state.available) {
                            reject(JSON.parse(JSON.stringify(BleError['10006'])));
                        }
                    }
                });
            } catch (e) {
                console.log(e)
                clearTimeout(timeoutNumber);
                reject(e);
            }
        });
    } //关闭串口所有调用后的函数必须调用


    /**
     * 关闭指定资源
     * @param deviceId
     */
    closeResource(deviceId) {
        BleSerialPort.closeSerialPort(deviceId);
    }


    /**
     * 给采集器发送采集指令
     * @param deviceId 设备ID
     * @param uid 密码编号
     */
    remoteCollectMark({deviceId}) {
        return new Promise((resolve, reject) => {
            //判断是否有该设备的权限
            // let deviceInfo = that.getDeviceInfo(deviceId);
            // let authCode = that.devicesAuthDateVerify(deviceInfo);
            // if (authCode.errCode !== BleError["0"].errCode) {
            //     reject(authCode);
            //     return;
            // }
            // if (!deviceInfo.device.onLine) {
            //     console.log("设备不在线");
            //     reject(BleErrMsg["10121"]);
            //     return;
            // }
            let data = {
                deviceId: deviceId,
                collectType: "Mark",
                userId: "15311206237"
            };
            console.log("发送数据", data);

            Network.syncNet({url: '/v2/device/send/collect/command', data: data, isEncrypt: true})
                .then((value) => {
                    console.log("远程采集返回的信息", value.data.data);
                    resolve(value);
                })
                .catch((reason) => reject(reason));
        });
    }


    /**
     * 远程发送指令
     * @param deviceId 设备ID
     * @param hexArray 发送的数据，必须是16进制数组
     * @param timeout  需要的超时时间 最长超时时间为30000毫秒
     */
    _remoteSend({deviceId, hexArray, timeout = 15}) {
        return new Promise(async (resolve, reject) => {
            try {

                //判断必须是管理才能进行的操作，出了开门，必须管理员权限
                if (Devices.isDeviceAdmin(deviceId)) {
                    reject(JSON.parse(JSON.stringify(BleError["10113"])));
                    return;
                }

                let info = await Devices.remoteRelayPenetrateDevice({
                    deviceId: deviceId,
                    command: hexArray,
                    overtime: timeout
                });
                let array = [];
                let replyCommand = info.data.data.replyCommand;
                for (let i = 0; i < replyCommand.length; i++) {
                    array.push(CommandUtil.hexToCommand(replyCommand[i]))
                }
                resolve(array);
            } catch (e) {
                console.log(e)
                reject(e);
            }
        });
    } //关闭串口所有调用后的函数必须调用


} //DeviceMethod

BleDevice.getInstance = function () {
    let bleDevice;
    if (!bleDevice) bleDevice = new BleDevice();
    return bleDevice;
};

module.exports = {
    addPwd: BleDevice.getInstance().addPwd,
    deletePwd: BleDevice.getInstance().deletePwd,
    freezePwdId: BleDevice.getInstance().freezePwdId,

    addCard: BleDevice.getInstance().addCard,
    cancelAddCard: BleDevice.getInstance().cancelAddCard,
    deleteCardId: BleDevice.getInstance().deleteCardId,
    freezeCardId: BleDevice.getInstance().freezeCardId,
    addMark: BleDevice.getInstance().addMark,
    cancelAddMark: BleDevice.getInstance().cancelAddMark,
    freezeMarkId: BleDevice.getInstance().freezeMarkId,
    deleteMarkId: BleDevice.getInstance().deleteMarkId,
    addFace: BleDevice.getInstance().addFace,
    cancelAddFace: BleDevice.getInstance().cancelAddFace,
    deleteFaceId: BleDevice.getInstance().deleteFaceId,
    freezeFaceId: BleDevice.getInstance().freezeFaceId,


    cancelCmd: BleDevice.getInstance().cancelCmd,
    offOrOnCard: BleDevice.getInstance().offOrOnCard,
    closeResource: BleDevice.getInstance().closeResource,
    getDeviceState: BleDevice.getInstance().getDeviceState,
    addDeviceFace: BleDevice.getInstance().addDeviceFace,
    deleteDeviceFace: BleDevice.getInstance().deleteDeviceFace,
    freezeDeviceFace: BleDevice.getInstance().freezeDeviceFace,
    unfreezeDeviceFace: BleDevice.getInstance().unfreezeDeviceFace,
    readLog: BleDevice.getInstance().readLog,
    readDeviceState: BleDevice.getInstance().readDeviceState,
    updateLockModel: BleDevice.getInstance().updateLockModel,
    updateLanguage: BleDevice.getInstance().updateLanguage,
    updateLock: BleDevice.getInstance().updateLock,
    updateBrakeAlarm: BleDevice.getInstance().updateBrakeAlarm,
    updateVolume: BleDevice.getInstance().updateVolume,
    updateMotorTime: BleDevice.getInstance().updateMotorTime,
    updateAutoCloseLockTime: BleDevice.getInstance().updateAutoCloseLockTime,
    syncTime: BleDevice.getInstance().syncTime,
    deleteAndInitDevice: BleDevice.getInstance().deleteAndInitDevice,
    remoteAddPwd: BleDevice.getInstance().remoteAddPwd,
    remoteDeletePwd: BleDevice.getInstance().remoteDeletePwd,
    remoteFreezePwdId: BleDevice.getInstance().remoteFreezePwdId,
    remoteDeleteCardId: BleDevice.getInstance().remoteDeleteCardId,
    remoteFreezeCardId: BleDevice.getInstance().remoteFreezeCardId,
    remoteDeleteMarkId: BleDevice.getInstance().remoteDeleteMarkId,
    remoteFreezeMarkId: BleDevice.getInstance().remoteFreezeMarkId,
    remoteDeleteFaceId: BleDevice.getInstance().remoteDeleteFaceId,
    remoteFreezeFaceId: BleDevice.getInstance().remoteFreezeFaceId,
    motorReversed: BleDevice.getInstance().motorReversed,
    remoteCollectMark: BleDevice.getInstance().remoteCollectMark,

};
