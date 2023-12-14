import Vue from 'vue'
const state = { // 映射为计算属性
	cartList: [{
			"id": 1001,
			"isSelected": false,
			"count": 2,
			"goodName": "生活礼包",
			"goodDesc": "居家除味无死角家庭多功能净味生活礼包",
			"goodPrice": 109,
			"picUrl": "http://localhost:3000/public/images/jjsh/jjsh1.png",
			"number": 10
		},
		{
			"id": 1002,
			"isSelected": true,
			"count": 2,
			"goodName": "防静电喷雾",
			"goodDesc": "深夜徐老师推荐衣物除味防静电喷雾",
			"goodPrice": 12.9,
			"picUrl": "http://localhost:3000/public/images/jjsh/jjsh2.png",
			"number": 10
		}
	]
}

const mutations = { // 映射为方法
	/**
	 * 添加商品进购物车
	 * @param {Object} state
	 * @param {Object} goodItem
	 */
	addGoodItemMutation(state, goodItem) {
		const item = state.cartList.find(item => item.id === goodItem.id)
		if (item) { // item不为空
			item.count += 1;
		} else { // 首次添加
			// goodItem.count = 1
			// goodItem.isSelected = true
			Vue.set(goodItem, 'count', 1);
			Vue.set(goodItem, 'isSelected', true);
			state.cartList.push(goodItem);
		}
	},
	/**
	 * 修改商品数量
	 */
	changeCountMutation(state, {
		addORsub,
		index
	}) {
		if (addORsub) { // true添加
			state.cartList[index].count += 1;
		} else { // false减少
			if (state.cartList[index].count > 1) {
				state.cartList[index].count -= 1;
			} else {
				uni.showModal({
					title: '提示',
					content: '是否需要删除本商品',
					success: function(res) {
						if (res.confirm) {
							state.cartList.splice(index, 1) // 删除
						}
					}
				});
			}
		}
	},
	/**
	 * 切换商品选中状态
	 */
	changeSelectMutation(state, {
		isSelected,
		index
	}) {
		state.cartList[index].isSelected = !(isSelected)
	},
	/**
	 * 设置商品全选or全不选
	 * @param {Object} isAllSelected
	 */
	changeAllSelected(state, isAllSelected) {
		state.cartList.forEach(item => item.isSelected = isAllSelected)
	}

}

const actions = {

}

const getters = { // 映射为计算属性
	/**
	 * 判断商品是否全选？isSelected全true为真，有false为假
	 * 简写：item=>item.isSelected==true
	 * @param {Object} state
	 */
	isAllSelected(state) {
		return state.cartList.every(item => item.isSelected)
	},
	/**
	 * 计算选中商品的总数量
	 * @param {Object} state
	 */
	totalCount(state) {
		return state.cartList.reduce((sum, item) => {
			// return sum += item.isSelected ? item.count : 0
			if (item.isSelected) {
				sum += item.count
			}
			return sum;
		}, 0)
	},
	/**
	 * 计算选中商品的总价格
	 * @param {Object} state
	 */
	totalPrice(state) {
		return state.cartList.reduce((sum, item) => {
			return sum += item.isSelected ? item.goodPrice * item.count : 0
		}, 0)
	}

}

export default {
	namespaced: true,
	state,
	mutations,
	actions,
	getters
}