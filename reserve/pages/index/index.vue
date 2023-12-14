<template>
	<view class="indexContainer">
		<!-- 头部 -->
		<view class="header">
			<image class="logo" src="/static/img/logo.png" mode=""></image>
			<view class="search">
				<text class="iconfont icon-sousuo"></text>
				<input type="text" placeholder="搜索..." placeholder-class="placeholder" />
			</view>
			<button type="default">提交</button>
		</view>
		<!-- 滑块 横向布局 -->
		<scroll-view class="navScoll" scroll-x="true" enable-flex v-if="indexData.firstList">
			<view class="navItem" :class="{ active: navIndex === -1 }" @click="changeIndex(-1,-1)">推荐</view>
			<view class="navItem" :class="{ active: navIndex === index }" @click="changeIndex(index,item.id)" v-for="(item, index) in indexData.firstList" :key="item.id">
				{{ item.name }}
			</view>
		</scroll-view>

		<!-- 内容区 纵向布局-->
		<scroll-view scroll-y="true">
			<Recommend v-if="navIndex===-1"></Recommend>
			<cateList v-else :L1Id="L1Id"></cateList>
		</scroll-view>
	</view>
</template>

<script>
import request from '@/utils/request.js';
import { mapActions, mapState } from 'vuex';
export default {
	data() {
		return {
			L1Id: -1, // 当前元素下标
			navIndex: -1 // 高亮唯一索引
		};
	},
	onLoad() {},
	computed: {
		//...mapState('home',['indexData'])
		...mapState({
			indexData: (state) => state.home.indexData
		})
	},
	created() {
		this.getIndexDataActions();
	},
	methods: {
		...mapActions('home', ['getIndexDataActions']),
		// async getIndexData(){ //获取首页数据
		// 	const res = await request('/getIndexData');  //小程序请求写法
		// 	//const res = await request('/api/getIndexData');  //H5请求写法
		// 	this.indexData = res.data
		// 	console.log(res);
		// },
		changeIndex(index,L1Id) {
			//点击切换下标
			this.navIndex = index;
			this.L1Id = L1Id;
		}
	}
};
</script>

<style lang="stylus" scoped>
.indexContainer
	.header
		display flex
		padding 10rpx 5rpx
		.logo
			width 140rpx
			height 40rpx
			margin 10rpx
		.search
			width 420rpx
			height 60rpx
			background #f5f5f5
			position relative
			input
				width 360rpx
				height 60rpx
				margin-left 60rpx
				.placeholder
					font-size 26rpx
					color #333
			.iconfont
				position absolute
				font-size 40rpx
				left 10rpx
				top 10rpx
		button
			width 144rpx
			height 60rpx
			line-height 60rpx
			text-align center
	.navScoll
		display flex
		height 80rpx
		white-space nowrap //不换行
		.navItem
			display inline-block
			height 40rpx
			padding 10rpx
			font-size 26rpx
			&.active
				color: #BB2C08
				border-bottom 3rpx solid #BB2C08
</style>
