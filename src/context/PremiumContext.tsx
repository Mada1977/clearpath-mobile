import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  configurePurchases,
  getCustomerInfo,
  addCustomerInfoListener,
  isEntitled,
} from '../services/purchases';

const FREE_DAILY_LIMIT = 10;
const TRIAL_DAYS = 3;

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
  const [rcIsPremium, setRcIsPremium] = useState(false);

  // Initialise RevenueCat and subscribe to CustomerInfo updates whenever
  // the logged-in user changes (covers login, logout, and user switch).
  useEffect(() => {
    if (!user) {
      setRcIsPremium(false);
      return;
    }

    configurePurchases(user.id);

    // Seed from cached CustomerInfo immediately
    getCustomerInfo().then(info => {
      if (info) setRcIsPremium(isEntitled(info));
    });

    // Live updates (e.g. after a purchase completes in a different screen)
    const remove = addCustomerInfoListener(info => {
      setRcIsPremium(isEntitled(info));
    });

    return () => { remove?.(); };
  }, [user?.id]);

  const value = useMemo((): PremiumContextType => {
    const u = user as any;
    const backendIsPremium = !!u?.isPremium;
    const isPremium = rcIsPremium || backendIsPremium;
    const premiumPlan = u?.premiumPlan ?? null;
    const trialStartedAt = u?.trialStartedAt ?? null;
    const premiumExpiresAt = u?.premiumExpiresAt ?? null;
    const messagesUsedToday = u?.aiMessagesUsedToday ?? 0;

    const trialDaysLeft = trialStartedAt
      ? Math.max(0, TRIAL_DAYS - Math.floor(
          (Date.now() - new Date(trialStartedAt).getTime()) / 86400000
        ))
      : null;
    const isOnTrial = isPremium && premiumPlan === 'trial' && (trialDaysLeft ?? 0) > 0;
    const canSendMessage = isPremium || messagesUsedToday < FREE_DAILY_LIMIT;

    return { isPremium, premiumPlan, isOnTrial, trialDaysLeft, messagesUsedToday, canSendMessage, premiumExpiresAt };
  }, [user, rcIsPremium]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  return useContext(PremiumContext);
}
