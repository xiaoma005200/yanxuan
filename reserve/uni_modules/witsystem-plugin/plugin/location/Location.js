//定位信息
let that;

class Location {

    constructor() {
        that = this;
        this.postition = {};
    } //获得当前位置信息

    initLocation() {
        uni.getLocation({
            type: 'wgs84',
            success(res) {
                that.postition['latitude'] = res.latitude;
                that.postition['longitude'] = res.longitude;
                console.log(that.postition);
            }
        });
    }

    getLocation() {
        return this.postition;
    }

}

Location.getInstance = function () {
    let location;
    if (!location) location = new Location();
    return location;
};


export default Location.getInstance();
