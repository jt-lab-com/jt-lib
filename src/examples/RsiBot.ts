
import { getArgNumber } from '../lib/core/base';
import { RsiBasket } from './basket/RsiBasket';
import { StandardReportLayout } from '../lib/report/layouts/standart.report.layout';
import { BaseScript } from '../lib/script/base-script';

class Strategy extends BaseScript {
  static definedArgs = [
    {
      key: 'symbols',
      defaultValue: 'XRP/USDT:USDT',
    },
    {
      key: 'sizeUsd',
      defaultValue: 5,
    },
  ];

  hedgeMode = true;
  sizeUsd: number;

  baskets: Record<string, RsiBasket> = {};
  private reportLayout: StandardReportLayout;

  constructor(params: GlobalARGS) {
    super(params);

    this.sizeUsd = getArgNumber('sizeUsd', 2);
  }

  async onInit() {
    this.reportLayout = new StandardReportLayout();

    // Create a basket for each symbol
    for (const symbol of this.symbols) {
      this.baskets[symbol] = new RsiBasket({ symbol });
      await this.baskets[symbol].init();
    }
  }
}
