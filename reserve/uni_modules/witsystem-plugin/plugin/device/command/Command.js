//const CommandUtil = require("./CommandUtil");
//import CommandUtil from '../command/CommandUtil';
/**
 * 包头 E1发送包  E2为回复包 E3连续包 E4是连续包的回复包  E5连续包发送完成的校验包 E6校验包的回复包 E7添加设备或者是认证设备数据包 E8是E7的数据回复包
 * 指令对象
 */

class Command {
    constructor() {

        this.head = 'E1'; //包头

        this.length = undefined;//长度

        this.send = undefined; //发送者

        this.accepter = undefined; //接收者

        this.cmd = undefined; //指令

        this.stateCode = undefined; //状态码

        this.data = ''; //数据

        this.check = 0;//校验位
    }

    //  toHexString=function(){
    //      return  CommandUtil.commandToHex(this);
    // }

}

module.exports = Command;
