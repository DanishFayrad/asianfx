// Markets an admin can send signals for, with the badge each one shows everywhere in the app.

export interface Asset {
    id: number;
    name: string;
    symbol: string;
    displaySymbol: string;
    iconColor: string;
    glyph: string;
}

export const ASSETS: Asset[] = [
    { id: 1, name: 'Bitcoin', symbol: 'BTCUSDT', displaySymbol: 'BTC/USDT', iconColor: '#F7931A', glyph: '₿' },
    { id: 2, name: 'Gold', symbol: 'XAUUSD', displaySymbol: 'XAU/USD', iconColor: '#C9A227', glyph: 'Au' },
    { id: 3, name: 'Silver', symbol: 'XAGUSD', displaySymbol: 'XAG/USD', iconColor: '#8A9099', glyph: 'Ag' },
];

/** Used for any symbol that isn't one of the assets above (e.g. a Forex pair). */
const FALLBACK: Omit<Asset, 'id' | 'symbol'> = { name: 'Forex', displaySymbol: '', iconColor: '#3B82F6', glyph: 'FX' };

/** The asset for a signal symbol, matched loosely so "XAUUSD", "XAU/USD" and "xauusd" all work. */
export const assetFor = (symbol: string | null | undefined): Omit<Asset, 'id'> => {
    const s = String(symbol || '').toUpperCase();
    const asset = ASSETS.find((a) => s.includes(a.symbol.slice(0, 3)));
    return asset ?? { ...FALLBACK, symbol: s, displaySymbol: s };
};
