/**
 * 个推信息
 */
import Network from '../net/network';
import GtPush from '../utils/gtpush-min.js'

class GePush {


    /**
     * 注册推送信息
     */
    register = async function () {
        try {

            // // #ifdef APP-PLUS
            //  plus.push.getClientInfoAsync((info) => {
            //      let cid = info["clientid"];
            //      console.log("app推送注册",info );
            //  });
            //  plus.push.addEventListener('click', function(msg){
            //      // 分析msg.payload处理业务逻辑
            //      console.log("app推送点击事件",msg );
            //  }, false );
            //  plus.push.PushReceiveCallback('click', function(msg){
            //      // 分析msg.payload处理业务逻辑
            //      console.log("app推送点击事件",msg );
            //  }, false );
            // // #endif

            let that = this;
            GtPush.setDebugMode(true)
            GtPush.init({
              //  appid: "gwwxjINugsAqzKBbBDvsJ6",
                appid: "OpVK4VYE5S7U5CfTRxeo6A",
                onClientId: async (res) => {
                    console.log('推送客户端IDonClientId = ' + res.cid)
                    await Network.syncNet({url: "/v2/notice/register/cid", data: {cid: res.cid}});
                },
                onlineState: (res) => {
                    console.log('推送在线onlineState = ' + res.online)
                },
                onPushMsg: async (res) => {
                    console.log('收到推送消息onPushMsg = ', res)
                    let parse = JSON.parse(res.message);
                    if (parse.title) { //判断如果是通知去读取详细信息
                        uni.showModal({title: res.title, content: res.content, showCancel: false});
                        let newVar = await Network.syncNet({
                            url: "/v2/notice/read/specify/notice",
                            data: {noticeUuid: res.payload.noticeUuid}
                        });//读取通知详细信息
                        that._notifyObserver({type: "notice", data: newVar.data.data});
                    } else {
                        that._notifyObserver({type: "transmission", data: parse});
                    }
                },
                onError: (res) => {
                    console.log("推送异常", res);
                    //_this.messages += "onError: " + res.error + "\n"
                }
            })
            console.log("注册推送消息成功");
        } catch (error) {
            console.log("注册推送消息失败", error);
        }
    }


    /**
     * 关闭推送消息
     *
     */
    logoutCid = async function () {
        try {
            //  uni.offPushMessage()
            //await Network.syncNet({url: "/v2/notice/logout/cid", data: {}});
        } catch (error) {
            console.log("关闭推送消息失败", error);
        }
    }


    //通知观察者
    //添加setTimeout是为了防止观察者被使用者阻塞，导致无法接受到新的消息
    _notifyObserver = function ({type, data}) {
        uni.$emit("witsystemOnPush", {type: type, data: data});
    };


}

GePush.getInstance = function () {
    let gePush;
    if (!gePush) gePush = new GePush();
    return gePush;
};

export default GePush.getInstance();