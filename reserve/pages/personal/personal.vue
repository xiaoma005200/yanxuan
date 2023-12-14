<template>
	<view class="personal">
		<view class="header">
			<!-- 登录显示 -->
			<view v-if="userInfo.nickName">
				<image class="userAvotar" :src="userInfo.avatarUrl" mode=""></image>
				<text class="nickName">{{ userInfo.nickName }}</text>
				<button class="exit" @click="exit" 	size="mini">退出登录</button>
			</view>

			<!-- 未登录显示 -->
			<view v-else>
				<!-- 默认头像 -->
				<image class="userAvotar" src="/static/img/userAvotar.png" mode=""></image>
				<text class="toLogin" @click="toLogin">去登录</text>
			</view>
		</view>
	</view>
</template>

<script>
import request from '@/utils/request.js'
export default {
	data() {
		return {
			userInfo:{}, // 用户对象
		};
	},
	mounted() {
		// 从本地存储中获取用户信息
		wx.getStorage({
			key: "userInfo",
			success: (res) => {
				if (res.data) {
				this.userInfo = JSON.parse(res.data);
				}
			},
			fail: (error) => {
				console.error('获取本地存储失败', error);
			}
		});
		// 调用接口获取登录凭证
		wx.login({
			success: async (res)=>{
				if(res.code){
					console.log(res.code);
					let code = res.code
					// 发起网络请求到开发者服务器
					const token = await request('/getOpenId',{code})
					console.log(token);
				}else{
					console.log('登录失败！' + res.errMsg);
				}
			}
		})
	},
	methods:{
		toLogin(){
			// 关闭所有页面，打开到应用内的某个页面。
			wx.reLaunch({
				url: '/pages/login/login'
			})
		},
		exit(){
			// 清空本地存储
			wx.removeStorage({
				key: 'userInfo',
				success (res) {
			    console.log(res)
			  }
			})
			// 回到个人中心
			wx.reLaunch({
				url: '/pages/personal/personal'
			})
		}
	}
}
</script>

<style lang="stylus">
.personal
	.header
		height 200rpx
		line-height 200rpx
		background-color #FFE4B5
		display flex
		.userAvotar
			width 100rpx
			height 100rpx
			vertical-align middle
			margin 30rpx
		.toLogin
			font-size 30rpx
		button
			position absolute
			top 80rpx
			left 550rpx
			
</style>
