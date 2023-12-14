import {
    initVueI18n
} from '@dcloudio/uni-i18n'
import messages from '../i18n/index.js'

const {
    t
} = initVueI18n(messages)


let BleErrMsg = {
    "0": {
        "errCode": "0",
        "errMsg": t("plugin.ok"),
        "msg": "正常",
        "type": "ble"
    },

    "-1": {
        "errCode": "-1",
        "errMsg": t("plugin.unknown"),
        "msg": "未知错误",
        "type": "ble"
    },

    "10000": {
        "errCode": "10000",
        "errMsg": t("plugin.not-init"),
        "msg": "未初始化蓝牙适配器",
        "type": "ble"
    },

    "10001": {
        "errCode": "10001",
        "errMsg": t("plugin.not-available"),
        "msg": "适配器不可用，可能是蓝牙关闭,请开启蓝牙",
        "type": "ble"
    },

    "10002": {
        "errCode": "10002",
        "errMsg": t("plugin.no-device"),
        "msg": "没有找到指定设备",
        "type": "ble"
    },

    "10003": {
        "errCode": "10003",
        "errMsg": t("plugin.connection-fail"),
        "msg": "连接失败",
        "type": "ble"
    },

    "10004": {
        "errCode": "10004",
        "errMsg": t("plugin.no-service"),
        "msg": "没有找到指定服务",
        "type": "ble"
    },

    "10005": {
        "errCode": "10005",
        "errMsg": t("plugin.no-characteristic"),
        "msg": "没有找到指定特征值",
        "type": "ble"
    },

    "10006": {
        "errCode": "10006",
        "errMsg": t("plugin.no-connection"),
        "msg": "当前连接已断开",
        "type": "ble"
    },

    "10007": {
        "errCode": "10007",
        "errMsg": t("plugin.property-not-support"),
        "msg": "当前特征值不支持此操作",
        "type": "ble"
    },

    "10008": {
        "errCode": "10008",
        "errMsg": t("plugin.system-error"),
        "msg": "其余所有系统上报的异常",
        "type": "ble"
    },

    "10009": {
        "errCode": "10009",
        "errMsg": t("plugin.system-not-support"),
        "msg": "Android 系统特有，系统版本低于 4.3 不支持 BLE",
        "type": "ble"
    },

    "10010": {
        "errCode": "10010",
        "errMsg": t("plugin.already-connect"),
        "msg": "已连接",
        "type": "ble"
    },

    "10011": {
        "errCode": "10011",
        "errMsg": t("plugin.need-pin"),
        "msg": "配对设备需要配对码",
        "type": "ble"
    },

    "10012": {
        "errCode": "10012",
        "errMsg": t("plugin.connection-timeout"),
        "msg": "连接超时",
        "type": "ble"
    },

    "10013": {
        "errCode": "10013",
        "errMsg": t("plugin.invalid-data"),
        "msg": "连接 deviceId 为空或者是格式不正确",
        "type": "ble"
    },

    "10100": {
        "errCode": "10100",
        "errMsg": t("plugin.bluetooth-status-error"),
        "msg": "蓝牙状态错误请重试",
        "type": "ble"
    },


    "10101": {
        "errCode": "10101",
        "errMsg": t("plugin.wechat-not-permission"),
        "msg": "未授权微信蓝牙权限，请在设置里开启",
        "type": "ble"
    },


    "10102": {
        "errCode": "10102",
        "errMsg": t("plugin.gps-not"),
        "msg": "GPS未开启,请开启GPS",
        "type": "ble"
    },


    "10103": {
        "errCode": "10103",
        "errMsg": t("plugin.wechat-not-location-permission"),
        "msg": "微信缺少定位权限,请在设置中开启",
        "type": "ble"
    },


    "10104": {
        "errCode": "10104",
        "errMsg": t("plugin.bluetooth-off"),
        "msg": "蓝牙关闭,请开启蓝牙",
        "type": "ble"
    },


    "10105": {
        "errCode": "10105",
        "errMsg": t("plugin.device-exists"),
        "msg": "该设备已经在服务器存在",
        "type": "ble"
    },

    "10106": {
        "errCode": "10106",
        "errMsg": t("plugin.get-key-timeout"),
        "msg": "获取密钥超时",
        "type": "ble"
    },

    "10107": {
        "errCode": "10107",
        "errMsg": t("plugin.device-not-name"),
        "msg": "设备名称不能为空",
        "type": "ble"
    },
    "10108": {
        "errCode": "10108",
        "errMsg": t("plugin.phone-time-error"),
        "msg": "手机时间异常",
        "type": "ble"
    },
    "10109": {
        "errCode": "10109",
        "errMsg": t("plugin.not-mtu"),
        "msg": "当前系统不支持设置mtu",
        "type": "ble"
    },
    "10110": {
        "errCode": "10110",
        "errMsg": t("plugin.device-expires"),
        "msg": "设备到期/或者没有到达开启时间/或者没有对应权限",
        "type": "ble"
    },

    "10111": {
        "errCode": "10111",
        "errMsg": t("plugin.permission-expires"),
        "msg": "权限到期",
        "type": "ble"
    },

    "10112": {
        "errCode": "10112",
        "errMsg": t("plugin.permission-not-effect"),
        "msg": "权限还未生效",
        "type": "ble"
    },


    "10113": {
        "errCode": "10113",
        "errMsg": t("plugin.insufficient-permissions"),
        "msg": "权限不足",
        "type": "ble"
    },

    "10114": {
        "errCode": "10114",
        "errMsg": t("plugin.auth-time-out"),
        "msg": "蓝牙连接认证超时",
        "type": "ble"
    },
    "10115": {
        "errCode": "10115",
        "errMsg": t("plugin.sync-info-fail"),
        "msg": "蓝牙未连接同步信息失败",
        "type": "ble"
    },

    "10116": {
        "errCode": "10116",
        "errMsg": t("plugin.not-update-info"),
        "msg": "未调用检测更新信息",
        "type": "ble"
    },


    "10117": {
        "errCode": "10117",
        "errMsg": t("plugin.ota-fail"),
        "msg": "固件升级失败，连接断开",
        "type": "ble"
    },

    "10118": {
        "errCode": "10118",
        "errMsg": t("plugin.auth-freeze"),
        "msg": "权限被冻结",
        "type": "ble"
    },

    "10119": {
        "errCode": "10119",
        "errMsg": t("plugin.no-device-info"),
        "msg": "没有获取到指定设备的信息",
        "type": "ble"
    },

    "10120": {
        "errCode": "10120",
        "errMsg": t("plugin.wifi-overtime"),
        "msg": "等待连接wifi超时",
        "type": "ble"
    },

    "10121": {
        "errCode": "10121",
        "errMsg": t("plugin.device-off-line"),
        "msg": "当前设备不在线",
        "type": "ble"
    },

    /* 下面是指令错误*/

    "00": {
        "errCode": "00",
        "type": "command",//错误类型，代表是指令类型
        "errMsg": t("plugin.cmd-success"),
        "msg": "成功"
    },

    "01": {
        "errCode": "01",
        "type": "command",
        "errMsg": t("plugin.check-failed"),
        "msg": "校验未通过"
    },

    "02": {
        "errCode": "02",
        "type": "command",
        "errMsg": t("plugin.execution-failed"),
        "msg": "执行失败"
    },
    "03": {
        "errCode": "03",
        "type": "command",
        "errMsg": t("plugin.full"),
        "msg": "存储量已满"
    },
    "04": {
        "errCode": "04",
        "type": "command",
        "errMsg": t("plugin.repeat-add"),
        "msg": "重复添加"
    },
    "05": {
        "errCode": "05",
        "type": "command",
        "errMsg": t("plugin.setstate-not"),
        "msg": "未进入设置状态"
    },
    "06": {
        "errCode": "06",
        "type": "command",
        "errMsg": t("plugin.not-new-device"),
        "msg": "设备不是新设备"
    },
    "07": {
        "errCode": "07",
        "type": "command",
        "errMsg": t("plugin.deviceInit"),
        "msg": "设备已初始化"
    },
    "10": {
        "errCode": "10",
        "type": "command",
        "errMsg": t("plugin.nd-wifi"),
        "msg": "未发现wifi"
    },
    "11": {
        "errCode": "11",
        "type": "command",
        "errMsg": t("plugin.wifi-info-error"),
        "msg": "wifi连接信息错误"
    },
    "12": {
        "errCode": "12",
        "type": "command",
        "errMsg": t("plugin.cmd-execution-failed"),
        "msg": "指令执行失败"
    },
    "13": {
        "errCode": "13",
        "type": "command",
        "errMsg": t("plugin.cmd-no-response"),
        "msg": "设备未应答"
    },
    "14": {
        "errCode": "14",
        "type": "command",
        "errMsg": t("plugin.latest-version"),
        "msg": "固件已是最新版本"
    },
    "15": {
        "errCode": "15",
        "type": "command",
        "errMsg": t("plugin.firmware-upgrade-failed"),
        "msg": "固件升级失败（校验失败/下载固件失败/设备网络异常等）"
    },
    "0A": {
        "errCode": "0A",
        "type": "command",
        "errMsg": t("plugin.anonymous"),
        "msg": "无记录"
    },
    "27": {
        "errCode": "27",
        "type": "command",
        "errMsg": t("plugin.filed-make"),
        "msg": "指纹生成特征失败"
    },
    "28": {
        "errCode": "28",
        "type": "command",
        "errMsg": t("plugin.fingerprint-synthesis-fail"),
        "msg": "指纹合成失败"
    },
    "2B": {
        "errCode": "2B",
        "type": "command",
        "errMsg": t("plugin.unable-process"),
        "msg": "暂时无法处理数据"
    },


    "31": {
        "errCode": "31",
        "type": "command",
        "errMsg": t("plugin.no-face"),
        "msg": "未检测到人脸"
    },


    "32": {
        "errCode": "32",
        "type": "command",
        "errMsg": t("plugin.face-top"),
        "msg": "人脸太靠上"
    },


    "33": {
        "errCode": "33",
        "type": "command",
        "errMsg": t("plugin.face-bottom"),
        "msg": "人脸太靠下"
    },


    "34": {
        "errCode": "34",
        "type": "command",
        "errMsg": t("plugin.face-left"),
        "msg": "人脸太靠左"
    },

    "35": {
        "errCode": "35",
        "type": "command",
        "errMsg": t("plugin.face-right"),
        "msg": "人脸太靠右"
    },


    "36": {
        "errCode": "36",
        "type": "command",
        "errMsg": t("plugin.face-far"),
        "msg": "人脸距离太远"
    },

    "37": {
        "errCode": "37",
        "type": "command",
        "errMsg": t("plugin.face-close"),
        "msg": "人脸距离太近"
    },
    "38": {
        "errCode": "38",
        "type": "command",
        "errMsg": t("plugin.eyebrow-occlusion"),
        "msg": "眉毛遮挡"
    },

    "39": {
        "errCode": "39",
        "type": "command",
        "errMsg": t("plugin.eye-occlusion"),
        "msg": "眼睛遮挡"
    },

    "3A": {
        "errCode": "3A",
        "type": "command",
        "errMsg": t("plugin.face-occlusion"),
        "msg": "脸部遮挡"
    },

    "3B": {
        "errCode": "3B",
        "type": "command",
        "errMsg": t("plugin.face-anisotropy"),
        "msg": "录入人脸方向错误"
    },


    "0F": {
        "errCode": "0F",
        "type": "command",
        "errMsg": t("plugin.overTime"),
        "msg": "超时"
    },

    "F0": {
        "errCode": "F0",
        "type": "command",
        "errMsg": t("plugin.Hardware-exception"),
        "msg": "硬件模块异常"
    },

}


export default BleErrMsg;
