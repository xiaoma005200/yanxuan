import base from '@/utils/base.js';

export default (url, data = {}, method = 'GET') => {
  return new Promise((resolve, reject) => {
    uni.request({
      url: base.host + url, //请求地址-小程序请求写法
	  //url,   //H5请求地址
      data,
      method,
      success: (res) => {
        resolve(res.data);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};
