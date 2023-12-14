/**
 * 用户备注用户信息
 **/
import Network from '../net/network';
let that;

class UserRemarks {

    constructor() {
        that = this;
        this._remarksMap = new Map(); //用户map
        this._remarksList = []; //用户列表
    }


    /**
     * 获得备注用户的列表
     */
    async getRemarksList() {
        let unknown = await Network.syncNet({
            url: '/v2/user/remarks/list',
            data: {}
        });
        this._remarksList = unknown.data.data;

        this._remarksMap.clear();

        let length = this._remarksList.length;

        for (let i = 0; i < length; i++) {
            this._remarksMap[this._remarksList[i].remarksUserUuid] = this._remarksList[i];
            this._remarksMap[this._remarksList[i].userId] = this._remarksList[i];
        }
    }

    /**
     * 修改备注
     */
    updateRemarks({userId, name}) {
        return new Promise(async (resolve, reject) => {
            try {
                let unknown = await Network.syncNet({
                    url: '/v2/user/remarks/user',
                    data: {
                        userId: userId,
                        name: name
                    }
                });
               // await that.getRemarksList();
                if( that._remarksMap[userId]){
                    that._remarksMap[userId].name=name;
                }
                resolve(unknown);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 获得用户备注信息
     * @param userUid 用户uuid 或者用户userId
     */
    getRemarksInfo(userUid) {
        return this._remarksMap[userUid];
    }

    /**
     * 返回备注列表
     */
    getUserRemarksList() {
        return this._remarksList;
    }
}

UserRemarks.getInstance = function () {
    let userRemarks;
    if (!userRemarks) userRemarks = new UserRemarks();
    return userRemarks;
};


export default UserRemarks.getInstance();
