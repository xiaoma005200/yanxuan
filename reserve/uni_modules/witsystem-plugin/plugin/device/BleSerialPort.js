import Ble from '../ble/Ble';
import Devices from '../model/Devices';
import BleError from "../error/BleError";
import Command from "./command/Command";
import CommandUtil from "./command/CommandUtil";

let that; //设备连接状态的回调

let connectState; //蓝牙连接状态回调函数集合

let accept; //串口回复数据的回调接口

let interiorAccept; //内部接收到数据回调

let stateCallList = []; //蓝牙连接状态

let acceptCallList = []; //接收数据监听回调队列

let connectAuthTimeout;

class BleSerialPort {


    constructor() {
        that = this;

        this.SERVICES = '0000FFF1-0000-1000-8000-00805F9B34FB';

        this.WRITE = '0000FF01-0000-1000-8000-00805F9B34FB'; //写入数据的特征

        this.READ = '0000FF02-0000-1000-8000-00805F9B34FB'; //读取数据的特征，或者是通知的特征

        this.TOKEN = '0000FF03-0000-1000-8000-00805F9B34FB'; //读取token


        this.timerOutNumber = 0;
        //this.envVersion = uni.getAccountInfoSync().miniProgram.envVersion;
        this.envVersion = 'release';
    }

    /**
     * 发送串口数据
     * scanDeviceName 如果要传入，必须扫描设备出来的数据
     * acceptData 串口接受到数据的回调函数,可以传入空，通过数据观察者来获得数据，在一问一答中建议传入
     * deviceConnectState 设备连接状态的函数回调 发送一次传入一次 每次传入都会覆盖上一次的
     * startWriteDataCall 开始写入数据的回调 ,在调用蓝牙写入数据之前调用，认证不调用
     * data 必须是16进制
     * isUnlockAuth  是否进行开门认证，为true的时候代表认证开门并完成认证
     */
    sendSerialPortData = function ({
                                       scanDeviceName,
                                       scanDeviceId,
                                       data,
                                       acceptData,
                                       deviceConnectState,
                                       startWriteDataCall,
                                       isUnlockAuth
                                   }) {
        return new Promise(async (resolve, reject) => {
            try {

                if (!scanDeviceName) {
                    reject(JSON.parse(JSON.stringify(BleError["10107"])));
                    return;
                }

                let deviceUserD = Devices.getDeviceInfo(scanDeviceName);

                if (!deviceUserD || !deviceUserD.device) {
                    reject(JSON.parse(JSON.stringify(BleError["10110"])));
                    return;
                }

                //判断设备的有效期
                let authCode = Devices.devicesAuthDateVerify(deviceUserD);
                if (authCode.errCode !== BleError["0"].errCode) {
                    reject(authCode);
                    return;
                }

                //判断必须是管理才能进行的操作，出了开门，必须管理员权限
                if (deviceUserD.authType !== 'Admin' && data) {
                    reject(JSON.parse(JSON.stringify(BleError["10113"])));
                    return;
                }
                //复制两个函数
                if (acceptData) accept = acceptData;
                if (deviceConnectState) connectState = deviceConnectState; //判断是否已经连接，如果已经连接直接发送数据，否则先执行认证

                let connectDevice = await Ble.isDeviceConnectAndDevice(scanDeviceName); // console.log("串口通讯蓝牙是否连接", connectDevice);
                if (!connectDevice) {
                    //如果未传入scanDeviceId就先去读取缓存
                    if (!scanDeviceId) {
                        let cacheInfo = Ble.readDeviceCacheInfo(scanDeviceName);
                        scanDeviceId = cacheInfo ? cacheInfo.deviceId : null;
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
                    } //这里再次判断是否已经连接，部分情况上面通过名字无法判断是否已经连接,如果没有连接在进行连接和认证
                    if (!(await Ble.isDeviceIdConnectAndDevice(scanDeviceId))) {
                        //启动适配器状态
                        that._serialPortAdapterStateState();
                        let res = await Ble.connection({
                            deviceId: scanDeviceId,
                            timeout: 10000,
                            reconnectionTag: true
                        });

                        //app端需要延迟后再去发现服务否则会发现服务器失败
                        //#ifdef APP-PLUS
                        await Ble._asyncTimer(1000);
                        //#endif
                        await Ble._asyncTimer(100);

                        await Ble.getBleServices({
                            deviceId: scanDeviceId
                        });
                        await Ble.getBleCharacteristics({
                            deviceId: scanDeviceId,
                            serviceId: that.SERVICES
                        }); //获取设备的状态
                        //蓝牙连接认证
                        let battery = await that._connectAuth(scanDeviceName, scanDeviceId, isUnlockAuth);


                        //更新mtu 如果更新失败连续更新两次，都失败直接忽略更新使用默认值
                        //#ifdef APP-PLUS
                        await Ble._asyncTimer(50);
                        //#endif
                        await Ble.setBleMtu({deviceId: scanDeviceId, mtu: 480}).catch(async err => {
                            if (err.errCode !== BleError["10109"].errCode) {
                                await Ble.setBleMtu({deviceId: scanDeviceId, mtu: 200}).catch(err => {
                                })
                            }
                        });


                        that._serialPortDeviceConnectState(); //启动监听连接状态
                        that._notifyBleStateObserver(res);//通知观察者

                        if (!data) {//判断没有数据直接返回成功
                            let parse = JSON.parse(JSON.stringify(BleError["00"]));
                            if (isUnlockAuth) parse.battery = battery;//拷贝认证对象直接返回并且携带电量,只有开启设备才会携带电量
                            resolve(parse);
                            return;
                        }

                        await Ble._asyncTimer(100);  //认证完成继续发送数据，需要延迟一下在发送，否则失败
                        resolve(await that._writeDataToDevice(scanDeviceId, data, startWriteDataCall));
                        return;
                    }
                } else {
                    scanDeviceId = connectDevice.deviceId;
                }
                //判断已经认证，还需要开门写入开门指令
                if (isUnlockAuth) {
                    let battery = await that._openCommand(scanDeviceId);
                    if (!data) {//判断没有数据直接返回成功
                        let parse = JSON.parse(JSON.stringify(BleError["00"]));
                        if (isUnlockAuth) parse.battery = battery;//拷贝认证对象直接返回并且携带电量,只有开启设备才会携带电量
                        resolve(parse);
                        return;
                    }
                    await Ble._asyncTimer(100); //如果不为空者需要延时再发送
                }
                resolve(await that._writeDataToDevice(scanDeviceId, data, startWriteDataCall));
            } catch (e) {
                Ble.disconnection({deviceId: scanDeviceId}); //判断是否认证开门，如果是认证开门上传开门结果
                reject(e);
            }
        });
    };

