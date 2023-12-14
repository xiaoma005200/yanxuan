import request from '../../utils/request.js'

const state = {
	test: "测试数据",
	indexData:{}, //首页数据
}

const mutations = {
	changeIndexDataMutations(state,indexData){ //修改首页数据
		state.indexData = indexData;
	}
}

const actions = {
	async getIndexDataActions({commit}){ //发送网络请求，获取首页数据
		// 1、执行异步任务，发送网络请求
		const res = await request('/getIndexData');
		// 2、commit触发mutation
		commit('changeIndexDataMutations',res.data)
	}
}

const getters = {
	
}

export default {
	namespaced: true,
	state,
	mutations,
	actions,
	getters
}