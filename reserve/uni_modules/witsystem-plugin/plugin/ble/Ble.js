import SystemTimeManage from './SystemTimeManage';
import Devices from '../model/Devices';
import BleError from '../error/BleError';

const Aes = require('./aes.js');

let scanTimeCode = 0; //扫描的定时器的code


let that;
let failMsg = {
    '-1': '已连接',
    10000: '未初始化蓝牙适配器',
    10001: '当前蓝牙适配器不可用',
    10002: '没有找到指定设备',
    10003: '连接失败',
    10004: '没有找到指定服务',
    10005: '没有找到指定特征',
    10006: '当前连接已断开',
    10007: '当前特征不支持此操作',
    10008: '其余所有系统上报的异常',
    10009: '系统版本低于 4.3 不支持 BLE',
    10012: '连接超时',
    10013: '连接 deviceId 为空或者是格式不正确'
};
/**
 * 该类的所有deviceId都是蓝牙扫描返回的设备id 非服务器返回的设备id
 * 服务返回的设备id等价于扫描返回的设备name
 */

let bleState = ['蓝牙关闭,请开启蓝牙', '蓝牙重置中,请稍后再试', '设备不支持蓝牙', '未授权微信蓝牙权限，请在设置里开启', '蓝牙关闭,请开启蓝牙'];

//蓝牙连接定时器
let connectTimer = undefined;


//标记适配器是否可用，主要是为了解决app适配器状态返回错误
let adapterState = true;

class Ble {
    constructor() {
        that = this;
        this.systemInfo = uni.getSystemInfoSync();
        this.platform = this.systemInfo.platform;
        this.system = this.systemInfo.system;
        this.mtu = this.platform === 'ios' ? 120 : 23; //读取值的回调

        this.readValueCall = null; //特征值变化的回调

        this.valueChangeCallList = []; //扫描到的设备的缓存信息

        this.scanDeviceCacheInfo = {};
    }

    /**
     * 给app时候调用
     * gps 是否已经开启
     */
    isOpenGps() {
        // 定位开启状态 true=开启，false=未开启
        let bool = false
        // android平台
        if (this.platform === 'android') {
            const context = plus.android.importClass("android.content.Context");
            const locationManager = plus.android.importClass("android.location.LocationManager");
            const main = plus.android.runtimeMainActivity();
            const mainSvr = main.getSystemService(context.LOCATION_SERVICE);
            bool = mainSvr.isProviderEnabled(locationManager.GPS_PROVIDER)
        }

        // ios平台
        if (this.platform === 'ios') {
            const cllocationManger = plus.ios.import("CLLocationManager");
            const enable = cllocationManger.locationServicesEnabled();
            const status = cllocationManger.authorizationStatus();
            plus.ios.deleteObject(cllocationManger);
            bool = enable && status !== 2
        }
        return bool;
    }

    /**
     * 定时初始化适配器，用在ios手机首次调用微信没有蓝牙权限时候初始化一次适配器，设置可以获得微信的蓝牙权限
     */
    _setTimeInitAdapter() {
        try {
            this.initBleAdapter();
            setTimeout(function () {
                that.closeBleAdapter();
            }, 200);
        } catch (e) {
            console.log("ble",e);
        }
    } //返回是否具有操作蓝牙的条件

    isMeetBleCondition() {
        this.systemInfo = uni.getSystemInfoSync();

        if (this.platform === 'ios') {
            // android 和ios 需要的条件分别不相同
            if (this.systemInfo.bluetoothAuthorized !== undefined && !this.systemInfo.bluetoothAuthorized) {
                this._setTimeInitAdapter();
                // return {
                //     errCode: 10101,
                //     errMsg: '未授权微信蓝牙权限，请在设置里开启',
                //     errno: 9000001
                // };
                return BleError["10101"];
            }
        } else {
            if (this.systemInfo.locationEnabled !== undefined && !this.systemInfo.locationEnabled) {
                // return {
                //     errCode: 10102,
                //     errMsg: 'GPS未开启,请开启GPS',
                //     errno: 9000002
                // };
                return BleError["10102"];
            }

            if (this.systemInfo.locationAuthorized !== undefined && !this.systemInfo.locationAuthorized) {
                // return {
                //     errCode: 10101,
                //     errMsg: '微信缺少定位权限,请在设置中开启',
                //     errno: 1509008
                // };
                return BleError["10101"];
            }
        }

        //#ifdef APP-PLUS
        if (!this.isOpenGps()) {
            return BleError["10102"];
        }
        //#endif


        if (this.systemInfo.bluetoothEnabled !== undefined && !this.systemInfo.bluetoothEnabled) {
            // return {
            //     errCode: 10104,
            //     errMsg: '蓝牙关闭,请开启蓝牙',
            //     errno: 1500102
            // };
            return BleError["10104"];
        }

        return {
            errCode: 0, errMsg: 'success'
        };
    }

