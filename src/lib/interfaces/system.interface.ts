namespace System {
  export interface StrategyItem {
    id: string;
    name: string;
    type: 'local' | 'bundle' | 'app';
    mode?: 'runtime' | 'tester';
    path?: string;
    version?: string;
  }

  export interface Runtime {
    id?: number;
    accountId: string;
    name: string;
    prefix: string;
    strategyId: string;
    strategyType: string;
    runtimeType: string;
    strategy: StrategyItem;
    artifacts: string;
    exchange: string;
    marketType: MarketType;
    args: KeyValueType[] | string;
    createdAt?: Date;
    updatedAt?: Date;
  }

  export type MarketType = 'spot' | 'swap';

  export type RuntimeArgs = Array<{ key: string; value: string | number }>;

  type KeyValueType = { key: string; value: string | number };
}
