const RSA = require('./Rsa'); // 加签

function createdSign({ privateKey, data }) {
    let sign_rsa = new RSA.RSAKey();
    sign_rsa = RSA.KEYUTIL.getKey(privateKey);
    const hashAlg = 'sha256';
    let sign = sign_rsa.signString(data, hashAlg);
    sign = RSA.hex2b64(sign); // hex 转 b64

    return sign;
} // 验签

function validateSign({ publicKey, data, sign }) {
    let verify_rsa = new RSA.RSAKey();
    verify_rsa = RSA.KEYUTIL.getKey(publicKey);
    sign = RSA.b64tohex(sign);
    return verify_rsa.verifyString(data, sign);
} //加密

function encrypt({ publicKey, data }) {
    let encrypt_rsa = new RSA.RSAKey();
    encrypt_rsa = RSA.KEYUTIL.getKey(publicKey);
    let encStr = encrypt_rsa.encrypt(data);
    return RSA.hex2b64(encStr);
} //解密

function decrypt({ privateKey, ciphertext }) {
    let decrypt_rsa = new RSA.RSAKey();
    decrypt_rsa = RSA.KEYUTIL.getKey(privateKey);
    let encStr = RSA.b64tohex(ciphertext);

    try {
        if (encStr.length > 512) {
            let ct_1 = '';
            const lt = encStr.match(/.{1,512}/g); // 128位解密。取256位,但是是16进制字符串所以取512个字符串

            lt.forEach(function (entry) {
                ct_1 += decrypt_rsa.decrypt(entry);
            });
            return _isBase64(ct_1) ? RSA.b64toutf8(ct_1) : ct_1; //判断字符串解密好的字符串是否是base64 如果是进行base解码 自定义功能
        }

        let decrypt = decrypt_rsa.decrypt(encStr);
        return _isBase64(decrypt) ? RSA.b64toutf8(decrypt) : decrypt; //判断字符串解密好的字符串是否是base64 如果是进行base解码 自定义功能
    } catch (ex) {
        console.log(ex);
        return false;
    }
}
/**
 * 判断字符串是否是base64的字符串
 */

function _isBase64(str) {
    const re = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/;
    return re.test(str);
}

export default {
    createdSign: createdSign,
    validateSign: validateSign,
    encrypt: encrypt,
    decrypt: decrypt
};
