<template>
	<view class="detail">
		<view class="header">
			{{goodItem.goodDesc}}
		</view>
		<scroll-view scroll-y="true" class="detailScroll">
			<image class="img" :src="goodItem.picUrl" mode=""></image>
			<view class="tag">{{goodItem.goodName}}</view>
			<view class="price">￥ {{goodItem.goodPrice}}</view>
			<!-- 描述区 -->
			<view class="list">
				<view class="listItem1">100%桑蚕丝填充，丝丝精粹不掺杂</view>
				<view class="listItem2">创新井字拉网工艺，桑蚕丝不易黏连结块</view>
				<view class="listItem3">两种面料可选，贡缎手感细腻，竹棉清爽透气</view>
				<view class="listItem4">两种面料可选，贡缎手感细腻，竹棉清爽透气</view>
				<view class="listItem5">两种面料可选，贡缎手感细腻，竹棉清爽透气</view>
				<view class="listItem6">两种面料可选，贡缎手感细腻，竹棉清爽透气</view>
				<view class="listItem7">两种面料可选，贡缎手感细腻，竹棉清爽透气</view>
				<view class="listItem8">两种面料可选，贡缎手感细腻，竹棉清爽透气</view>
				<view class="listItem9">两种面料可选，贡缎手感细腻，竹棉清爽透气</view>
			</view>
		</scroll-view>
		<!-- 底部 -->
		<view class="footer">
			<image src="/static/img/kefu.png" mode=""></image>
			<view class="btn">立即购买</view>
			<view class="btn cart" @click="addToCart">加入购物车</view>
		</view>
	</view>
</template>

<script>
import { mapMutations } from 'vuex';
import { mapMutation } from 'vuex'
	export default {
		data() {
			return {
				goodItem:{}, // 当前商品对象
			};
		},
		onLoad(options) {
			//console.log(JSON.parse(options.goodItem));
			this.goodItem = JSON.parse(options.goodItem)
		},
		methods:{
			...mapMutations('cart',['addGoodItemMutation']),
			addToCart(){
				this.addGoodItemMutation(this.goodItem)
			}
		}
	}
</script>

<style lang="stylus">
.detail
	.header
		width 570rpx
		height 90rpx
		line-height 90rpx
		text-align center
		margin 0 auto
		color red
	.detailScroll
		height calc(100vh - 90rpx - 100rpx)
		image
			width 100%
			height 750rpx
		.tag
			width 90%
			height 100rpx
			line-height 100rpx
			background-color #bb2c08
			margin 20rpx auto
			text-align center
			color #fff
			font-size 30rpx
			border-radius 10rpx
		.price
			font-size 50rpx
			color #dd1a21
			line-height 70rpx
			margin-left 5%	
		.list
			margin-left 5%
			font-size 28rpx
			line-height 50rpx
	.footer
		display flex
		position fixed
		bottom 0
		left 0
		right 0
		border-top 2rpx solid #ccc
		height 100rpx
		line-height 100rpx
		image
			width 60rpx
			height 60rpx
			margin 20rpx 40rpx
		.btn
			flex 2
			border-left 2rpx solid #ccc
			text-align center
			&.cart
				background-color #dd1a21
				color #fff
</style>
