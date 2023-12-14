const Command = require("./Command");
/**
 * 指令工具
 */


/**
 * 计算包长
 * 返回-1 代表该指令不需要数据长度
 *
 */
packageLength = function (command) {
    //判断指令头大于230代表是添加设备的指令和认证指令 这个不需要长度直接返回-1
    if (parseInt(command.head) > 230) {
        return -1
    }
    //先添加固定的长度 包含发送者和接收者指令 和 校验位
    let length = 4;
    //判断如果有确认码再加1
    if (command.stateCode) {
        length++
    }
    //数据不为空再加上数据的长度
    if (command.data) {
        length = length + command.data.length / 2;
    }
    length = length.toString(16).toUpperCase();
    let hexLength = length.length;
    for (let i = 0; i < 4 - hexLength; i++) {
        length = '0' + length;
    }

    command.length = length;
    return 0;
};


/**
 * 给指定指令对象生成校验位
 */
commandAddCheck = function (command) {
    command.check = commandReturnCheck(command);
};

/**
 * 生成校验位并返回
 * @returns {string} 返回校验值
 */
commandReturnCheck = function (command) {
    let value = parseInt(command.head, 16);

    if (command.length) {
        value = value + parseInt(command.length, 16);
    }

    if (command.send) {
        value = value + parseInt(command.send, 16);
    }

    if (command.accepter) {
        value = value + parseInt(command.accepter, 16);
    }

    if (command.cmd) {
        value = value + parseInt(command.cmd, 16);
    }

    if (command.stateCode) {
        value = value + parseInt(command.stateCode, 16);
    }

    if (command.data) {
        let p = command.data;
        for (let i = 0; i < p.length; i = i + 2) {
            value = value + parseInt(p.substring(i, i + 2), 16);
        }
    }

    value = value.toString(16);
    if (value.length > 2) {
        value = value.substring(value.length - 2, value.length);
    }
    if (value.length < 2) {
        value = '0' + value;
    }
    return value.toUpperCase();
};


/**
 * 16进制指令转换成command对象
 */
hexToCommand = function (hex) {
    hex = hex.toUpperCase();
    let command = new Command();
    let index = 0;
    command.head = hex.substring(index, index += 2);
    //判断指令头大于230代表是添加设备的指令和认证指令
    if (parseInt(command.head, 16) > 230) {
        command.cmd = hex.substring(index, index += 2);
        if (command.head === 'E8') {
            command.stateCode = hex.substring(index, index += 2);
        }
        command.data = hex.substring(index, hex.length - 2);
        command.check = hex.substring(hex.length - 2);
        return command;
    }
    command.length = hex.substring(index, index += 4);
    command.send = hex.substring(index, index += 2);
    command.accepter = hex.substring(index, index += 2);
    command.cmd = hex.substring(index, index += 2);

    //判断包头，如果是回复包就有确认码
    if (command.head === 'E2' || command.head === 'E4' || command.head === 'E6' || command.head === 'E8') {
        command.stateCode = hex.substring(index, index += 2);
    }
    command.data = hex.substring(index, hex.length - 2);
    command.check = hex.substring(hex.length - 2);
    return command;
};


/**
 * 验证指令的校验位
 */
authCommand = function (command) {
    let number = commandReturnCheck(command);
    return parseInt(number, 16) === parseInt(command.check, 16);
};


/**
 * 合成指令
 */
commandToHex = function (command) {
    let hex = command.head;
    if (command.length) {
        hex = hex + command.length;
    } else if (command.head !== 'E7' && command.head !== 'E8') {//e7 e8不需要长度
        packageLength(command);//没有长度去计算长度
        hex = hex + command.length;
    }

    if (command.send) {
        hex = hex + command.send;
    }

    if (command.accepter) {
        hex = hex + command.accepter;
    }

    if (command.cmd) {
        hex = hex + command.cmd;
    }

    if (command.stateCode) {
        hex = hex + command.stateCode;
    }

    if (command.data) {
        hex = hex + command.data;
    }

    if (command.check) {
        hex = hex + command.check;
    } else {
        //没有校验码去计算校验码
        command.check = commandReturnCheck(command);
        hex = hex + command.check;
    }

    return hex.toUpperCase();
};


/**
 * 解析同步指令信息
 */
analyzeLogInfo = function (command) {
    let logMap = {
        surplus: "0000",//剩余条数
        list: []//记录
    }
    let data = command.data;
    let surplus = data.substring(data.length - 4);//获得剩余条数
    let logData = data.substring(0, data.length - 4);
    logMap.surplus = surplus;
    let number = logData.length / 16;
    let index = 0;
    let log;
    for (let i = 0; i < number; i++) {
        log = logData.substring(16 * i, 16 * i + 16)
        index = 0;
        logMap.list.push(
            {
                event: log.substring(index, index += 2),
                mode: log.substring(index, index += 2),
                uid: log.substring(index, index += 4),
                timestamp: parseInt(log.substring(index), 16),
            }
        )
    }
    console.log("剩余的条数>>>>>>>>>>>>>>>>>>>>>", logMap);
    return logMap;
}

