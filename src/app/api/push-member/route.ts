import { adminClientFromRequest, configureWebPush, pushToMembers } from '@/lib/webPush';

// web-push needs Node's crypto.
export const runtime = 'nodejs';

/**
 * Admin-only: send a browser push notification to one member
 * (e.g. "your deposit was rejected because …").
 */
export async function POST(request: Request) {
    if (!configureWebPush()) {
        return Response.json({ message: 'Web push is not configured (VAPID keys missing).' }, { status: 503 });
    }
    const auth = await adminClientFromRequest(request);
    if ('error' in auth) return auth.error;

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.user_id === 'string' ? body.user_id : '';
    const title = typeof body.title === 'string' ? body.title.slice(0, 120) : '';
    const text = typeof body.body === 'string' ? body.body.slice(0, 300) : '';
    if (!userId || !title) return Response.json({ message: 'user_id and title are required' }, { status: 400 });

    const result = await pushToMembers(auth.supabase, [userId], {
        title,
        body: text,
        url: typeof body.url === 'string' && body.url.startsWith('/') ? body.url : '/dashboard',
        tag: typeof body.tag === 'string' ? body.tag.slice(0, 60) : undefined,
    });
    if (result.error) return Response.json({ message: result.error }, { status: 500 });
    return Response.json(result);
}
