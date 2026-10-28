import type { CSSProperties } from 'react';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    radius?: number | string;
    /** Take the full line (display: block) instead of sitting inline with text. */
    block?: boolean;
    style?: CSSProperties;
}

/** A shimmering placeholder shown in place of a value while it loads. */
export default function Skeleton({ width = '100%', height = 14, radius, block = false, style }: SkeletonProps) {
    return (
        <span
            className={`skeleton${block ? ' skeleton--block' : ''}`}
            style={{ width, height, borderRadius: radius, ...style }}
            aria-hidden="true"
        />
    );
}

/** Placeholder table rows: `rows` rows of `cols` shimmering cells. */
export function SkeletonRows({ rows = 5, cols, cellStyle }: { rows?: number; cols: number; cellStyle?: CSSProperties }) {
    return (
        <>
            {Array.from({ length: rows }, (_, r) => (
                <tr key={r} aria-hidden="true">
                    {Array.from({ length: cols }, (_, c) => (
                        <td key={c} style={cellStyle}>
                            <Skeleton width={c === 0 ? '80%' : '60%'} height={c === 0 ? 16 : 14} />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
