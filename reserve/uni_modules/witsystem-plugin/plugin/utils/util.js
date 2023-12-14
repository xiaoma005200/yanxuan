import Md5 from './md5.js';

const formatTime = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':');
};

const formatNumber = (n) => {
    n = n.toString();
    return n[1] ? n : '0' + n;
};
/**
 * 手机号验证
 */
const mobileVerify = (phoneNumber) => {
    const re = /^((13[0-9])|(14[0-9])|(15[0-9])|(17[0-9])|(18[0-9])|(19[0-9]))\d{8}$/;
    return re.test(phoneNumber);
};
/**
 * 邮箱验证
 */

const emailVerify = (email) => {
    const re = /^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/;
    return re.test(email);
};
// 支付md5加密获取sign
function createSign(jsonobj, key) {
    let signStr = obj2str(jsonobj);
    signStr = signStr + '&key=' + key;
    const sign = Md5.md5(signStr); //验证调用返回或微信主动通知签名时，传送的sign参数不参与签名，将生成的签名与该sign值作校验。
    return sign.toUpperCase();
} //object转string,用于签名计算

function obj2str(args) {
    let keys = Object.keys(args);
    keys = keys.sort(); //参数名ASCII码从小到大排序（字典序）；
    const newArgs = {};
    keys.forEach(function (key) {
        if (args[key] && args[key] !== 'sign') {
            //如果参数的值为空不参与签名；
            newArgs[key] = args[key]; //参数名区分大小写；
        }
    });
    let string = '';
    for (const k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
}
//随机函数的产生：
function createNonceStr() {
    return Math.random().toString(36).substr(2, 15); //随机小数，转换36进制，去掉0.，保留余下部分
}
/**
 * 解析url
 */
function analysisUrl(url) {
    let o = {};
    let queryString = url.split('?')[1];

    if (queryString) {
        queryString.split('&').forEach((item) => {
            let [key, val] = item.split('=');
            val = val ? decodeURI(val) : true;

            if (o.hasOwnProperty(key)) {
                o[key] = [].concat(o[key], val);
            } else {
                o[key] = val;
            }
        });
    }

    return o;
}
/**
 * 字符串转换成mac
 */
function strToMac(strMac) {
    let strList = [];

    for (let i = 0; i < strMac.length; i += 2) {
        strList.push(strMac.substring(i, i + 2));
    }

    return strList
        .map(function (item) {
            return item;
        })
        .join(':');
}


/**
 * 阻塞线程
 * @param time
 */
function wait(time) {
    return new Promise(function (resolve, reject) {
        let timer = setTimeout(function () {
            resolve(timer);
        }, time);
    });
}

/**
 * 同步返回插件的权限
 */
function syncGetSetting() {
    return new Promise((resolve, reject) => {
        uni.getSetting({
            success(res) {
                resolve(res);
            },
            fail(e) {
                reject(e);
            }
        });
    });
}

/**
 * 同步打开权限设置界面
 */
function syncOpenSetting() {
    return new Promise((resolve, reject) => {
        uni.openSetting({
            success(res) {
                resolve(res);
            },

            fail(e) {
                reject(e);
            }
        });
    });
}

/**
 * 生成随机的由字母数字组合的字符串
 * @param length 生成字符串的长度 不传入默认为32
 * @returns {string} 返回随机字符串
 */
function randomStr(length) {
    const chars = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z'
    ];
    let nums = '';
    length = length ? length : 32;
    for (let i = 0; i < length; i++) {
        const id = parseInt(Math.random() * 61);
        nums += chars[id];
    }
    return nums;
}

/**
 * 验证字符串是否能转换成json
 */
function isJsonString(str) {
    try {
        if (typeof JSON.parse(str) == 'object') {
            return true;
        }
    } catch (e) {}

    return false;
}

/**
 * 16进制数据必须是完整的数据，至少是一个字节
 * 16进制字符串转2进制数组
 * @param hex 16进制字符串
 */
function hexToBin(hex) {
    //一次最多只能转换6个字节所以计算需要几次循环
    let number = Math.ceil(hex.length / 12);
    let binData = [];

    for (let i = 0; i < number; i++) {
        let substring = i * 12 + 12 > hex.length ? hex.substring(i * 12) : hex.substring(i * 12, i * 12 + 12);
        let model2 = parseInt(substring, 16).toString(2); //计算补0的个数 le是16进制字符串 两个字符为一个字节，所有就是长度除2的到字节，一个自己是8 ，所以得到的字节在乘以8优化后的到如下表达式
        let cover = substring.length * 4 - model2.length; //不够8位的先补0
        for (let i = 0; i < cover; i++) {
            binData.push(0);
        }
        for (let i = 0; i < model2.length; i++) {
            binData.push(parseInt(model2.substring(i, i + 1)));
        }
    }
    return binData;
}

/**
 * 时间转成Date
 */
function convertDateFromString(dateString) {
    if (dateString) {
        let arr1 = dateString.split(' ');
        let sdate = arr1[0].split('-');
        return new Date(sdate[0], sdate[1] - 1, sdate[2]);
    }
}

export default {
    formatTime: formatTime,
    mobileVerify: mobileVerify,
    emailVerify: emailVerify,
    createSign: createSign,
    createNonceStr: createNonceStr,
    analysisUrl: analysisUrl,
    strToMac: strToMac,
    wait: wait,
    syncGetSetting: syncGetSetting,
    syncOpenSetting: syncOpenSetting,
    randomStr: randomStr,
    isJsonString: isJsonString,
    hexToBin: hexToBin,
    convertDateFromString: convertDateFromString
};
