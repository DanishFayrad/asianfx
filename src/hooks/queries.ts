'use client';

import { useQuery } from '@tanstack/react-query';
import signalService from '@/services/signalService';
import transactionService from '@/services/transactionService';
import { updateServerTimeOffset } from '@/services/serverTime';

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
    adminStats: ['admin', 'stats'] as const,
    adminUsers: ['admin', 'users'] as const,
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
