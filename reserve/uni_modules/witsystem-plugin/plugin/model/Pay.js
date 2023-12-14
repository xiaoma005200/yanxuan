/**
 * 支付的model
 */
import Network from '../net/network';

class Pay {
    /**
     * 获得指定商品的订单或者指定商品指定用户的交易订单
     * @param productId 商品id 设备就是设备id 可以是多个用都都号隔开
     * @param userUuid 指定用户支付的 可以为空代表获取所有用户
     */
    async queryOrder({ productId, userUuid, page }) {
        return await Network.syncNet({
            url: '/pay/get_pay_info',
            data: {
                product_id: productId,
                userUuid: userUuid,
                page: page
            }
        });
    }
}

Pay.getInstance = function () {
    let pay;
    if (!pay) pay = new Pay();
    return pay;
};

export default Pay.getInstance();