/**
 * 解析设备状态码
 */
analyzeDeviceStateCode = function (stateCode) {
    let stateInfo = {
        lockMode: 0,//门锁模式
        lock: true,//多少次失败之后门锁锁定，默认开启
        brakeAlarm: true,//防撬报警是否为开启，默认未开启
        volume: 8,//音量
        language: 0,//默认语言
        motorTime: 300,//电机转动的时间默认300毫秒
        autoCloseLockTime: 6000,//电机自动关闭时间默认6000毫秒
        obligate1: 0xFF,//预留1 7 6 5 4 3 2 1 0  0bit(0左开1右开)其他位预留
        obligate2: 0xFF,//预留2
        obligate3: 0xFF,//预留3
        obligate4: 0xFF,//预留4
        lockBody: 0xFF//锁体状态
    }
    if (!stateCode) {
        return stateInfo;
    }


    // 00 00 01 01 04 000A3CFF67
    let index = 0;
    stateInfo.lockMode = parseInt(stateCode.substring(index, index += 2));
    stateInfo.lock = parseInt(stateCode.substring(index, index += 2), 16) === 1;//锁定功能如果后面还有新的，需要重新解析
    stateInfo.brakeAlarm = parseInt(stateCode.substring(index, index += 2), 16) === 1;//后面添加更多报警事件，需要按位重新解析
    stateInfo.volume = parseInt(stateCode.substring(index, index += 2), 16);
    stateInfo.language = parseInt(stateCode.substring(index, index += 2), 16);
    stateInfo.motorTime = parseInt(stateCode.substring(index, index += 2), 16) * 30;
    stateInfo.autoCloseLockTime = parseInt(stateCode.substring(index, index += 2), 16) * 100;
    stateInfo.obligate1 = parseInt(stateCode.substring(index, index += 2), 16);//最低为0左开1右开
    stateInfo.obligate2 = parseInt(stateCode.substring(index, index += 2), 16);
    stateInfo.obligate3 = parseInt(stateCode.substring(index, index += 2), 16);
    stateInfo.obligate4 = parseInt(stateCode.substring(index, index += 2), 16);
    stateInfo.lockBody = parseInt(stateCode.substring(index, index + 2), 16);
    return stateInfo;
}


/**
 * 设备状态码转换成功hex字符串
 * 和analyzeDeviceStateCode该函数是成对的，上面的解析，该函数合成
 */
deviceStateCodeToHex = function (stateInfo) {
    let lockMode = stateInfo.lockMode.toString(16).padStart(2, "0");
    let lock = stateInfo.lock ? '01' : '00';//注意加入更多状态这里不能这么写
    let brakeAlarm = stateInfo.brakeAlarm ? '01' : '00';//注意加入更多状态这里不能这么写
    let volume = stateInfo.volume.toString(16).padStart(2, "0");
    let language = stateInfo.language.toString(16).padStart(2, "0");
    let motorTime = Math.floor(stateInfo.motorTime / 30).toString(16).padStart(2, "0");
    let autoCloseLockTime = Math.floor(stateInfo.autoCloseLockTime / 100).toString(16).padStart(2, "0");
    let obligate1 = stateInfo.obligate1.toString(16).padStart(2, "0");
    let obligate2 = stateInfo.obligate2.toString(16).padStart(2, "0");
    let obligate3 = stateInfo.obligate3.toString(16).padStart(2, "0");
    let obligate4 = stateInfo.obligate4.toString(16).padStart(2, "0");
    let lockBody = stateInfo.lockBody.toString(16).padStart(2, "0");
    return (lockMode + lock + brakeAlarm + volume + language + motorTime + autoCloseLockTime + obligate1 + obligate2 + obligate3 + obligate4 + lockBody).toUpperCase();
}


/**
 * 10进制数转二进制修改指定位数据后在转换为10进制
 * @param decimalValue 需要修改的10进制数据
 * @param bitIndex 需要修改的二进制指定的位置
 * @param modifiedBit 需要修改成的数据，只能是0和1的字符串
 * @returns int 返回
 */
convertHexToBinary = function (decimalValue, bitIndex, modifiedBit) {
    // 将10进制值转换为二进制字符串，并填充前导零，直到字符串长度为32
    const binaryString = decimalValue.toString(2).padStart(32, '0');
    // 将指定位设置为0，并将二进制字符串转换回10进制数
    const binaryArray = binaryString.split('');
    binaryArray[31 - bitIndex] = modifiedBit
    const modifiedBinaryString = binaryArray.join('');
    return parseInt(modifiedBinaryString, 2);
}