    /**
     * 连接权限权限认证
     * @param scanDeviceName 设备名称
     * @param scanDeviceId 扫描到的设备ID
     * @param isUnlockAuth 是否认证并且开启设备
     * @returns {Promise<unknown>} 返回值为电量
     * @private
     */
    _connectAuth(scanDeviceName, scanDeviceId, isUnlockAuth) {
        return new Promise(async (resolve, reject) => {
            try {
                 connectAuthTimeout = setTimeout(function () {
                    reject(BleError["10114"]);
                }, 3000);
                //启动内部接收数据监听，这里会收到认证的结果
                interiorAccept = function (hex) {
                    interiorAccept = null;
                    if(connectAuthTimeout != null)clearTimeout(connectAuthTimeout);
                    let acceptCommand = CommandUtil.hexToCommand(hex);
                    if (acceptCommand.stateCode !== '00') {//判断如果不等于0 代表认证失败
                        reject(BleError[acceptCommand.stateCode]);
                        return;
                    }
                    resolve(acceptCommand.data);
                };

                //启动监听回复数据
                that._serialPortAcceptData({
                    scanDeviceId: scanDeviceId,
                    error(err) {
                        connectState = null;
                        Ble.disconnection({deviceId: scanDeviceId});
                        reject(err);
                    }
                }); //通知观察者连接成功并且完成认证

                await Ble._asyncTimer(100);

                let token = await Ble.readValue({
                    deviceId: scanDeviceId,
                    serviceId: that.SERVICES,
                    characteristicId: that.TOKEN
                });
                let command = new Command();
                command.head = "E7";
                command.cmd = isUnlockAuth ? '04' : '03';
                command.data = "00"+Ble.encryptToBase64(Ble.ab2hex(token.value), Devices.getDeviceInfo(scanDeviceName).device.deviceKey);
                let authData = CommandUtil.commandToHex(command);
                console.log("认证数据", authData)
                await Ble.writeValue({
                    deviceId: scanDeviceId,
                    serviceId: that.SERVICES,
                    characteristicId: that.WRITE,
                    buffer: Ble.hex2ab(authData).buffer
                });
            } catch (e) {
                reject(e)
            }
        })
    }

