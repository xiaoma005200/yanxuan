const express = require('express')
const router = require('./router/index')
const app = express()

app.use('/public',express.static('public'))
app.use('/',router)

app.listen(3000,()=>{
	console.log("服务已启动");
	console.log("http://localhost:3000");
})