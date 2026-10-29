import { supabase, unwrap, getSessionUserId } from '@/lib/supabaseClient';
import type { InfluencerApplication, MessageResponse, Profile } from '@/types';

export interface InfluencerApplicationInput {
    full_name: string;
    platform: string;
    profile_url: string;
    followers?: number | null;
    phone?: string;
    message?: string;
}

/** The signed-in member's latest application (or null if they never applied). */
const getMyApplication = async (): Promise<InfluencerApplication | null> => {
    const userId = await getSessionUserId();
    const rows = unwrap<InfluencerApplication[]>(await supabase
        .from('influencer_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1));
    return rows?.[0] ?? null;
};

const apply = async (input: InfluencerApplicationInput): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('apply_influencer', {
        p_full_name: input.full_name,
        p_platform: input.platform,
        p_profile_url: input.profile_url,
        p_followers: input.followers ?? null,
        p_phone: input.phone || null,
        p_message: input.message || null,
    }));
};

// ---------------- Admin ----------------

/** Every application, newest first, with the applicant's account details. */
const getAllApplications = async (): Promise<InfluencerApplication[]> => {
    return unwrap<InfluencerApplication[]>(await supabase
        .from('influencer_applications')
        .select('*, User:profiles(user_id, name, email, referral_count, total_referral_deposits)')
        .order('created_at', { ascending: false }));
};

/** Members who are approved influencers, with their current commission rate. */
const getInfluencers = async (): Promise<Profile[]> => {
    return unwrap<Profile[]>(await supabase
        .from('profiles')
        .select('*')
        .eq('is_influencer', true)
        .order('total_referral_deposits', { ascending: false }));
};

const approve = async (applicationId: number, percent: number): Promise<MessageResponse> =>
    unwrap<MessageResponse>(await supabase.rpc('approve_influencer', { p_application_id: applicationId, p_percent: percent }));

const reject = async (applicationId: number): Promise<MessageResponse> =>
    unwrap<MessageResponse>(await supabase.rpc('reject_influencer', { p_application_id: applicationId }));

/** Change an influencer's rate; 0 removes them from the programme. */
const setCommission = async (userId: string, percent: number): Promise<MessageResponse> =>
    unwrap<MessageResponse>(await supabase.rpc('set_influencer_commission', { p_user_id: userId, p_percent: percent }));

const influencerService = { getMyApplication, apply, getAllApplications, getInfluencers, approve, reject, setCommission };

export default influencerService;