    //写入开门指令
    async _openCommand(scanDeviceId) {
        return new Promise(async (resolve, reject) => {
            let timeout = setTimeout(function () {
                reject(BleError["10114"]);
            }, 2000);
            try {
                interiorAccept = function (hex) {
                    interiorAccept = null;
                    clearTimeout(timeout);
                    let acceptCommand = CommandUtil.hexToCommand(hex);
                    if (acceptCommand.stateCode !== '00') {//判断如果不等于0 代表认证失败
                        reject(BleError[acceptCommand.stateCode]);
                        return;
                    }

                    resolve(acceptCommand.data);
                };
                let date = new Date();
                const utcTimestamp = date.getTime();//utc时间戳
                const localTimestamp = date.getTimezoneOffset() * -60 * 1000 + utcTimestamp;//本地时间戳

                let command = new Command();
                command.head = "E1";
                command.cmd = '08';
                command.send = '03';
                command.accepter = '0B';
                command.data = "00";//指定开启那个锁 00默认开启自己
                command.data = command.data + Math.floor(utcTimestamp / 1000).toString(16).padStart(8, "0");
                command.data = command.data + Math.floor(localTimestamp / 1000).toString(16).padStart(8, "0");
                let authData = CommandUtil.commandToHex(command);
                console.log("发送的开门指令", JSON.stringify(command))
                await that._writeDataToDevice(scanDeviceId, authData)
            } catch (e) {
                console.log(e);
                clearTimeout(timeout);
                reject(e);
            }

        });

    }

    //写入数据到设备
    async _writeDataToDevice(scanDeviceId, data, startWriteDataCall) {
        console.log("发送的数据", data);
        if (data) {
            if (startWriteDataCall) startWriteDataCall();
            data = data.toLocaleUpperCase();
            await Ble.writeValue({
                deviceId: scanDeviceId,
                serviceId: that.SERVICES,
                characteristicId: that.WRITE,
                buffer: Ble.hex2ab(data).buffer
            });
        }
        let parse = JSON.parse(JSON.stringify(BleError["00"]));
        parse.deviceId = scanDeviceId;
        return parse;
    }


    //监听串口的回复数据 (禁止外部调用)
    _serialPortAcceptData = function ({scanDeviceId, error}) {
        Ble.characteristicValueChange({
            deviceId: scanDeviceId,
            serviceId: this.SERVICES,
            characteristicId: this.READ,
            result(res) {
                let hex = Ble.ab2hex(res.value);
                console.log('串口接收到的数据', hex);
                if (interiorAccept) { //这里判断如果内部需要该结果必须先返回给内部，没有在返回给外部
                    interiorAccept(hex);
                } else {
                    if (accept) accept(hex);
                    that._notifyReceiveDataObserver(scanDeviceId, hex);
                }
            },
            error: error
        });
    };


    //设备连接状态监听
    _serialPortDeviceConnectState = function () {
        Ble.connectCharge({
            result(res) {
                if (connectState) connectState(res);

                that._notifyBleStateObserver(res);

                if (!res.connected) that.closeSerialPort(null); //判断如果是断开这回收资源
            }
        });
    };


