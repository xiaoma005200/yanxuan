<template>
	<view class="category">
		<!-- 头部搜索框 -->
		<view class="header">
			<view class="search">
				商品搜索
			</view>
		</view>
		<!-- 内容区 -->
		<view class="content"> 
			<!-- 左侧菜单栏 -->
			<view class="left">
				<scroll-view scroll-y="true" class="menuScroll">
					<view class="menuItem" :class="{active:index===menuIndex}" @click="changeMenuIndex(index)" v-for="(item,index) in categoryData" :key="item.id">{{item.name}}</view>
				</scroll-view>
			</view>
			<!-- 右侧滚动区域 -->
			<view class="right">
				<scroll-view scroll-y="true" class="contentScroll">
					<!-- 大图 -->
					<image class="categoryImg" :src="categoryItem.BigImgUrl" mode=""></image>
					<!-- 商品列表 -->
					<view class="goodList">
						<view class="goodItem" v-for="item in categoryItem.subCateList">
							<image class="goodImg" :src="item.picUrl" mode=""></image>
							<view class="goodName">{{item.picDesc}}</view>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
	import request from "@/utils/request.js"
	export default {
		data() {
			return {
				categoryData:[],
				menuIndex:0 //当前菜单下标
			};
		},
		mounted() {
			this.getCategoryData()
		},
		computed:{ //计算属性
			categoryItem(){
				return this.categoryData[this.menuIndex];
			}
		},
		methods:{
			async getCategoryData(){
				const res = await request('/getCategoryData')
				this.categoryData = res.data
			},
			changeMenuIndex(index){
				this.menuIndex = index;
			}
		}
	}
</script>

<style lang="stylus">
.category
	.header
		padding 20rpx 0
		.search
			height 60rpx
			width 90%
			margin 0 auto //设置水平居中,0 是上下边距，而 auto 是左右边距。
			line-height 60rpx //每行文字的高度为 60rpx
			font-size 30rpx
			text-align center
			border-radius 4rpx
			background-color #ddd
	.content
		display flex
		height calc(100vh - 102rpx) //动态获取屏幕高度60+20+20+2
		border-top 2rpx solid #333 //上横线
		.left
			width 20%
			height 100%
			border-right 2rpx solid #333
			.menuScroll
				height calc(100vh - 102rpx) //动态获取屏幕高度60+20+20+2
				.menuItem
					position relative //相对于元素自身原本的位置进行定位
					height 60rpx
					line-height 60rpx
					font-size 30rpx
					text-align center
					&.active::before //父级引用
						content ""
						width 4rpx
						height 30rpx
						background-color red
						position absolute //设置绝对布局
						left 6rpx
						top 15rpx
		.right
			width 80%
			height calc(100vh - 102rpx) //动态获取屏幕高度60+20+20+2
			.contentScroll
				height calc(100vh - 102rpx)
				.categoryImg
					width 520rpx
					height 200rpx
					display block //转成块级元素
					margin 20rpx auto
				.goodList
					display flex
					flex-wrap wrap //允许换行
					.goodItem
						width 33.3%
						height 200rpx
						text-align center
						.goodImg
							width 90%
							height 140rpx
						.goodName
							font-size 26rpx
							white-space pre-wrap //换行
							overflow hidden //超出部分 - 隐藏
							text-overflow ellipsis //超出部分 - 用...显示
							display -webkit-box
							-webkit-box-orient vertical //对齐方式 - 竖直对齐
							-webkit-line-clamp 1 //超出2行部分显示为...
							
					
					
				
</style>
