/**
 * AES  模式用的是ECB  padding是 PKCS7Padding
 *
 * 注意事项
 * 1.必须注意需要加密的数据的是什么格式，比如hex 或者base64的格式
 * 2.密钥也需要注意hex格式还是字符串格式
 *
 */
const Aes = require('../ble/aes.js');
const RSA = require('./Rsa');

/**
 * 字符串解密方法 只能解密base64的字符串
 * @param key 密钥必须是字符串
 * @param str 解密的数据 当前界面的字符串必须是base64字符串
 * @returns {string|null}
 */

function decryptBase64({key, iv, ciphertext}) {
    try {
        let CryptoJS = Aes.CryptoJS;
        const encKey = CryptoJS.enc.Utf8.parse(key); //注意选择key字符的类型，key 是16进制字符串应该这么写(CryptoJS.enc.Hex.parse(key))，或者key是字符串（CryptoJS.enc.Utf8.parse(key)）
        const encIv = CryptoJS.enc.Utf8.parse(iv); //该函数直接将16进制字符串转成byte
        const encryptedHexStr = CryptoJS.enc.Base64.parse(ciphertext); //这里需要注意的是界面字符串是16进制字符串（CryptoJS.enc.Hex.parse(str)）  还是 base64字符串（CryptoJS.enc.Base64.parse(str)）

        const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
        const decrypt = CryptoJS.AES.decrypt(srcs, encKey, {
            iv: encIv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
        return decryptedStr.toString();
    } catch (e) {
        console.log("错误信息", e);
        return null;
    }

}

/**
 * 只能界面hex字符串
 * @param key 密钥必须是字符串
 * @param str
 * @returns {string}
 */

function decryptHex({key, iv, ciphertext}) {
    let CryptoJS = Aes.CryptoJS;
    const encKey = CryptoJS.enc.Utf8.parse(key); //注意选择key字符的类型，key 是16进制字符串应该这么写(CryptoJS.enc.Hex.parse(key))，或者key是字符串（CryptoJS.enc.Utf8.parse(key)）
    const encIv = CryptoJS.enc.Utf8.parse(iv); //该函数直接将16进制字符串转成byte
    const encryptedHexStr = CryptoJS.enc.Hex.parse(ciphertext); //这里需要注意的是界面字符串是16进制字符串（CryptoJS.enc.Hex.parse(str)）  还是 base64字符串（CryptoJS.enc.Base64.parse(str)）

    const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
    const decrypt = CryptoJS.AES.decrypt(srcs, encKey, {
        iv: encIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
    return decryptedStr.toString();
}

/**
 * 加密方法
 * @param key 密钥 字符串
 * @param iv
 * @param data 加密的数据
 * 加密返回的是base64
 */

function encryptBase64({key, iv, data}) {
    let CryptoJS = Aes.CryptoJS;
    const encKey = CryptoJS.enc.Utf8.parse(key);
    const encIv = CryptoJS.enc.Utf8.parse(iv);
     console.log("长度》》》》》》》》》》》", encIv)
    //const encIv = StrUtils.hexStringToByteArray(iv);
    const srcs = CryptoJS.enc.Utf8.parse(data);
    const encrypted = CryptoJS.AES.encrypt(srcs, encKey, {
        iv: encIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }); //return encrypted.ciphertext.toString().toUpperCase();

    return RSA.hex2b64(encrypted.ciphertext.toString().toUpperCase());
}

/**
 * 加密方法
 * @param key 密钥 字符串
 * @param iv
 * @param data 加密的数据
 * 加密返回的是 hex
 */

function encryptHex({key, iv, data}) {
    let CryptoJS = Aes.CryptoJS;
    const encKey = CryptoJS.enc.Utf8.parse(key);
    const encIv = CryptoJS.enc.Utf8.parse(iv); //该函数直接将16进制字符串转成byte
    const srcs = CryptoJS.enc.Utf8.parse(data);
    const encrypted = CryptoJS.AES.encrypt(srcs, encKey, {
        iv: encIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.ciphertext.toString().toUpperCase();
}


/**
 * 生成IV
 * @returns {string}
 */

function generateRandomIV() {
    const randomValues = Aes.CryptoJS.lib.WordArray.random(8);
    return  randomValues.toString();
}

module.exports = {
    decryptBase64: decryptBase64,
    decryptHex: decryptHex,
    encryptBase64: encryptBase64,
    encryptHex: encryptHex,
    generateRandomIV: generateRandomIV

};
