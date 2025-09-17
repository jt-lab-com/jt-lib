import { ReportWidget } from './report-widget';
import { log } from '../../core/log';
export class ReportTvChart extends ReportWidget {
  // TVChartData {
  //     symbol: string;
  //     startTime: number;
  //     endTime: number;
  //     interval: string;
  //     visibleRange?: PlaybackChartVisibleRange;
  //     shapes?: PlaybackChartShape[];
  //     priceLines?: PlaybackChartPriceLine[];
  //     indicators?: LineSeries[];
  //     oscillators?: LineSeries[];
  //     height?: number;
  //     width?: number;
  //   }

  symbol: string;
  startTime: number;
  endTime: number;
  interval: string;
  visibleRange: PlaybackChartVisibleRange;
  shapes: PlaybackChartShape[];
  priceLines: PlaybackChartPriceLine[];
  indicators: LineSeries[];
  oscillators: LineSeries[];
  height: number;
  width: number;
  constructor(symbol: string, interval: string = '60', startTime?: number, endTime?: number) {
    super();

    this.symbol = symbol;
    this.interval = interval;
    this.startTime = startTime || 0;
    this.endTime = endTime || 0;

    log('TvChartWidget::constructor', 'Initialized TvChart widget', {
      symbol: this.symbol,
      interval,
    });
  }

  async prepareDataToReport(): TVChartReportBlock {
    return {
      name: '',
      type: 'trading_view_chart',
      isVisible: true,
      data: {
        symbol: this.symbol,
        startTime: this.startTime,
        endTime: this.endTime,
        interval: this.interval,
        visibleRange: this.visibleRange,
        shapes: this.shapes,
        priceLines: this.priceLines,
        indicators: this.indicators,
        oscillators: this.oscillators,
        height: this.height,
        width: this.width,
      },
    };
  }

  createShape(
    renderTime: number,
    shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown',
    text?: string,
    position: 'aboveBar' | 'belowBar' | 'inBar' = 'aboveBar',
    options?: PlaybackChartShapeOptions,
  ): PlaybackChartShape {
    const shapeData: PlaybackChartShape = {
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      shape,
      text,
      renderTime,
      position,
      options,
    };

    if (!this.shapes) {
      this.shapes = [];
    }

    this.shapes.push(shapeData);

    log('TvChartWidget::createShape', 'Created new shape', {
      shapeId: shapeData.id,
      shape,
      renderTime,
      position,
    });

    return shapeData;
  }

  createPriceLine(
    renderTime: number,
    price: number,
    title: string,
    options?: PlaybackChartPriceLineOptions,
  ): PlaybackChartPriceLine {
    if (!this.priceLines) {
      this.priceLines = [];
    }
    const priceLineData: PlaybackChartPriceLine = {
      id: `priceLine_` + this.priceLines.length,
      renderTime,
      price,
      title,
      options,
    };

    this.priceLines.push(priceLineData);

    log('TvChartWidget::createPriceLine', 'Created new price line', {
      priceLineId: priceLineData.id,
      price,
      title,
      renderTime,
    });

    return priceLineData;
  }

  createIndicator(
    name: string,
    data: Array<{ time: number; value: number }>,
    color?: string,
    lineWidth?: TVChartSeriesLineWidth,
    lineStyle?: TVChartSeriesLineStyle,
    lineType?: TVChartSeriesLineType,
  ): LineSeries {
    const indicatorData: LineSeries = {
      name,
      color,
      lineWidth,
      lineStyle,
      lineType,
      data,
    };

    if (!this.indicators) {
      this.indicators = [];
    }

    this.indicators.push(indicatorData);

    log('TvChartWidget::createIndicator', 'Created new indicator', {
      name,
      dataPoints: data.length,
      color,
      lineWidth,
    });

    return indicatorData;
  }

  createOscillator(
    name: string,
    data: Array<{ time: number; value: number }>,
    color?: string,
    lineWidth?: TVChartSeriesLineWidth,
    lineStyle?: TVChartSeriesLineStyle,
    lineType?: TVChartSeriesLineType,
  ): LineSeries {
    const oscillatorData: LineSeries = {
      name,
      color,
      lineWidth,
      lineStyle,
      lineType,
      data,
    };

    if (!this.oscillators) {
      this.oscillators = [];
    }

    this.oscillators.push(oscillatorData);

    log('TvChartWidget::createOscillator', 'Created new oscillator', {
      name,
      dataPoints: data.length,
      color,
      lineWidth,
    });

    return oscillatorData;
  }
}
