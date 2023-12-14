<template>
	<view class="cart">
		<scroll-view scroll-y="true" class="cartScroll">
			<view class="cartList">
				<view class="cartItem" v-for="(item,index) in cartList" :key="index">
					<!-- 选中区 -->
					<view class="iconfont icon-zhengque" :class="{selected:item.isSelected}" @click="changeSelect(item.isSelected,index)"></view>
					<!-- 右侧商品区 -->
					<view class="goodItem">
						<image :src="item.picUrl" mode=""></image>
						<view class="goodInfo">
							<view class="name">{{item.goodName}}</view>
							<view class="price">￥ {{item.goodPrice}}</view>
						</view>
					</view>
					<!-- 数量控制区 -->
					<view class="countCtrl">
						<text class="sub" @click="changeCount(false,index)">-</text>
						<text class="count">{{item.count}}</text>
						<text class="add" @click="changeCount(true,index)">+</text>
					</view>
				</view>
			</view>
		</scroll-view>
		<view class="footer">
			<view class="iconfont icon-zhengque" :class="{selected:isAllSelected}" @click="changeAllSelect(!isAllSelected)"></view>
			<text class="selected">已选 {{totalCount}}</text>
			<text class="btn total">合计:￥{{totalPrice}}</text>
			<text class="btn order">下单</text>
		</view>
	</view>
</template>

<script>
	import { mapState,mapMutations,mapGetters } from 'vuex'
	export default {
		data() {
			return {
				
			};
		},
		mounted() {
			//this.$store.data.cart.cartList
		},
		computed:{
			...mapState({
				 cartList:state=>state.cart.cartList
			}),
			...mapGetters('cart',['isAllSelected','totalCount','totalPrice'])
		},
		methods:{
			...mapMutations('cart',['changeCountMutation','changeSelectMutation','changeAllSelected']),
			changeCount(addORsub,index){
				this.changeCountMutation({addORsub,index})
			},
			changeSelect(isSelected,index){
				this.changeSelectMutation({isSelected,index})
			},
			changeAllSelect(isAllSelected){
				this.changeAllSelected(isAllSelected)
			}
		}
	}
</script>

<style lang="stylus">
.cart
	background-color #f5f5f5
	.cartScroll
		height calc(100vh - 100rpx)
		.cartList
			.cartItem
				position relative
				width 100%
				height 172rpx
				margin-top 20rpx
				background-color #fff
				padding 20rpx
				display flex
				.iconfont
					height 172rpx
					font-size 40rpx
					line-height 172rpx
					&.selected
						color #dd1a21
				.goodItem
					display flex
					image
						width 172rpx
						height 172rpx
						//background-color: red
						margin 0 20rpx
					.goodInfo
						.name
							font-size 34rpx
							margin 10rpx
						.price
							color red
							font-size 34rpx
				.countCtrl
					position absolute
					right 60rpx
					bottom 30rpx
					text
						border 2rpx solid #ddd
						padding 8rpx 24rpx
						&:nth-child(2)
							border none
							border-top 2rpx solid #ddd
							border-bottom 2rpx solid #ddd
	.footer
		border-top 2rpx solid #ddd
		display flex
		position fixed
		bottom 0
		left 0
		right 0
		width 100%
		height 100rpx
		line-height 100rpx
		.iconfont
			margin-left 10rpx
			&.selected
				color #dd1a21
		.selected
			margin-left 10rpx
		.btn
			text-align: center
			position absolute
		.total
			margin-left 50rpx
			height 100rpx
			width 200rpx
			right 200rpx
		.order
			height 100rpx
			width 200rpx
			right 0
			background-color red
			color #fff
				
</style>
