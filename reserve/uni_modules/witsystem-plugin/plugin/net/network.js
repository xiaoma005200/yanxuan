import Config from '../config/Config';
import RSAUtil from '../utils/RSAUtil';
import AESUtil from '../utils/AESUtil';
import Util from "../utils/util";
import BleError from "../error/BleError";

const host = Config.getConfig().httpUrl;
//let wxAppId = uni.getAccountInfoSync().miniProgram.appId;
let wxAppId = "";
let that;

class Network {
    constructor() {
        that = this;

    }

    //post请求
    post = function ({url, data, isSing = true, success, fail, responseType = "text", isEncrypt = false, iv=AESUtil.generateRandomIV(), head= {}}) {
        if (isEncrypt === true) {
            let ciphertext = AESUtil.encryptBase64({
                iv:iv,
                key: Config.getConfig().aesKey,
                data: JSON.stringify(data)
            });
            data = {ciphertext: ciphertext}
        }

        let header;
        if (isSing && Config.getConfig().rsaPrivateKey) {
            let timeStamp = new Date().getTime();
            let nonceStr = Math.random().toString(36).substr(2);
            let signData = Config.getConfig().appId + '\n' + Config.getConfig().token + '\n' + timeStamp + '\n' +
                nonceStr + '\n' + iv +"\n"+JSON.stringify(data) + '\n';
            let createdSign = RSAUtil.createdSign({
                privateKey: Config.getConfig().rsaPrivateKey,
                data: signData
            });

            header = {
                'content-type': 'application/json',
                token: Config.getConfig().token,
                appId: Config.getConfig().appId,
                wxAppId: wxAppId,
                nonceStr: nonceStr,
                timeStamp: timeStamp,
                sign: createdSign
            };
        } else {
            header = {
                'content-type': 'application/json',
                token: Config.getConfig().token,
                appId: Config.getConfig().appId,
                wxAppId: wxAppId
            };
        }
        header['Accept-Language'] = uni.getLocale();
        header['iv'] = iv;

        for (let headKey in head) {
            header[headKey] = head[headKey];
        }
        uni.request({
            url: url.indexOf('http') === 0 ? url : host + url,
            method: 'POST',
            data: data,
            header: header,
            timeout: 25000,
            responseType: responseType,
            success: function (res) {
                console.log("网络返回信息", res.data);
                if (res.statusCode === 200) {//判断返回的不是json 直接返回数据
                    if (responseType === 'arraybuffer') {
                        if (success) success(res);
                        return;
                    }

                    if (res.data.isEncryption) {
                        let analyzeInfo = that._analyzeInfo(res.data.encryptionType,iv, res.data.data);

                        if (!analyzeInfo) {
                            console.log("解密失败", analyzeInfo)
                            fail({
                                errCode: -1,
                                errMsg: 'Client decryption failed',
                                msg: '客户端解密失败',
                            });
                            return;
                        }
                        if (Util.isJsonString(analyzeInfo)) {
                            res.data.data = JSON.parse(analyzeInfo);
                        } else {
                            res.data.data = analyzeInfo;
                        }
                    }

                    if (res.data.code === 0) {
                        if (success) success(res);
                        return;
                    }
                    if (res.data.code === 100001 && url !== "/v2/notice/logout/cid") {//判断是token过期，但是不能是关闭通知的接口，直接发送过期提示
                        uni.$emit("witsystemOnPush", {data: {type: 'loginUser', data: ''}})
                    }
                    //判断确认码是200010 代表是指令错误需要按指令解析
                    if (res.data.code === 200010 && BleError[res.data.data]) {
                        if (fail) fail(JSON.parse(JSON.stringify(BleError[res.data.data])));
                        return;
                    }
                    if (fail) fail({
                        errMsg: (res.data.code === 10001) ? res.data.lackParameters[0].messages[0] : res.data.error,
                        errCode: res.data.code,
                        msg: res.data.error,
                        lackParameters: res.data.lackParameters,
                        data: res.data.data
                    });


                } else {
                    if (fail)
                        fail({
                            errCode: -1,
                            errMsg: 'Server exception',
                            msg: '服务器异常',
                        });
                }
            },
            fail: fail
        });
    };

    //get请求
    get = function ({url, success, fail}) {
        uni.request({
            url: url.indexOf('http') === 0 ? url : host + url,
            method: 'GET',
            header: {
                'content-type': 'application/json',
                'Accept-Language': uni.getLocale()
            },
            responseType: 'arraybuffer',
            success: success,
            fail: fail
        });
    };

    /**
     * @param url
     * @param data
     * @param isSing 是否需要签名，默认需要
     * @param responseType 返回数据格式，默认是text
     * @param isEncrypt 请求数据是否需要加密 默认不需要
     * @returns {Promise<unknown>}
     */
    syncNet = function ({url, data, isSing, responseType = "text", isEncrypt = false}) {
        return new Promise((resolve, reject) => {
            that.post({
                url: url,
                isSing: isSing,
                data: data,
                responseType: responseType,
                isEncrypt: isEncrypt,
                success(res) {
                    resolve(res);
                },

                fail(err) {
                    console.log('网络请求失败', err);
                    reject(err);
                }
            });
        });
    };


