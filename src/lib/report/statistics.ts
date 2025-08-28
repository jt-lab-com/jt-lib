import { globals } from '../core/globals';
import { currentTime } from '../utils/date-time';
import { longProfit, shortProfit } from '../exchange/heplers';
import { BaseObject } from '../core/base-object';

class Statistics extends BaseObject {
  timeStart = 0;
  leverage = 20;
  private profit = 0;
  private bestTrade: number;
  private worstTrade: number;

  constructor(args) {
    super(args);
    this.timeStart = currentTime();

    globals.events.subscribe('onOrderChange', this.onOrderChange, this);

    globals.events.subscribe('onTick', this.dataCollector, this);
  }

  ordersOpenedCnt = 0;
  ordersClosedCnt = 0;
  ordersCanceledCnt = 0;
  ordersModifiedCnt = 0;
  ordersTotalCnt = 0;
  volume = 0;

  async onOrderChange(order: Order) {
    let profit = 0;
    if (order.status === 'open') {
      this.ordersTotalCnt++;
      this.ordersOpenedCnt++;
    }

    if (order.status === 'closed') {
      this.ordersClosedCnt++;
      this.volume += order.amount * order.price;

      if (order.side === 'buy') {
        this.profit += profit = longProfit(order.price, close(order.symbol), order.amount);
      } else {
        this.profit += profit = shortProfit(order.price, close(order.symbol), order.amount);
      }

      this.bestTrade = Math.max(this.bestTrade, profit);
      this.worstTrade = Math.min(this.worstTrade, profit);
    }

    if (order.status === 'canceled') {
      this.ordersCanceledCnt++;
    }
  }

  nextTimeUpdate = 0;
  dataCollector = async () => {
    if (this.nextTimeUpdate > tms()) {
      return;
    }
    this.nextTimeUpdate = tms() + 1000 * 60 * 30; // 30 min
  };

  prepareDateForReport() {}
}