    //返回适配器状态
    bleAdapterState = () => {
        return new Promise((resolve, reject) => {
            uni.getBluetoothAdapterState({
                success(res) {
                    // console.log("适配器状态>>>>>>>>>>>>>>>>>>>", res)
                    res.available = adapterState && res.available;//为了解决app bug 才这样写的
                    res.isInit = true;
                    resolve(res);
                },

                fail(error) {
                    resolve({
                        discovering: false, available: false, isInit: false,
                    });
                }
            });
        });
    }; //初始化适配器

    initBleAdapter = () => {
        return new Promise((resolve, reject) => {
            let timeDifference = new Date().getTime() - SystemTimeManage.getServerTime(); //console.log("初始化适配器");
            if (timeDifference < -90000) {
                reject(BleError["10108"]);
                return;
            }

            uni.openBluetoothAdapter({
                success(res) {
                    resolve(res);
                },

                fail(error) {
                    console.log('ble初始化适配器', error);
                    if (error.errno && error.errno === 103) {
                        error = BleError["10101"];
                        that._wxBleAuth();
                    } else {
                        let bleErrorElement = BleError["" + error.errCode];
                        if (bleErrorElement) {
                            error = bleErrorElement;
                        }
                    }

                    reject(error);
                }
            });
        });
    };

    /**
     * 处理微信权限
     */
    _wxBleAuth() {
        setTimeout(function () {
            uni.showModal({
                title: '权限提示', content: '小程序未获得微信蓝牙权限，请在小程序设置中开启', confirmText: '去开启', cancelText: '关闭',

                success(res) {
                    if (res.confirm) {
                        uni.openSetting({
                            fail() {
                                uni.showToast({
                                    title: '自动开启失败,请手动开启', icon: 'none'
                                });
                            }
                        });
                    }
                }
            });
        }, 100);
    }

    /**
     * @param scanTime扫描的时间 0代表无限扫描下去
     * @param interval 上报时间间隔
     * @param result 扫描结果的回调
     * @param error 所有的异常的回调
     * @param scanEnd 如果定时扫描，扫描完成时候调用
     */
    async scan({scanTime, interval, allowDuplicatesKey, result, error, scanEnd}) {


        let state = null;

        try {
            let meetBleCondition = this.isMeetBleCondition();

            if (meetBleCondition.errCode !== 0) {
                if (error) error(meetBleCondition);
                return;
            } //先获得蓝牙适配器的状态
            state = await this.bleAdapterState();  //判断适配器是否可用
            if (!state.isInit) {//判断适配器不为初始化进行初始化
                await this.initBleAdapter();
            } else {
                if (!state.available) {
                    if (error) error(BleError["10001"]);
                    return;
                } //判断是否在扫描，如果在扫描停止扫描
                if (state.discovering) {
                    that.stopScan();
                    if (error) error(BleError["10100"]);
                    return;
                }
            }


        } catch (err) {
            console.log("ble",err);
            this.closeBleAdapter();
            let bleErrorElement = BleError["" + err.errCode];
            if (bleErrorElement) {
                err = bleErrorElement;
            }
            if (error) error(err);
            return;
        } //判断适配器未初始化进行初始化

        uni.onBluetoothDeviceFound(function (res) {
            if (result) result(res);
            setTimeout(function () {
                res.devices.forEach((item) => {
                  //  if (item.localName && Devices.getDeviceInfo(item.localName)){
                        that.scanDeviceCacheInfo[item.localName] = item;
                        that.scanDeviceCacheInfo[item.deviceId] = item;
                   // }

                });
            });
        });

        uni.startBluetoothDevicesDiscovery({
            powerLevel: 'high',
            allowDuplicatesKey: allowDuplicatesKey ? allowDuplicatesKey : false,
            interval: interval ? interval : 0,
            success(res) {
                console.log('ble启动扫描');
                if (!scanTime || scanTime < 0) {
                    return;
                } //定时器

                scanTimeCode = setTimeout(function () {
                    that.stopScan();
                    if (scanEnd) scanEnd();
                }, scanTime);
            },

            fail(e) {
                console.log('ble扫描异常', e);
                if (e.errno === 1509008) {
                    e = BleError["10103"];
                } else {
                    let bleErrorElement = BleError["" + e.errCode];
                    if (bleErrorElement) {
                        e = bleErrorElement;
                    }
                }
                if (error) error(e);
            }
        });
    }

