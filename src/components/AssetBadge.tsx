import { assetFor } from '@/config/assets';

/** The glyph inside a badge: ₿, Au, Ag … drawn as SVG on a ring. */
export function AssetGlyph({ glyph, size = 28 }: { glyph: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
            <circle cx="14" cy="14" r="13" fill="rgba(0,0,0,0.12)" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
            <text x="14" y="14.5" textAnchor="middle" dominantBaseline="central" fontSize={glyph.length > 1 ? 11 : 16} fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">{glyph}</text>
        </svg>
    );
}

/** Coloured square badge for a signal's market (orange ₿ Bitcoin, gold Au, silver Ag), as on the Broadcast form. */
export default function AssetBadge({ symbol, size = 38 }: { symbol: string | null | undefined; size?: number }) {
    const asset = assetFor(symbol);
    return (
        <span
            title={asset.name}
            style={{
                flexShrink: 0,
                width: size,
                height: size,
                display: 'grid',
                placeItems: 'center',
                borderRadius: Math.round(size * 0.29),
                background: asset.iconColor,
            }}
        >
            <AssetGlyph glyph={asset.glyph} size={Math.round(size * 0.74)} />
        </span>
    );
}
