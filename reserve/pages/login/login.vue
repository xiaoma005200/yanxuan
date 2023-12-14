<template>
	<view class="login">
		<view class="up">
			<view class="dltext">登录</view>

			<!-- 账户 -->
			<view class="count">
				<image class="phoneImg" src="/static/img/phone.png"></image>
				<input placeholder="请输入手机号" />
			</view>

			<!-- 密码 -->
			<view class="password">
				<image class="passwordImg" src="/static/img/lock.png"></image>
				<input placeholder="请输入密码" />
				<image class="eye" src="/static/img/open-eye.png"></image>
			</view>

			<!-- 注册和忘记密码  -->
			<view class="regist">
				<view class="zhuce">立即注册</view>
				<view class="wangjimima">忘记密码</view>
			</view>

			<!-- 登录按钮 -->
			<view class="login-btn">
				<button class="btn-login" type="primary">登录</button>
			</view>

			<!-- 协议区  xieyi -->
			<view class="xieyi">
				<checkbox class="isXY"></checkbox>
				<view class="text-xy">同意小程序的《使用协议》</view>
			</view>
		</view>

		<!-- 提示框  使用以下方式登录 -->
		<view class="other-login">
			<view class="line"></view>
			<view class="lText">您还可以使用以下方式登录</view>
			<view class="line"></view>
		</view>

		<!-- qq  weixin  weibo  图标展示view -->
		<view class="Icon">
			<image src="/static/img/QQ.png"></image>
			<image src="/static/img/vx.png" mode="aspectFill" @click="getUser"></image>
			<image src="/static/img/wb.png"></image>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {};
	},
	methods: {
		getUser() {
			wx.getUserProfile({
				desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
				success: (res) => {
					// 存储用户信息
					wx.setStorage({
						key: 'userInfo',
						data: JSON.stringify(res.userInfo)
					});
					// 页面跳转到个人中心
					wx.reLaunch({
						url: '/pages/personal/personal'
					});
				}
			});
		}
	}
};
</script>

<style lang="stylus">
.login
	display block
	position absolute
	height 100%
	width 100%
	background #356363
	.up
		position relative
		margin-top 150rpx
		left 100rpx
		width 545rpx
		height 750rpx
		background #FFFFFF
		border-radius 50rpx
		.dltext
			margin-top 50rpx
			position absolute
			margin-left 80rpx
			width 150rpx
			height 100rpx
			font-size 60rpx
			font-family Helvetica
			color #000000
			line-height 100rpx
			letter-spacing 2rpx
		.count
			margin-top 200rpx
			margin-left 35rpx
			position absolute
			display flex
			width 450rpx
			height 80rpx
			border-bottom 3rpx solid rgb(58,57,57)
			.phoneImg
				margin-top 5rpx
				margin-left 30rpx
				width 55rpx
				height 55rpx
			input
				width 200rpx
				font-size 25rpx
				margin-top 15rpx
				margin-left 30rpx
		.password
			margin-top 400rpx
			margin-left 35rpx
			position absolute
			display flex
			width 450rpx
			height 80rpx
			border-bottom 3rpx solid rgb(58,57,57)
			.passwordImg
				margin-top 5rpx
				margin-left 30rpx
				width 55rpx
				height 55rpx
			input
				width 200rpx
				font-size 25rpx
				margin-top 15rpx
				margin-left 30rpx
			.eye
				margin-top 5rpx
				margin-left 65rpx
				width 55rpx
				height 55rpx
		.regist
			font-size 25rpx
			margin-left 85rpx
			width 370rpx
			margin-top 540rpx
			position absolute
			display flex
			justify-content space-between
		.login-btn
			width 350rpx
			height 50rpx
			position absolute
			margin-top 600rpx
			margin-left 85rpx
			button
				padding 0rpx
				line-height 50rpx
				font-size 25rpx
				width 100%
				height 100%
				border-radius 30rpx
		.xieyi
			margin-left 10rpx
			margin-top 680rpx
			width 400rpx
			display flex
			position absolute
			.isXY
				margin-left 85rpx
				/* 修改复选框的大小 */
				transform scale(.6)
			.text-xy
				margin-left 10rpx
				margin-top 20rpx
				color #000000
				font-size 18rpx
	.other-login
		padding-left 100rpx
		display flex
		position relative
		width 100%
		height 60rpx
		padding-top 50rpx
		.line
			margin-left 5rpx
			margin-top 18rpx
			width 120rpx
			height 3rpx
			background-color #FFFFFF
		.lText
			color #FFFFFF
			font-size 25rpx
	.Icon
		margin-top 10rpx
		padding-top 50rpx
		position relative
		display flex
		width 100%
		height 50rpx
		image
			padding-left 120rpx
			width 80rpx
			height 80rpx
</style>
