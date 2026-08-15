/**
 * Research pipeline configuration
 *
 * REQUIRE_ADMIN_APPROVAL:
 * - true: Users suggest cities, admin reviews and approves before publishing (current mode)
 * - false: Users suggest cities, auto-approve and publish after research (future mode)
 *
 * Set to false when you're confident in the research quality and want full automation.
 */

export const RESEARCH_CONFIG = {
  /**
   * Require admin review before publishing research to catalog
   *
   * When true:
   * - Research completes but stays in "draft_for_review" status
   * - Admin visits /admin/research/[id] to review and approve
   * - Only approved research publishes to catalog
   * - Provides quality gate and audit trail
   *
   * When false:
   * - Research completes and auto-publishes to catalog if it passes validation
   * - No admin review needed
   * - Faster workflow but no human verification
   */
  REQUIRE_ADMIN_APPROVAL: true,

  /**
   * Whether to auto-add approved research to catalog code
   *
   * When true:
   * - Approved research is added to src/data/destinations.ts automatically
   * - Requires rebuild to deploy
   *
   * When false:
   * - Approved research stays in database
   * - Manual review/merge needed before catalog update
   */
  AUTO_ADD_TO_CATALOG: false,

  /**
   * Minimum influencer spots required
   */
  MIN_INFLUENCER_SPOTS: 20,

  /**
   * Maximum influencer spots allowed
   */
  MAX_INFLUENCER_SPOTS: 50,

  /**
   * Hotel price range (USD per night)
   */
  HOTEL_PRICE_RANGE: {
    min: 50,
    max: 2000,
  },

  /**
   * Flight time range (hours, door-to-door)
   */
  FLIGHT_TIME_RANGE: {
    min: 4,
    max: 25,
  },
} as const;

/**
 * Helper to check if admin approval is required
 */
export function requiresAdminApproval(): boolean {
  return RESEARCH_CONFIG.REQUIRE_ADMIN_APPROVAL;
}

/**
 * Helper to toggle admin approval (for migrations)
 * In production, this would read from env vars or a database setting
 */
export function setRequireAdminApproval(value: boolean): void {
  // In production:
  // - Read REQUIRE_ADMIN_APPROVAL from process.env.RESEARCH_REQUIRE_ADMIN_APPROVAL
  // - Or query from a settings table
  // For now, this shows the pattern
  console.log(`[Research Config] Admin approval requirement: ${value}`);
}