    /**
     * 对扫描设备进行封装，扫描指定的设备，扫描到直接结束扫描,不指定扫描时间就扫描10秒钟
     * @param deviceName
     * @param scanTime
     * @param interval
     * @param allowDuplicatesKey
     */

    scanDesignatedDevice = function ({deviceName, scanTime, interval, allowDuplicatesKey}) {
        return new Promise((resolve, reject) => {
            if (!deviceName) reject(BleError["10107"]);//指定设备名称不能为空
            that.scan({
                scanTime: scanTime ? scanTime : 10000, interval: interval, allowDuplicatesKey: allowDuplicatesKey,

                result(res) {
                    const devices = res.devices;
                    let length = devices.length;

                    for (let i = 0; i < length; i++) {
                        if (deviceName === devices[i].localName) {
                            that.stopScan();
                            resolve(devices[i]);
                        }
                    }
                },

                error(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                },

                scanEnd() {
                    reject({
                        errMsg: '扫描结束'
                    });
                }
            });
        });
    };

    /**
     * 对扫描设备进行封装，扫描指定的设备，扫描到直接结束扫描,不指定扫描时间就扫描10秒钟
     * @param deviceId
     * @param scanTime
     * @param interval
     * @param allowDuplicatesKey
     */
    _scanDesignatedDevice = function ({deviceId, scanTime, interval, allowDuplicatesKey}) {
        return new Promise((resolve, reject) => {

            that.scan({
                scanTime: scanTime ? scanTime : 10000, interval: interval, allowDuplicatesKey: allowDuplicatesKey,

                result(res) {
                    const devices = res.devices;
                    let length = devices.length;

                    for (let i = 0; i < length; i++) {
                        if (deviceId === devices[i].deviceId) {
                            that.stopScan();
                            resolve(devices[i]);
                        }
                    }
                },

                error(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                },

                scanEnd() {
                    reject({
                        errMsg: '未发现设备'
                    });
                }
            });
        });
    };

    /**
     * 停止扫描
     */
    stopScan = function () {
        uni.offBluetoothDeviceFound();
        uni.stopBluetoothDevicesDiscovery();
        if (scanTimeCode > 0) {
            clearTimeout(scanTimeCode);
            scanTimeCode = 0;
        }
    };

