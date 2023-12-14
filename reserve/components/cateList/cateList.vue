<template>
	<view class="cateList">
		<!-- 轮播图 -->
		<!-- 轮播图--{{L1Id}}--{{cateItem.category.parentId}} -->
		<swiper :indicator-dots="true" :autoplay="true" :interval="3000" :duration="1000" v-if="cateItem.category">
			<swiper-item class="swiper" v-for="(item,index) in cateItem.category.bannerUrlList" :key="index">
				<view class="swiper-item">
					<image :src="item.bannerUrL" mode=""></image>
				</view>
			</swiper-item>
		</swiper>
		<!-- 文字区 -->
		<view class="title">
			{{cateItem.category.fontName}}
		</view>
		<view class="desc">
			{{cateItem.category.fontDesc}}
		</view>
		<!-- 商品列表 -->
		<view class="goodList">
			<view class="goodItem" v-for="item in cateItem.itemList" :key="item.id" @click="toDetail(item)">
				<image :src="item.picUrl" mode=""></image>
				<view class="goodDesc">{{item.goodDesc}}</view>
				<view class="goodPrice">￥{{item.goodPrice}}</view>
			</view>
		</view>
	</view>
</template>

<script>
import request from '@/utils/request.js'
export default {
	name:"cateList",
	props:['L1Id'],
	data() {
		return {
			cateList: [] //保存数据项的分类列表
		};
	},
	created() {
		this.getCateList()
	},
	methods:{
		async getCateList(){
			const res = await request('/getCateList')
			this.cateList = res.data
			console.log(res);
		},
		toDetail(goodItem){ // 点击跳转到详情页面
			wx.navigateTo({
				url:"/pages/detail/detail?goodItem=" + JSON.stringify(goodItem)
			})
		}
	},
	computed:{
		cateItem(){ //获取当前分类的数据项
			return this.cateList.find(item=>item.category.parentId===this.L1Id)
		}
	}
}
</script>

<style lang="stylus">
.cateList
	.swiper
		height 360rpx
		text-align center
		image
			width 100%
			height 360rpx
	.title
		font-size 40rpx
		line-height 80rpx
		text-align center
		color #333
	.desc
		font-size 30rpx
		line-height 40rpx
		text-align center
		color #666
	.goodList
		display flex
		flex-wrap wrap //换行显示
		justify-content space-around //两边相等留白
		&::after
			content ""
			width 344rpx
		.goodItem
			width 344rpx
			height 480rpx
			image
				width 344rpx
				height 344rpx
			.goodDesc
				font-size 30rpx
				white-space pre-wrap //换行
				overflow hidden //超出部分 - 隐藏
				text-overflow ellipsis //超出部分 - 用...显示
				display -webkit-box
				-webkit-box-orient vertical //对齐方式 - 竖直对齐
				-webkit-line-clamp 2 //超出2行部分显示为...
			.goodPrice
				font-size 30rpx
				color #f50027
				
		
</style>