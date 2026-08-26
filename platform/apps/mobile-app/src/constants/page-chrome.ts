export const PAGE_CHROME = {
  bottom: {
    composerFadeInset: 154,
    estimatedInset: 82,
    extension: 10,
    locations: [0, 0.3, 1] as const,
    opacities: [0, 0.5, 0.95] as const,
  },
  header: {
    actionSize: 44,
    estimatedInset: 74,
    gap: 10,
    horizontalPadding: 14,
    pillHeight: 40,
    titleFadeDistance: 30,
    verticalPadding: 6,
  },
  top: {
    extension: 14,
    locations: [0, 0.7, 1] as const,
    opacities: [0.95, 0.5, 0] as const,
  },
} as const;
