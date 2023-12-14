/*全局 app.js*/
<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

/*全局 app.wxss*/
<style>
	/*每个页面公共css */
	@import url("/static/iconfont/iconfont.styl");
</style>
