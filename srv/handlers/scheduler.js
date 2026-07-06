'use strict';
const cron = require('node-cron');

let _oScheduledTask = null;
let _fnTriggerScanCallback = null;
let _oDb = null;

/**
 * Initialize the scheduler. Reads ScheduleConfig from the DB and
 * (re)schedules the cron job if enabled. Always registers the callback,
 * regardless of whether a schedule is currently active.
 */
async function initScheduler(db, fnTriggerScan) {
    _fnTriggerScanCallback = fnTriggerScan;
    _oDb = db;
    try {
        const oConfig = await db.run(
            SELECT.one.from('sentinel.db.ScheduleConfig').where({ ID: 'default' })
        );
        if (oConfig && oConfig.enabled) {
            scheduleJob(oConfig.cronExpression);
            console.log('[Scheduler] Restored schedule on startup:', oConfig.cronExpression);
        } else {
            console.log('[Scheduler] No active schedule on startup');
        }
    } catch (e) {
        console.log('[Scheduler] Init skipped (no config yet):', e.message);
    }
}

/**
 * (Re)schedule the cron job with a new expression. Stops any existing job first.
 * Uses the db reference and callback registered during initScheduler.
 */
function scheduleJob(sCronExpression) {
    if (_oScheduledTask) {
        _oScheduledTask.stop();
        _oScheduledTask = null;
    }
    if (!cron.validate(sCronExpression)) {
        console.log('[Scheduler] Invalid cron expression, not scheduling:', sCronExpression);
        return false;
    }
    _oScheduledTask = cron.schedule(sCronExpression, async () => {
        console.log('[Scheduler] Firing scheduled scan at', new Date().toISOString());
        try {
            if (_oDb) {
                await _oDb.run(
                    UPDATE('sentinel.db.ScheduleConfig')
                        .set({ lastRun: new Date().toISOString() })
                        .where({ ID: 'default' })
                );
            }
            if (_fnTriggerScanCallback) {
                await _fnTriggerScanCallback('Scheduled');
                console.log('[Scheduler] Callback completed successfully');
            } else {
                console.log('[Scheduler] WARNING: no callback registered');
            }
        } catch (e) {
            console.error('[Scheduler] Scheduled scan failed:', e.message);
            console.error('[Scheduler] Stack:', e.stack);
        }
    });
    console.log('[Scheduler] Job scheduled:', sCronExpression);
    return true;
}

function stopSchedule() {
    if (_oScheduledTask) {
        _oScheduledTask.stop();
        _oScheduledTask = null;
        console.log('[Scheduler] Job stopped');
    }
}

module.exports = { initScheduler, scheduleJob, stopSchedule };
