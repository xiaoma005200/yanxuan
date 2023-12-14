class Config {

	constructor() {
		this.token = null;
		this.appId = null;
		this.appSecret = null;
		this.qrCodeUrl = null;
		this.rsaPrivateKey = null;
		this.aesKey = null;
	}

	getConfig = function() {
		return {
			// 'httpUrl': 'http://192.168.119.14:9009/api',
			//'httpUrl': 'http://192.168.0.106:9010/api',
			//httpUrl: 'http://localhost:9010/api',
			// httpUrl: 'http://notice.witsystem.top/api',
			httpUrl: 'https://locksys.top/api',
			mqttUrl: 'wx://localhost:8083/mqtt',
			// httpUrl: 'https://v2.witsystem.top',
			// qrCodeUrl: this.qrCodeUrl ? this.qrCodeUrl : 'https://v2.witsystem.top/yundou',
			qrCodeUrl: this.qrCodeUrl ? this.qrCodeUrl : 'https://v2.witsystem.top/gold/lock/',
			//'mqttUrl': 'wxs://mqtt.witsystem.top/mqtt',
			//'mqttUrl': 'wxs://localhost:8084/mqtt',
			token: this.token,
			appId: this.appId,
			appSecret: this.appSecret,
			rsaPrivateKey: this.rsaPrivateKey,
			aesKey: this.aesKey
		};
	};


	/**
	 * 更新参数
	 * @param appId
	 * @param appSecret
	 * @param token
	 * @param qrCodeUrl 在生成二维码的时候使用的url 比如面对面分享 和设备二维码
	 * @param rsaPrivateKey rsa 签名私钥
	 * @param aesKey 登录成功之后返回的加密密钥
	 */
	updateParameter = function({
		appId,
		appSecret,
		token,
		qrCodeUrl,
		rsaPrivateKey,
		aesKey
	}) {
		this.appId = appId;
		this.appSecret = appSecret;
		this.token = token;
		this.qrCodeUrl = qrCodeUrl;
		this.rsaPrivateKey = rsaPrivateKey;
		this.aesKey = aesKey;
	};
}

Config.getInstance = function() {
	let config;
	if (!config) {
		config = new Config();
	}
	return config;
};

export default Config.getInstance();