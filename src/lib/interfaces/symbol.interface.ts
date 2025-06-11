namespace SymbolTypes {
  export interface Symbol {
    symbol: string;
    settleId: string;
    precision: { amount: number; quote: number; price: number; base: number };
    settle: string;
    baseId: string;
    type: string;
    lowercaseId: string;
    quote: string;
    percentage: boolean;
    contractSize: number;
    id: string;
    taker: number;
    limits: {
      market: { min: number; max: number };
      leverage: { min: number; max: number };
      amount: { min: number; max: number };
      cost: { min: number; max: number };
      price: { min: number; max: number };
    };
    inverse: boolean;
    margin: boolean;
    linear: boolean;
    swap: boolean;
    contract: boolean;
    active: boolean;
    maker: number;
    quoteId: string;
    future: boolean;
    feeSide: string;
    spot: boolean;
    tierBased: boolean;
    base: string;
    option: boolean;
  }
}