    /**(禁止外部调用)
     * 启动适配器的监听
     */
    _serialPortAdapterStateState = function () {
        Ble.adapterStateChange(function (res) {
            if (connectState) connectState(res);
            that._notifyBleStateObserver(res);
            if (!res.available) that.closeSerialPort(null);
        });
    }; //关闭串口发送数据 deviceId 设备的mac 在ios为uuid


    /**
     * 关闭当前串口
     * @param scanDeviceName
     * @returns {Promise<void>}
     */
    async closeSerialPort(scanDeviceName) {
        if (this.timerOutNumber && this.timerOutNumber !== 0) clearTimeout(this.timerOutNumber);
        if (connectAuthTimeout !=null) clearTimeout(connectAuthTimeout);
        accept = null;
        connectState = null;
        Ble.closeAdapterStateChanger();
        Ble.closeConnectCharge();
        Ble.closeCharacteristicValueChange();

        let scanDeviceId;
        if (scanDeviceName && !scanDeviceId && Ble.platform === 'ios') {
            let cacheInfo = Ble.readDeviceCacheInfo(scanDeviceName);
            scanDeviceId = cacheInfo.deviceId;
        } else if (scanDeviceName && !scanDeviceId) {
            scanDeviceId = Ble.deviceNameToMac(scanDeviceName);
        }
        console.log("关闭串口", scanDeviceId)
        Ble.disconnection({
            deviceId: scanDeviceId
        });
    }

    /**
     * 添加串口接收到的数据的观察者
     */
    addReceiveDataObserver = function (observer) {
        acceptCallList.push(observer);
    }


    /**
     * 删除串口接收到的数据的观察者
     */
    deleteReceiveDataObserver = function (observer) {
        const index = acceptCallList.indexOf(observer);
        if (index > -1) {
            acceptCallList.splice(index, 1);
        }
    };

    /**
     * 通知串口接收到的数据的观察者
     * 添加setTimeout是为了防止观察者被使用者阻塞，导致无法接受到新的消息
     * @param hex 串口接收到的数据
     * @param deviceId 该设备ID和服务器返回的一样
     */
    _notifyReceiveDataObserver = function (deviceId, hex) {
        let length = acceptCallList.length;
        for (let i = 0; i < length; i++) {
            setTimeout(function () {
                if (acceptCallList[i]) acceptCallList[i](deviceId, hex);
            }, 0);
        }
    }; //阻塞线程 (禁止外部调用)


    /**
     * 添加蓝牙状态的观察者
     */
    addBleStateObserver = function (observer) {
        stateCallList.push(observer);
    };

    /**
     * 删除蓝牙状态的观察者 使用完成必须移除
     */
    deleteBleStateObserver = function (observer) {
        const index = stateCallList.indexOf(observer);
        if (index > -1) {
            stateCallList.splice(index, 1);
        }
    };

    /**
     * 通知蓝牙状态的观察者
     * 添加setTimeout是为了防止观察者被使用者阻塞，导致无法接受到新的消息
     */
    _notifyBleStateObserver = function (data) {
        let length = stateCallList.length;
        for (let i = 0; i < length; i++) {
            setTimeout(function () {
                if (stateCallList[i]) stateCallList[i](data);
            }, 0);
        }
    }; //阻塞线程 (禁止外部调用)

}

BleSerialPort.getInstance = function () {
    let bleSerialPort;
    if (!bleSerialPort) bleSerialPort = new BleSerialPort();
    return bleSerialPort;
}; //module.exports=BleSerialPort.getInstance();

export default {
    sendSerialPortData: BleSerialPort.getInstance().sendSerialPortData,
    closeSerialPort: BleSerialPort.getInstance().closeSerialPort,
    addReceiveDataObserver: BleSerialPort.getInstance().addReceiveDataObserver,
    deleteReceiveDataObserver: BleSerialPort.getInstance().deleteReceiveDataObserver,
    addBleStateObserver: BleSerialPort.getInstance().addBleStateObserver,
    deleteBleStateObserver: BleSerialPort.getInstance().deleteBleStateObserver
};

