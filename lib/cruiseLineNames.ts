/**
 * Cruise line names only — deliberately its own module with zero dependency
 * on lib/cruiseData.ts (which holds ~3,400 real sailing records). Client
 * components that just need the list of lines for a dropdown should import
 * from here, not from cruiseData, so the big dataset never ends up in their
 * bundle.
 */
export const CRUISE_LINE_NAMES = ["Royal Caribbean"] as const;
