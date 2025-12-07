import cron from "node-cron";
import { processAutoRenewals, processTrialExpirations } from "../services/auto-renew.service.js";
import { logger } from "../utils/logger.utils.js";

/**
 * Setup cron jobs for auto-renewal and trial management
 * 
 * Runs daily at 2 AM to check for expiring subscriptions
 */
export function setupAutoRenewCron() {
  // Run daily at 2 AM
  cron.schedule("0 2 * * *", async () => {
    logger.info("🔄 Starting auto-renewal check...");
    try {
      await processAutoRenewals();
      logger.info("✅ Auto-renewal check completed");
    } catch (error: any) {
      logger.error("❌ Auto-renewal check failed", {
        error: error.message,
      });
    }
  });

  // Check trial expirations daily at 10 AM
  cron.schedule("0 10 * * *", async () => {
    logger.info("🔄 Starting trial expiration check...");
    try {
      await processTrialExpirations();
      logger.info("✅ Trial expiration check completed");
    } catch (error: any) {
      logger.error("❌ Trial expiration check failed", {
        error: error.message,
      });
    }
  });

  logger.info("📅 Auto-renewal cron jobs scheduled");
}







