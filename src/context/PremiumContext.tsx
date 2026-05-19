import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const FREE_DAILY_LIMIT = 10;

type PremiumContextType = {
  isPremium: boolean;
  premiumPlan: string | null;
  isOnTrial: boolean;
  trialDaysLeft: number | null;
  messagesUsedToday: number;
  canSendMessage: boolean;
  premiumExpiresAt: string | null;
};

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  premiumPlan: null,
  isOnTrial: false,
  trialDaysLeft: null,
  messagesUsedToday: 0,
  canSendMessage: true,
  premiumExpiresAt: null,
});

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo((): PremiumContextType => {
    const u = user as any;
    const isPremium = !!u?.isPremium;
    const premiumPlan = u?.premiumPlan ?? null;
    const trialStartedAt = u?.trialStartedAt ?? null;
    const premiumExpiresAt = u?.premiumExpiresAt ?? null;
    const messagesUsedToday = u?.aiMessagesUsedToday ?? 0;

    const trialDaysLeft = trialStartedAt
      ? Math.max(0, 7 - Math.floor((Date.now() - new Date(trialStartedAt).getTime()) / 86400000))
      : null;
    const isOnTrial = isPremium && premiumPlan === 'trial' && (trialDaysLeft ?? 0) > 0;
    const canSendMessage = isPremium || messagesUsedToday < FREE_DAILY_LIMIT;

    return { isPremium, premiumPlan, isOnTrial, trialDaysLeft, messagesUsedToday, canSendMessage, premiumExpiresAt };
  }, [user]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  return useContext(PremiumContext);
}