/**
 * 获得获取状态命令的时间
 * 最后一位是周几
 * 时间+周几
 */
timeTo16 = function () {
    let now = new Date();
    let year = now.getFullYear(); //得到年份

    let month = now.getMonth(); //得到月份

    let date = now.getDate(); //得到日期

    let hour = now.getHours(); //得到小时

    let minu = now.getMinutes(); //得到分钟

    let sec = now.getSeconds(); //得到秒

    let day = now.getDay(); //得到周几

    let year16 = (year % 2000).toString(16);

    if (year16.length % 2 !== 0) {
        year16 = '0' + year16;
    }

    let month16 = (month + 1).toString(16);

    if (month16.length % 2 !== 0) {
        month16 = '0' + month16;
    }

    let date16 = date.toString(16);

    if (date16.length % 2 !== 0) {
        date16 = '0' + date16;
    }

    let hour16 = hour.toString(16);

    if (hour16.length % 2 !== 0) {
        hour16 = '0' + hour16;
    }

    let minu16 = minu.toString(16);

    if (minu16.length % 2 !== 0) {
        minu16 = '0' + minu16;
    }

    let sec16 = sec.toString(16);

    if (sec16.length % 2 !== 0) {
        sec16 = '0' + sec16;
    }

    let day16 = day.toString(16);

    if (day16.length % 2 !== 0) {
        day16 = '0' + day16;
    }

    return year16 + month16 + date16 + hour16 + minu16 + sec16 + day16;
};
/**
 * 通过日期转换成16进制字符串 没有秒
 */
dataTo16 = function (Time) {
    if (!Time instanceof Date) {
        return undefined;
    }

    let year = Time.getFullYear(); //得到年份

    let month = Time.getMonth(); //得到月份

    let date = Time.getDate(); //得到日期

    let hour = Time.getHours(); //得到小时

    let minu = Time.getMinutes(); //得到分钟

    let year16 = (year % 2000).toString(16);

    if (year16.length % 2 !== 0) {
        year16 = '0' + year16;
    }

    let month16 = (month + 1).toString(16);

    if (month16.length % 2 !== 0) {
        month16 = '0' + month16;
    }

    let date16 = date.toString(16);

    if (date16.length % 2 !== 0) {
        date16 = '0' + date16;
    }

    let hour16 = hour.toString(16);

    if (hour16.length % 2 !== 0) {
        hour16 = '0' + hour16;
    }

    let minu16 = minu.toString(16);

    if (minu16.length % 2 !== 0) {
        minu16 = '0' + minu16;
    }

    return year16 + month16 + date16 + hour16 + minu16;
};
/**
 * 周几转化成16进制
 */
weekTo16 = function (weeks) {
    let initTime = [0b0, 0b0, 0b0, 0b0, 0b0, 0b0, 0b0, 0b0];

    if (weeks instanceof Array) {
        let week;

        for (let i = 0; i < weeks.length; i++) {
            week = weeks[i] instanceof String ? parseInt(weeks[i]) : weeks[i];

            if (week > 0) {
                initTime[8 - week] = 1;
            }
        }

        let hs = '';

        for (let i = 0; i < initTime.length; i++) {
            hs = hs + initTime[i];
        }

        hs = parseInt(hs, 2).toString(16);
        return hs.length % 2 === 0 ? hs : '0' + hs;
    }

    return '00';
};

/**
 * 10进制转16进制字符串自动补0
 */
to16StringAdd0 = function (hex) {
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }

    return hex;
};


/**
 * 权限hex值转成type
 */
authHexToAuthType = function (hexAuth) {
    switch (hexAuth) {
        case '01':
            return "Admin";
        case '02':
            return "User";
        case '03':
            return "Disposable";
        case '04':
            return "Cycle";
        case '05':
            return "AntiHijacking";


    }
}


/**
 * 权限type转成hex值
 */
authTypeToAuthHex = function (auth) {
    switch (auth) {
        case 'Admin':
            return "01";
        case 'User':
            return "02";
        case 'Disposable':
            return "03";
        case 'Cycle':
            return "04";
        case 'AntiHijacking':
            return "05";


    }
}


module.exports = {
    packageLength: packageLength,
    commandAddCheck: commandAddCheck,
    commandReturnCheck: commandReturnCheck,
    hexToCommand: hexToCommand,
    authCommand: authCommand,
    commandToHex: commandToHex,
    authHexToAuthType: authHexToAuthType,
    authTypeToAuthHex: authTypeToAuthHex,
    analyzeLogInfo: analyzeLogInfo,
    analyzeDeviceStateCode: analyzeDeviceStateCode,
    deviceStateCodeToHex: deviceStateCodeToHex,
    convertHexToBinary: convertHexToBinary,
}