export type ActivityConfig = {
  name: string;
  slug: string;

  // core behavior
  isDuration: boolean;

  // UI behavior
  allowQuickLog: boolean;
  allowEnd: boolean;

  // optional defaults
  quickMetadata?: () => Record<string, any>;
};
export const ACTIVITY_CONFIG: Record<string, ActivityConfig> = {

  Feeding: {
    name: "Feeding",
    slug: "feeding",
    isDuration: false,
    allowQuickLog: true,
    allowEnd: false,
    quickMetadata: () => ({
      method: "bottle",
    }),
  },

  Sleep: {
    name: "Sleep",
    slug: "sleep",
    isDuration: true,
    allowQuickLog: true,
    allowEnd: true,
  },

  Nap: {
    name: "Nap",
    slug: "nap",
    isDuration: true,
    allowQuickLog: true,
    allowEnd: true,
  },

  Diaper: {
    name: "Diaper",
    slug: "diaper",
    isDuration: false,
    allowQuickLog: true,
    allowEnd: false,
    quickMetadata: () => ({
      type: "wet",
    }),
  },

  Play: {
    name: "Play",
    slug: "play",
    isDuration: true,
    allowQuickLog: true,
    allowEnd: true,
  },

  Bath: {
    name: "Bath",
    slug: "bath",
    isDuration: false,
    allowQuickLog: true,
    allowEnd: false,
  },

  Medicine: {
    name: "Medicine",
    slug: "medicine",
    isDuration: false,
    allowQuickLog: true,
    allowEnd: false,
  },

  Temperature: {
    name: "Temperature",
    slug: "temperature",
    isDuration: false,
    allowQuickLog: true,
    allowEnd: false,
  },

  Growth: {
    name: "Growth",
    slug: "growth",
    isDuration: false,
    allowQuickLog: true,
    allowEnd: false,
  },

  Pumping: {
    name: "Pumping",
    slug: "pumping",
    isDuration: true,
    allowQuickLog: true,
    allowEnd: true,
  },

};