<template>
	<view class="recommend">
		<!-- 轮播图 -->
		<swiper class="swiper" circular :indicator-dots="true" :autoplay="true" :interval="3000"
			:duration="1000">
			<swiper-item>
				<view class="swiper-item"></view>
				<image src="/static/img/slide1.jpg" mode=""></image>
			</swiper-item>
			<swiper-item>
				<view class="swiper-item"></view>
				<image src="/static/img/slide2.jpg" mode=""></image>
			</swiper-item>
			<swiper-item>
				<view class="swiper-item"></view>
				<image src="/static/img/slide3.jpg" mode=""></image>
			</swiper-item>
		</swiper>
		<!-- 三个小图标 -->
		<view class="policyList" v-if="indexData">
			<view class="policyItem" v-for="(item) in indexData.secondList" :key="item.description">
				<image :src="item.icon" mode=""></image>
				<text class="description">{{item.description}}</text>
			</view>
		</view>
		<!-- 十个小图标 -->
		<view class="childList" v-if="indexData" enable-flex>
			<view class="childItem" v-for="item in indexData.firstList" :key="item.id">
				<image :src="item.picUrl" mode=""></image>
				<view class="desc">{{item.name}}</view>
			</view>
		</view>
		<!-- 分类区 -->
		<view class="categoryList">
			<view class="categoryItem" v-for="item in indexData.thirdList" :key="item.id">
				<!-- 大图 -->
				<image class="categoryImg" :src="item.titleImg" mode=""></image>
				<!-- 滑块 横向-->
				<scroll-view class="categoryScroll" scroll-x="true" enable-flex v-if="indexData.thirdList">
					<view class="goodsItem" v-for="goodsItem in item.childList" :key="goodsItem.id">
						<image class="goodsImg" :src="goodsItem.picUrl" mode=""></image>
						<view class="text">{{goodsItem.text}}</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState } from 'vuex'
	export default {
		name:"Recommend",
		data() {
			return {
				
			};
		},
		computed:{
			...mapState({
				indexData:(state)=>state.home.indexData
			})
		}
	}
</script>

<style lang="stylus">
	.recommend
		.swiper
			height 350rpx
			image
				width 100%
				height 350rpx
	.policyList
		display flex
		margin 8rpx
		.policyItem
			flex 1
			image
				height 40rpx
				width 40rpx
				vertical-align middle // 将图片垂直居中对齐
			.description
				font-size 26rpx
	.childList
		display flex
		flex-wrap wrap
		.childItem
			width 20%
			text-align center
			margin 10rpx 0
			image
				width 100rpx
				height 100rpx
				vertical-align middle
			.desc
				font-size 26rpx
				
	
	.categoryList
		.categoryItem
			margin 10rpx 0
			.categoryImg
				height 500rpx
				width 100%
			.categoryScroll
				white-space nowrap
				height 300rpx
				display flex
				.goodsItem
					margin 0 10rpx
					height 300rpx
					.goodsImg
						background-color #f5f5f5
						height 200rpx
						width 200rpx
					.text
						font-size 26rpx
						white-space pre-wrap //换行
						overflow hidden //超出部分 - 隐藏
						text-overflow ellipsis //超出部分 - 用...显示
						display -webkit-box
						-webkit-box-orient vertical //对齐方式 - 竖直对齐
						-webkit-line-clamp 2 //超出2行部分显示为...
</style>