    /**
     * 同步get
     * @param url
     * @returns {Promise<unknown>}
     */
    syncGet = function ({url}) {
        return new Promise((resolve, reject) => {
            that.get({
                url: url,
                success: function (res) {
                    if (res.statusCode === 200) {
                        resolve(res);
                    } else {
                        reject({
                            errMsg: '服务器异常/网络异常'
                        });
                    }
                },
                fail: function (e) {
                    reject(e);
                }
            });
        });
    };


    /**
     * 上传文件
     */
    uploadFile = function ({url, filePath, data, success, fail, isSing}) {
        if (!isSing) isSing = true;
        let header;
        if (isSing) {
            let timeStamp = new Date().getTime();
            let nonceStr = Math.random().toString(36).substr(2);
            let signData = Config.getConfig().appId + '\n' + Config.getConfig().token + '\n' + timeStamp + '\n' +
                nonceStr + '\n' + JSON.stringify(data) + '\n';
            let createdSign = RSAUtil.createdSign({
                privateKey: Config.getConfig().rsaPrivateKey,
                data: signData
            });
            header = {
                token: Config.getConfig().token,
                appId: Config.getConfig().appId,
                wxAppId: wxAppId,
                nonceStr: nonceStr,
                timeStamp: timeStamp,
                sign: createdSign
            };
        } else {
            header = {
                token: Config.getConfig().token,
                appId: Config.getConfig().appId,
                wxAppId: wxAppId
            };
        }
        header['Accept-Language'] = uni.getLocale();
        console.log("提交的额外参数", data)
        uni.uploadFile({
            header: header,
            url: host + url,
            filePath: filePath,
            name: 'file',
            formData: data,
            success: success,
            fail: fail
        });
    };

    /**
     * 同步上传数据
     * @param url
     * @param filePath
     * @param formData
     * @returns {Promise<unknown>}
     */
    syncUploadFile = function ({url, filePath, data}) {
        return new Promise((resolve, reject) => {
            that.uploadFile({
                url: url,
                filePath: filePath,
                data: data,
                success(res) {
                    if (res.statusCode !== 200) {
                        if (fail) fail({
                            errMsg: '服务器异常'
                        });
                    }

                    if (!res.data) {
                        resolve(res);
                    }
                    let parse = JSON.parse(res.data);
                    if (parse.code !== 0) {
                        reject({
                            errMsg: (parse.code === 10001) ? parse.lackParameters[0].messages[0] : parse.error,
                            errCode: parse.code,
                            msg: parse.error,
                            lackParameters: parse.lackParameters,
                        });
                        return;
                    }
                    resolve(parse);
                },
                fail(e) {
                    reject(e);
                }
            });
        });

    };

    /**
     * 同步获得当前网络的状态
     */
    syncNetworkState = function () {
        return new Promise((resolve, reject) => {
            uni.getNetworkType({
                success(res) {
                    if (res.networkType === 'none') {
                        reject({
                            errMsg: '没有网络'
                        });
                    } else {
                        resolve(res.networkType);
                    }
                }
            });
        });
    };

    /**
     * 下载文件
     */
    downloadFile = function ({url, success, fail}) {
        uni.downloadFile({
            url: url.indexOf('http') === 0 ? url : host + url,
            success(res) {
                if (res.statusCode === 200) {
                    if (success) success(res);
                } else {
                    if (fail)
                        fail({
                            errMsg: '服务器异常'
                        });
                }
            },

            fail: fail
        });
    };

    /**
     * 同步下载
     */
    syncDownloadFile = function ({url}) {
        return new Promise((resolve, reject) => {
            that.downloadFile({
                url: url,
                success: function (res) {
                    resolve(res);
                },
                fail: function (e) {
                    reject(e);
                }
            });
        });
    };

    /**
     * 解析加密信息
     */
    _analyzeInfo(type,iv, ciphertext) {
        switch (type) {
            case 'AES_USER_KEY':
                return AESUtil.decryptBase64({
                    iv:iv,
                    key: Config.getConfig().aesKey,
                    ciphertext: ciphertext
                });
            case 'AES_APP_SECRET':
                return AESUtil.decryptBase64({
                    iv:iv,
                    key: Config.getConfig().appSecret,
                    ciphertext: ciphertext
                });

            case 'RSA':
                return RSAUtil.decrypt({
                    privateKey: Config.getConfig().rsaPrivateKey,
                    ciphertext: ciphertext
                });

            default:
                return null;
        }
    }
}

Network.getInstance = function () {
    let netWork;

    if (!netWork) {
        netWork = new Network();
    }

    return netWork;
};

export default {
    post: Network.getInstance().post,
    get: Network.getInstance().get,
    syncNet: Network.getInstance().syncNet,
    syncGet: Network.getInstance().syncGet,
    uploadFile: Network.getInstance().uploadFile,
    syncUploadFile: Network.getInstance().syncUploadFile,
    syncNetworkState: Network.getInstance().syncNetworkState,
    downloadFile: Network.getInstance().downloadFile,
    syncDownloadFile: Network.getInstance().syncDownloadFile,
};
