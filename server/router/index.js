const express = require('express')
const router = express.Router()

// 引入fly.js
var Fly = require("flyio/src/node")
var fly = new Fly;

var jwt = require('jsonwebtoken')

const indexData = require('../data/index.json')
const indexCateList = require('../data/indexCateList.json')
const categoryData = require('../data/categoryData.json')


router.get('/',(req,res)=>{
	res.send('ok')
})

router.get('/getIndexData',(req,res)=>{
	res.send({
		status: 200,
		data: indexData
	})
})

router.get('/getCateList',(req,res)=>{
	res.send({
		status: 200,
		data: indexCateList
	})
})

router.get('/getCategoryData',(req,res)=>{
	res.send({
		status: 200,
		data: categoryData
	})
})

router.get('/getOpenId',async (req,res)=>{
	// 1、接受请求参数
	const code = req.query.code;
	// 2、整合数据对接微信服务器
	const appId='xxxxxxxxxxxxxxxx';
	const appSecret='xxxxxxxxxxxxxxxxxxxxx';
	const url=`https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
	const result = await fly.get(url);
	console.log(result);
	console.log("***************************************************************");
	console.log(result.data);
	const openId = JSON.parse(result.data).openid;
	console.log('openid',openId);
	// 3、接收到微信服务器返回的openId,结合当前用户数据，加密生成token
	const info={
		openId,
		name:"忘川",
		age:1314
	}
	// 加密
	var token = jwt.sign({foo:info},'miyao');
	console.log(token);
	// 解密
	// const res2 = jwt.verify(token,'miyao')
	// console.log(res2);
	// 4、返回给浏览器当前用户加密后的唯一标识
	res.send({
		token
	})
})

module.exports = router;