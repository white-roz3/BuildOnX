#!/usr/bin/env python3
"""
Cleanup cron job script.

Run this script periodically (e.g., hourly) to clean up expired projects
and stale resources.

Usage:
    python scripts/cleanup_cron.py

Or add to crontab:
    0 * * * * cd /path/to/api && python scripts/cleanup_cron.py >> /var/log/buildonx-cleanup.log 2>&1
"""

import asyncio
import sys
import os
from datetime import datetime

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.cleanup import run_cleanup
from app.services.alerts import alerts


async def main():
    print(f"[{datetime.utcnow().isoformat()}] Starting cleanup...")
    
    try:
        results = await run_cleanup()
        
        # Log results
        total_cleaned = 0
        for task, result in results.items():
            if isinstance(result, dict):
                cleaned = result.get("deleted", 0) + result.get("cleaned", 0)
                total_cleaned += cleaned
                print(f"  {task}: {result}")
        
        print(f"[{datetime.utcnow().isoformat()}] Cleanup complete. Total cleaned: {total_cleaned}")
        
        # Alert if significant cleanup occurred
        if total_cleaned > 10:
            await alerts.send(
                title="Cleanup Completed",
                message=f"Cleaned up {total_cleaned} resources",
                severity="info",
                fields=results,
            )
    
    except Exception as e:
        print(f"[{datetime.utcnow().isoformat()}] Cleanup failed: {e}")
        await alerts.system_error(str(e), context="cleanup_cron")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

