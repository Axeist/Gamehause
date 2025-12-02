// Background reconciliation utility
// Runs automatically when app is open to reconcile pending payments and cleanup duplicate bookings
// Works on Vercel Hobby plan (client-side, not server-side cron)

let reconciliationInterval: NodeJS.Timeout | null = null;
let isRunning = false;

export function startBackgroundReconciliation() {
  // Don't start if already running
  if (reconciliationInterval) {
    return;
  }

  console.log("🔄 Starting background reconciliation and duplicate cleanup...");
  
  reconciliationInterval = setInterval(async () => {
    // Prevent concurrent runs
    if (isRunning) {
      return;
    }

    try {
      isRunning = true;
      
      // 1. Call the reconciliation endpoint to process all pending payments
      const reconciliationResponse = await fetch('/api/razorpay/reconcile-pending-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const reconciliationData = await reconciliationResponse.json();
      
      if (reconciliationResponse.ok && reconciliationData.processed > 0) {
        console.log(`✅ Background reconciliation: ${reconciliationData.successful} successful, ${reconciliationData.failed} failed`);
      }
      
      // 2. Call the duplicate cleanup endpoint to remove duplicate bookings
      try {
        const cleanupResponse = await fetch('/api/bookings/cleanup-duplicates-cron', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!cleanupResponse.ok) {
          const errorData = await cleanupResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Duplicate cleanup failed:', errorData.error || cleanupResponse.statusText);
        } else {
          const cleanupData = await cleanupResponse.json();
          
          if (cleanupData.duplicatesDeleted > 0) {
            console.log(`✅ Duplicate cleanup: Deleted ${cleanupData.duplicatesDeleted} duplicate booking(s) from ${cleanupData.duplicateGroups} group(s)`);
          } else {
            console.log(`✅ Duplicate cleanup: Checked ${cleanupData.processed || 0} booking(s), no duplicates found`);
          }
        }
      } catch (cleanupErr) {
        console.error('❌ Duplicate cleanup request failed:', cleanupErr);
      }
    } catch (err) {
      console.error('❌ Background reconciliation/cleanup error:', err);
    } finally {
      isRunning = false;
    }
  }, 60000); // Run every 60 seconds (1 minute)
}

export function stopBackgroundReconciliation() {
  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
    reconciliationInterval = null;
    console.log("⏹️ Stopped background reconciliation");
  }
}

// Auto-start when module loads (if in browser)
if (typeof window !== 'undefined') {
  // Start background reconciliation when app loads
  // Only if user is likely an admin (on booking management or dashboard)
  const startIfAdmin = () => {
    const path = window.location.pathname;
    if (path.includes('/booking-management') || path.includes('/dashboard') || path.includes('/admin')) {
      startBackgroundReconciliation();
    }
  };

  // Start immediately if already on admin page
  startIfAdmin();

  // Also start on navigation (for SPA)
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(startIfAdmin, 100);
  };

  // Cleanup on page unload
  window.addEventListener('beforeunload', stopBackgroundReconciliation);
}

