'use client';

import { useQuery } from '@tanstack/react-query';
import signalService from '@/services/signalService';
import transactionService from '@/services/transactionService';
import { updateServerTimeOffset } from '@/services/serverTime';
import influencerService from '@/services/influencerService';

/**
 * Query keys for all server data. The first part is a group, so a whole group can be
 * refreshed at once, e.g. queryClient.invalidateQueries({ queryKey: ['signals'] }).
 * Member data includes the user id so one member never sees another's cached data.
 */
export const queryKeys = {
    signalsDashboard: (userId?: string) => ['signals', 'dashboard', userId] as const,
    signalHistory: (userId?: string) => ['signals', 'history', userId] as const,
    globalTimer: (userId?: string) => ['globalTimer', userId] as const,
    walletStats: (userId?: string) => ['wallet', 'stats', userId] as const,
    myTransactions: (userId?: string) => ['transactions', 'mine', userId] as const,
    pendingTransactions: ['transactions', 'pending'] as const,
    allTransactions: ['transactions', 'all'] as const,
    publicStats: ['publicStats'] as const,
    adminStats: ['admin', 'stats'] as const,
    adminUsers: ['admin', 'users'] as const,
    myInfluencerApplication: (userId?: string) => ['influencer', 'mine', userId] as const,
    influencerApplications: ['admin', 'influencers', 'applications'] as const,
    influencers: ['admin', 'influencers', 'list'] as const,
};

/** Signals the caller can see, plus the signal stats. */
export const useSignalsDashboard = (userId?: string, enabled = true) => useQuery({
    queryKey: queryKeys.signalsDashboard(userId),
    queryFn: signalService.getSignalsDashboard,
    enabled: enabled && !!userId,
});

/** The member's purchased signals with their results. */
export const useSignalHistory = (userId?: string, enabled = true) => useQuery({
    queryKey: queryKeys.signalHistory(userId),
    queryFn: () => signalService.getUserSignalHistory(),
    enabled: enabled && !!userId,
});

/** The "next signal" countdown (also syncs the browser clock with the database clock). */
export const useGlobalTimer = (userId?: string, enabled = true) => useQuery({
    queryKey: queryKeys.globalTimer(userId),
    queryFn: async () => {
        const timer = await signalService.getGlobalTimer();
        if (timer.server_time) updateServerTimeOffset(timer.server_time);
        return timer;
    },
    enabled: enabled && !!userId,
});

/** Member wallet totals (deposits, withdrawals, fees, profit). */
export const useWalletStats = (userId?: string, enabled = true) => useQuery({
    queryKey: queryKeys.walletStats(userId),
    queryFn: transactionService.getWalletStats,
    enabled: enabled && !!userId,
});

/** The member's own transactions. */
export const useMyTransactions = (userId?: string, enabled = true) => useQuery({
    queryKey: queryKeys.myTransactions(userId),
    queryFn: transactionService.getUserTransactions,
    enabled: enabled && !!userId,
});

/** Public track record for the landing page (works logged out). */
export const usePublicStats = () => useQuery({
    queryKey: queryKeys.publicStats,
    queryFn: signalService.getPublicStats,
});

// ---------------- Admin only ----------------

export const useAdminStats = (enabled = true) => useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: transactionService.getAdminStats,
    enabled,
});

export const useAdminUsers = (enabled = true) => useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: transactionService.getAllUsersWithSignals,
    enabled,
});

export const usePendingTransactions = (enabled = true) => useQuery({
    queryKey: queryKeys.pendingTransactions,
    queryFn: transactionService.getPendingTransactions,
    enabled,
});

export const useAllTransactions = (enabled = true) => useQuery({
    queryKey: queryKeys.allTransactions,
    queryFn: transactionService.getAllTransactions,
    enabled,
});

// ---------------- Influencer programme ----------------

/** The member's latest influencer application (null if they never applied). */
export const useMyInfluencerApplication = (userId?: string, enabled = true) => useQuery({
    queryKey: queryKeys.myInfluencerApplication(userId),
    queryFn: influencerService.getMyApplication,
    enabled: enabled && !!userId,
});

export const useInfluencerApplications = (enabled = true) => useQuery({
    queryKey: queryKeys.influencerApplications,
    queryFn: influencerService.getAllApplications,
    enabled,
});

export const useInfluencers = (enabled = true) => useQuery({
    queryKey: queryKeys.influencers,
    queryFn: influencerService.getInfluencers,
    enabled,
});