    /**
     * 连接设备 如果出现133并且在执行一次连接
     * @param deviceId 连接的设备id
     * @param timeout 连接超时时间
     * @param reconnectionTag 连接失败是否执行一次重新连接
     */
    connection = async ({deviceId, timeout}) => {
        return new Promise(async (resolve, reject) => {
            console.log('ble传入的设备id', deviceId);
            try {
                let deviceCache = that.scanDeviceCacheInfo[deviceId];

                if(deviceCache == null){
                    deviceCache = await that._scanDesignatedDevice({deviceId:deviceId});
                }
                let res = await that._syncConnection({
                    deviceId: deviceId, timeout: timeout
                });
                resolve(res);
            } catch (err) {
                console.log("ble连接异常", err);
                await that.disconnection({deviceId: deviceId});
                if (err.errCode !== 10003) {
                    reject(err);
                    return;
                }
                try {
                    await that._asyncTimer(1000);
                    let res = await that._syncConnection({
                        deviceId: deviceId, timeout: timeout
                    });
                    resolve(res);
                } catch (err) {
                    console.log("ble",err)
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            }
        });
    };

    /**
     * 同步执行连接
     * @param deviceId
     * @param timeout
     */
    _syncConnection({deviceId, timeout}) {
        return new Promise(async (resolve, reject) => {
            if (!deviceId) {
                reject({
                    errMsg: '设备id不能为空'
                });
                return;
            } //获得适配器的状态

            let state = null;
            try {
                //先获得蓝牙适配器的状态
                state = await that.bleAdapterState(); //判断适配器是否可用

                if (!state.isInit) {
                    await this.initBleAdapter();
                } else {
                    if (!state.available) {
                        reject(BleError["10001"]);
                        return;
                    } //判断是否在扫描，如果在扫描停止扫描
                    if (state.discovering) {
                        that.stopScan();
                        reject(BleError["10100"]);
                        return;
                    }
                }
                await this.initBleAdapter();
            } catch (err) {
                console.log("ble",err);
                //判断错误只要不是未初始化好适配器接返回错误
                let bleErrorElement = BleError["" + err.errCode];
                if (bleErrorElement) {
                    err = bleErrorElement;
                }
                reject(err);
                return
            }

            //判断是否已经连接到设备
            if (await that.isDeviceIdConnect(deviceId)) {
                resolve({
                    errCode: 0, errMsg: 'createBLEConnection:ok', deviceId: deviceId, connected: true
                }); //isConnected 返回代表设备是之前已经连接好了的

                return;
            } //设置默认mtu ios 100 android 20
            this.mtu = this.platform === 'ios' ? 120 : 23; //启动连接状态变化监听，连接成功在这里返回结果
            if (this.systemInfo.uniPlatform !== 'app' && this.systemInfo.uniPlatform !== 'web') {
                this.closeConnectCharge();//关闭之前的连接监听
            }
            uni.onBLEConnectionStateChange(function (res) {
                console.log('ble连接状态变化', res);
                if (res.connected) {
                    res.type = 'connect';
                    resolve(res);
                    if (connectTimer) {
                        clearTimeout(connectTimer);
                    }
                }
            });
            that.valueChangeCallList.length = 0; //连接前清空通知的回调

            console.log('ble开始连接');
            //犹豫连接的定时器在app上有bug,断开了还会收超时连接所以自定义
            if (timeout) {
                connectTimer = setTimeout(function () {
                    that.disconnection({deviceId: deviceId});
                    reject(BleError["10012"]);
                }, timeout)
            }
            uni.createBLEConnection({
                deviceId: deviceId, // timeout: timeout ? timeout : 0,
                timeout:10000,
                success(res) {
                    console.log('ble发送连接请求成功', res);

                },

                fail(err) {
                    console.log('ble连接失败', err);
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    }


    /**
     * 断开连接
     * deviceId
     */
    disconnection = async function ({deviceId}) {
        console.log("ble执行断开", deviceId)
        that.stopScan();
        if (!deviceId || !(await that.isDeviceIdConnect(deviceId))) {
            that.closeBleAdapter();
            return;
        }

        // if (!deviceId ) {
        //     that.closeBleAdapter();
        //     return;
        // }


        //关闭连接定时器
        if (connectTimer) {
            clearTimeout(connectTimer);
        }

        return new Promise((resolve, reject) => {
            uni.closeBLEConnection({
                serial: false,
                deviceId: deviceId,
                success(res) {
                    console.log("ble执行断开成功", res)
                    that.closeBleAdapter();
                    resolve(res);
                },

                fail(err) {
                    that.closeBleAdapter();
                    console.log("ble执行断开失败", err)
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    };

    /**
     * 设置mtu 必须在连接成功之后
     */
    setBleMtu = async function ({deviceId, mtu}) {
        return new Promise((resolve, reject) => {
            try {
                if (this.platform === 'ios') {
                    reject(BleError["10109"]);
                    return;
                }
                let strings = this.system ? this.system.split(' ') : 4;
                let systemVersion = parseFloat(strings[1]);

                if (systemVersion < 5.1) {
                    reject(BleError["10109"]);
                    return;
                }
                uni.setBLEMTU({
                    deviceId: deviceId, mtu: mtu,

                    success(res) {
                        that.mtu = mtu;
                        console.log('ble设置mtu成功', res);
                        resolve(res);
                    },

                    fail(e) {
                        reject(e);
                    }
                });
            } catch (err) {
                let bleErrorElement = BleError["" + err.errCode];
                if (bleErrorElement) {
                    err = bleErrorElement;
                }
                reject(err);
            }
        });
    };

    /**
     * 获取当前的mtu
     * 需要连接到设备后在获取才是准确的mtu
     */
    getMtu = async function ({deviceId}) {
        if (!deviceId) {
            return this.mtu;
        }

        try {
            return await that._systemMtu(deviceId);
        } catch (e) {
            return this.mtu;
        }
    };

    /**
     * 获取系统默认的mtu
     * @param deviceId
     */
    _systemMtu = function (deviceId) {
        return new Promise((resolve, reject) => {
            uni.getBLEMTU({
                deviceId: deviceId, writeType: 'write',

                success(res) {
                    console.log('ble获得的系统mtu', res);
                    resolve(res.mtu);
                },

                fail(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    };

    /**
     * 获得当前蓝牙运行的平台
     */
    getBlePlatform = function () {
        return this.platform;
    };

    /**必须在连接成功够调用，否则不生效
     * 监听连接状态
     */
    connectCharge = function ({result, error}) {
        uni.onBLEConnectionStateChange(function (res) {
            res.type = 'connect';
            if (result) result(res);
        });
    }; //关闭状态的监听

    closeConnectCharge = function () {
        //#ifdef MP
        uni.offBLEConnectionStateChange();
        //#endif
    };

    //监听通知或者特征值的变化
    characteristicValueChange = function ({deviceId, serviceId, characteristicId, result, error}) {
        that._acceptBLECharacteristicValue();
        if (result) this.valueChangeCallList.push({
            characteristicId: characteristicId, call: result
        });
        uni.notifyBLECharacteristicValueChange({
            state: true, // 启用 notify 功能
            deviceId, serviceId, characteristicId,

            success(res) {
            },

            fail(err) {
                let bleErrorElement = BleError["" + err.errCode];
                if (bleErrorElement) {
                    err = bleErrorElement;
                }
                if (error) error(err);
            }
        });
    };

    /**
     * 单提取出来是因为接受通知返回的信息和读取特征值的信息返回是同一个函数，所以需要在这里做区分
     * 内部调用 接受到特征的值
     * 注意的读取和和同的返回值都在这里
     */
    _acceptBLECharacteristicValue() {
        uni.onBLECharacteristicValueChange(function (res) {
            if (that.readValueCall && res.characteristicId === that.readValueCall.characteristicId) {
                that.readValueCall.call(res);
                that.readValueCall = null;
            } else if (that.valueChangeCallList) {
                for (let i = 0; i < that.valueChangeCallList.length; i++) {
                    if (that.valueChangeCallList[i].call && res.characteristicId === that.valueChangeCallList[i].characteristicId) {
                        that.valueChangeCallList[i].call(res);
                    }
                }
            }
        });
    } //关闭监听值的变化

    closeCharacteristicValueChange = function () {
        //#ifdef MP
        uni.offBLECharacteristicValueChange();
        //#endif
    };
    /**
     * 获得服务
     */
    getBleServices = ({deviceId}) => {
        return new Promise((resolve, reject) => {
            uni.getBLEDeviceServices({
                deviceId, success(res) {
                    resolve(res);
                },

                fail(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    };

    /**
     * 获得特征值
     */
    getBleCharacteristics = ({deviceId, serviceId}) => {
        return new Promise((resolve, reject) => {
            uni.getBLEDeviceCharacteristics({
                deviceId, serviceId,

                success(res) {
                    resolve(res);
                },

                fail(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    }; //读取值

    readValue = ({deviceId, serviceId, characteristicId}) => {
        return new Promise((resolve, reject) => {
            that._acceptBLECharacteristicValue();

            that.readValueCall = {
                characteristicId: characteristicId, call: function (characteristic) {
                    resolve(characteristic);
                }
            };
            uni.readBLECharacteristicValue({
                deviceId, serviceId, characteristicId,

                success(res) {
                    // console.log('调用读取成功:', res.errCode)
                },

                fail(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    }; //写入值

    writeValue = ({deviceId, serviceId, characteristicId, buffer}) => {
        return new Promise((resolve, reject) => {
            uni.writeBLECharacteristicValue({
                deviceId, serviceId, characteristicId, value: buffer, writeType:"write",

                success(res) {
                    resolve(res);
                },

                fail(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    }; //获得已经扫描到的设备

    getBleDevices = () => {
        return new Promise((resolve, reject) => {
            uni.getBluetoothDevices({
                success(res) {
                    resolve(res);
                },

                fail(err) {
                    let bleErrorElement = BleError["" + err.errCode];
                    if (bleErrorElement) {
                        err = bleErrorElement;
                    }
                    reject(err);
                }
            });
        });
    };

    /**
     * 获取指定设备的信息，该设备必须一已经被之前扫描到
     */
    readDeviceCacheInfo(deviceName) {
        return this.scanDeviceCacheInfo[deviceName];
    }

    /**
     * 写入一个数据到缓存区域
     */
    writeDeviceCache(data) {
        this.scanDeviceCacheInfo[data.localName] = data;
    }

    /**
     * 清空缓存全区的数据
     */
    cleanDeviceCache() {
        this.scanDeviceCacheInfo.length = 0;
    } //获得已经连接的设备

    getConnectDevices = () => {
        return new Promise((resolve, reject) => {
            if (that.platform === 'ios') {
                uni.getConnectedBluetoothDevices({
                    services: ['0000FFF1-0000-1000-8000-00805F9B34FB'],

                    success(res) {
                        resolve(res);
                    },

                    fail(err) {
                        let bleErrorElement = BleError["" + err.errCode];
                        if (bleErrorElement) {
                            err = bleErrorElement;
                        }
                        reject(err);
                    }
                });
            } else {
                uni.getConnectedBluetoothDevices({
                    success(res) {
                        resolve(res);
                    },

                    fail(err) {
                        let bleErrorElement = BleError["" + err.errCode];
                        if (bleErrorElement) {
                            err = bleErrorElement;
                        }
                        reject(err);
                    }
                });
            }
        });
    };
    //通过设备ID判断设备是否已经连接
    async isDeviceIdConnect(deviceId) {
        try {
            let res = await this.getConnectDevices();
            let devices = res.devices;
            let length = devices.length;

            for (let i = 0; i < length; i++) {
                if (devices[i].deviceId === deviceId) {
                    return true;
                }
            }

            return false;
        } catch (e) {
            return false;
        }
    }

    //判断设备是否已经连接
    async isDeviceConnect(deviceName) {
        try {
            let res = await this.getConnectDevices();
            console.log("ble>>>>>>>>>>蓝牙是否连接》》》》》》》》》》》", res)
            let device = this.scanDeviceCacheInfo[deviceName];
            let deviceId = this.platform === 'ios' ? (device ? device.deviceId : null) : this.deviceNameToMac(deviceName);
            let devices = res.devices;
            let length = devices.length;
            for (let i = 0; i < length; i++) {
                if (devices[i].name === deviceName || deviceId === devices[i].deviceId) {
                    return true;
                }
            }

            return false;
        } catch (e) {
            return false;
        }
    } //判断设备是否已经连接,如果连接返回连接设备的信息

    async isDeviceConnectAndDevice(deviceName) {
        if (!deviceName) return null;
        try {
            let res = await this.getConnectDevices();
            let devices = res.devices;
            let device = this.scanDeviceCacheInfo[deviceName];
            let deviceId = this.platform === 'ios' ? (device ? device.deviceId : null) : this.deviceNameToMac(deviceName);
            let length = devices.length;
            for (let i = 0; i < length; i++) {
                if (devices[i].name === deviceName || device.deviceId === deviceId) {
                    return devices[i];
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    //通过设备ID判断设备是否已经连接返回连接设备的信息
    async isDeviceIdConnectAndDevice(deviceId) {
        try {
            let res = await this.getConnectDevices();
            let devices = res.devices;
            let length = devices.length;
            for (let i = 0; i < length; i++) {
                if (devices[i].deviceId === deviceId) {
                    return devices[i];
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    } //关闭蓝牙适配器

    closeBleAdapter = function () {
        //关闭连接定时器
        if (connectTimer) {
            clearTimeout(connectTimer);
        }
        uni.closeBluetoothAdapter({
            success(res) {
                console.log('ble适配器关闭成功');
            }
        });
    }; //开启监听适配器状态

    adapterStateChange = function (callback) {
        uni.onBluetoothAdapterStateChange(function (res) {
            res.type = 'adapter';
            adapterState = res.available;//未来解决app返回状态错误的bug
            if (callback) callback(res);
        });
    }; //关闭适配器状态变化检测

    closeAdapterStateChanger = function (callback) {
        //#ifdef MP
        uni.offBluetoothDeviceFound(callback);
        //#endif

    }; //arrarybuffer转16进制

    /**
     * ArrayBuffer转16进度字符串
     * @param buffer
     * @returns {string}
     */
    ab2hex = function (buffer) {
        const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
            return ('00' + bit.toString(16)).slice(-2);
        });
        return hexArr.join('').toUpperCase();
    };

    // 16进度字符串转ArrayBuffer
    hex2ab = function (data) {
        return new Uint8Array(data.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16);
        }));
    };

    //16进制字符串转字utf8符串
    hexCharCodeToStr = function (hexCharCodeStr) {
        var trimedStr = hexCharCodeStr.trim();
        var rawStr = trimedStr.substr(0, 2).toLowerCase() === '0x' ? trimedStr.substr(2) : trimedStr;
        var len = rawStr.length;

        if (len % 2 !== 0) {
            alert('Illegal Format ASCII Code!');
            return '';
        }

        var curCharCode;
        var resultStr = [];

        for (var i = 0; i < len; i = i + 2) {
            curCharCode = parseInt(rawStr.substr(i, 2), 16); // ASCII Code Value

            resultStr.push(String.fromCharCode(curCharCode));
        }

        return resultStr.join('');
    };




    //aes加密
    encryptToBase64 = function (token, key) {
        let tokenHex = Aes.CryptoJS.enc.Hex.parse(token);
        let keyHex = Aes.CryptoJS.enc.Hex.parse(key);
        let c = Aes.CryptoJS.AES.encrypt(tokenHex, keyHex, {
            mode: Aes.CryptoJS.mode.ECB, padding: Aes.CryptoJS.pad.Pkcs7
        });
        let pw = c.ciphertext.toString().toUpperCase();
        return pw.substring(0, 32);
    };
    /**
     * 解析ff01信息
     */
    analyzeFF01 = function (uuidInfo) {
        let info = {};

        if (uuidInfo === undefined || uuidInfo.length < 16) {
            return info;
        }

        let position = 0;
        info['isNewDevice'] = uuidInfo.substring(position, 2) === '01';
        position = position + 2;
        info['isSetState'] = uuidInfo.substring(position, position + 2) === '01';
        position = position + 2;
        info['version'] = uuidInfo.substring(position, position + 6);
        position = position + 6;
        info['battery'] = parseInt(uuidInfo.substring(position, position + 4), 16);
        position = position + 4;
        info['model'] = uuidInfo.substring(position, uuidInfo.length);
        return info;
    }; //设备名称转换成mac

    deviceNameToMac = (deviceName) => {
        return [deviceName.substring(5, 7), deviceName.substring(7, 9), deviceName.substring(9, 11), deviceName.substring(11, 13), deviceName.substring(13, 15), deviceName.substring(15, 17)]
            .map((item) => {
                return item;
            })
            .join(':');
    };

    /**
     * 阻塞指定时间
     * @returns {Promise<time>} 阻塞的时长
     */
    _asyncTimer(time) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                resolve();
            }, time);
        });
    }
}

Ble.getInstance = function () {
    let ble;
    if (!ble) ble = new Ble();
    return ble;
};


export default Ble.getInstance();
