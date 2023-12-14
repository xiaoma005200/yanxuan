module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  //请求到api时转发到的后端地址
        ws: true,
        changeOrigin: true, //允许跨域
		pathRewrite:{ //路径重写
			'^/api': ''  //将/api匹配为空
		}
      }
    }
  },
  lintOnSave: false //取消严格模式
}