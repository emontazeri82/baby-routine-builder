export const ActivityTimeRules: Record<
  string,
  { requiresEndTime: boolean,
    allowOptionalEndTime?: boolean
   }
> = {
  Sleep: { requiresEndTime: true },
  Nap: { requiresEndTime: true },
  Play: { requiresEndTime: true },
  Pumping: { requiresEndTime: true },

  Feeding: { requiresEndTime: false, allowOptionalEndTime: true },
  Growth: { requiresEndTime: false },
  Medicine: { requiresEndTime: false },
  Temperature: { requiresEndTime: false },
  Diaper: { requiresEndTime: false },
  Bath: { requiresEndTime: false },
};
