'use strict';

const cds = require('@sap/cds');
const {
    extractUsers,
    extractRoleAssignments,
    extractCriticalProfiles,
    extractComponentVersions,
    extractFirefighterRoles
} = require('./s4-connector');
const {
    runSodAnalysis,
    detectCriticalRoles,
    calculateUserRiskScores,
    calculateSystemRiskScore
} = require('./sod-engine');
const {
    evaluateCompliance,
    identifyMissingNotes
} = require('./compliance-engine');
const { SECURITY_NOTES } = require('./security-notes-catalog');
const { buildReport, buildComplianceReport, buildViolationsReport, buildUsersReport, buildCriticalRolesReport, buildSodRulesReport } = require('./report-generator');

module.exports = class SecurityHandler extends cds.ApplicationService {

    async init() {
        const db = await cds.connect.to('db');

        // ── Initialize scan scheduler (node-cron) ────────────────────────
        const scheduler = require('./scheduler');
        scheduler.initScheduler(db, async (sTrigger) => {
            global._sentinelNextTrigger = sTrigger;
            const srv = await cds.connect.to('SecurityService');
            await srv.send('triggerScan', {});
        });


        // ── Seed SAP Security Notes catalog (independent of scans) ──────
        try {
            const sNow = new Date().toISOString();
            for (const oNote of SECURITY_NOTES) {
                await db.run(UPSERT.into('sentinel.db.SecurityNote').entries({
                    noteId:      oNote.noteId,
                    component:   oNote.component,
                    priority:    oNote.priority,
                    category:    oNote.category,
                    description: oNote.description,
                    releaseDate: oNote.releaseDate,
                    noteUrl:     oNote.noteUrl,
                    applied:     false,
                    createdAt:   sNow,
                    modifiedAt:  sNow
                }));
            }
            console.log('[SecurityNotes] Seeded ' + SECURITY_NOTES.length + ' notes from catalog');
        } catch (e) {
            console.log('[SecurityNotes] Seeding skipped:', e.message);
        }

        // ── triggerScan ──────────────────────────────────────────────────
        this.on('triggerScan', async (req) => {
            const sScanId  = cds.utils.uuid();
            const sNow     = new Date().toISOString();
            const sScanCode = 'SC-' + new Date().getFullYear() + '-' +
                              String(Date.now()).slice(-3);
            const sTrigger = global._sentinelNextTrigger || 'Manual';
            global._sentinelNextTrigger = null;
            console.log(`[SecurityHandler] Starting scan ${sScanCode} (trigger: ${sTrigger})...`);
            console.log(`[SecurityHandler] Starting scan ${sScanCode}...`);

            // 1 — Create scan record (Running)
            await db.run(INSERT.into('sentinel.db.ScanResult').entries({
                ID: sScanId, scanCode: sScanCode,
                startedAt: sNow, trigger: sTrigger,
                status: 'Running', createdAt: sNow, modifiedAt: sNow
            }));

            try {
                // 2 — Extract from S/4HANA
                // Sequential extraction for SCC compatibility
                const aUsers = await extractUsers();
                const aRoleAssignments = await extractRoleAssignments();
                const aCritProfiles = await extractCriticalProfiles();
                const aVersions = await extractComponentVersions();


                // 3 — Persist users
                const aUserRecords = aUsers.map(u => ({
                    ...u, createdAt: sNow, modifiedAt: sNow
                }));
                if (aUserRecords.length) {
                    await db.run(
                        UPSERT.into('sentinel.db.SapUser').entries(aUserRecords)
                    );
                }

                // 4 — Persist role assignments
                if (aRoleAssignments.length) {
                    await db.run(DELETE.from('sentinel.db.RoleAssignment'));
                    await db.run(INSERT.into('sentinel.db.RoleAssignment').entries(
                        aRoleAssignments.map(r => ({ ...r, createdAt: sNow, modifiedAt: sNow }))
                    ));
                }

                // 5 — Load SoD rules from HANA
                const aSodRules = await db.run(
                    SELECT.from('sentinel.db.SodRule').where({ active: true })
                );

                // 6 — Run SoD engine
                const aViolations = runSodAnalysis(
                    aUsers, aRoleAssignments, aSodRules, sScanId
                );

                // 7 — Detect critical roles
                const aFirefighterRoles = extractFirefighterRoles(aRoleAssignments);
                const aCriticalRoles = detectCriticalRoles(
                    aRoleAssignments, aCritProfiles, aFirefighterRoles, sScanId
                );

                // 8 — Run compliance engine
                const { components: aComponents, score: iComplianceScore } =
                    evaluateCompliance(aVersions);
                const aMissingNotes = identifyMissingNotes(aComponents);

                // 9 — Calculate risk scores
                const oUserScores = calculateUserRiskScores(aViolations, aCriticalRoles);
                const iRiskScore  = calculateSystemRiskScore(
                    aViolations, aCriticalRoles, aUsers.length
                );

                // 10 — Persist violations
                if (aViolations.length) {
                    await db.run(INSERT.into('sentinel.db.Violation').entries(
                        aViolations.map(v => ({
                            ID: cds.utils.uuid(), ...v,
                            createdAt: sNow, modifiedAt: sNow
                        }))
                    ));
                }

                // 11 — Persist critical roles
                if (aCriticalRoles.length) {
                    await db.run(INSERT.into('sentinel.db.CriticalRoleAssignment').entries(
                        aCriticalRoles.map(r => ({
                            ID: cds.utils.uuid(), ...r,
                            createdAt: sNow, modifiedAt: sNow
                        }))
                    ));
                }

                // 12 — Persist compliance components
                if (aComponents.length) {
                    for (const oComp of aComponents) {
                        await db.run(UPSERT.into('sentinel.db.ComplianceComponent').entries({
                            ...oComp, modifiedAt: sNow
                        }));
                    }
                }

                // 13 — Security notes are seeded at startup (see init)

                // 14 — Update user risk scores
                for (const [sUserId, iScore] of Object.entries(oUserScores)) {
                    await db.run(
                        UPDATE('sentinel.db.SapUser')
                            .set({ riskScore: iScore })
                            .where({ userId: sUserId })
                    );
                }

                // 15 — Complete scan record
                const iDuration = Math.round(
                    (new Date() - new Date(sNow)) / 1000
                );
                const iHigh   = aViolations.filter(v => v.severity === 'High').length;
                const iMedium = aViolations.filter(v => v.severity === 'Medium').length;
                const iLow    = aViolations.filter(v => v.severity === 'Low').length;

                await db.run(
                    UPDATE('sentinel.db.ScanResult').set({
                        completedAt:     new Date().toISOString(),
                        durationSec:     iDuration,
                        status:          'Complete',
                        usersScanned:    aUsers.length,
                        violationsFound: aViolations.length,
                        riskScore:       iRiskScore,
                        complianceScore: iComplianceScore,
                        highCount:       iHigh,
                        mediumCount:     iMedium,
                        lowCount:        iLow,
                        modifiedAt:      new Date().toISOString()
                    }).where({ ID: sScanId })
                );

                // 16 — Audit log
                await db.run(INSERT.into('sentinel.db.AuditLog').entries({
                    ID: cds.utils.uuid(),
                    timestamp:   sNow,
                    action:      'SCAN',
                    entityType:  'ScanResult',
                    entityId:    sScanId,
                    performedBy: req.user?.id || 'system',
                    details:     JSON.stringify({
                        violations: aViolations.length,
                        riskScore: iRiskScore,
                        complianceScore: iComplianceScore
                    })
                }));

                console.log(`[SecurityHandler] Scan ${sScanCode} complete. ` +

                    `${aViolations.length} violations, risk: ${iRiskScore}`);

                // Auto-publish alert to SAP Alert Notification Service
                this.send('sendScanAlert', {}).catch(err => {
                    console.log('[ANS] Auto-alert after scan failed (non-blocking):', err.message);
                });

                return {
                    scanId:     sScanId,
                    violations: aViolations.length,
                    riskScore:  iRiskScore,
                    duration:   iDuration
                };

            } catch (err) {
                console.error('[SecurityHandler] Scan failed:', err.message);
                await db.run(
                    UPDATE('sentinel.db.ScanResult')
                        .set({ status: 'Failed', modifiedAt: new Date().toISOString() })
                        .where({ ID: sScanId })
                );
                return req.error(500, `Scan failed: ${err.message}`);
            }
        });

        // ── openTicket (Jira integration) ────────────────────────────────
        this.on('openTicket', async (req) => {
            const { violationId } = req.data;
            const oViol = await db.run(
                SELECT.one.from('sentinel.db.Violation').where({ ID: violationId })
            );
            if (!oViol) return req.error(404, 'Violation not found');

            const sJiraUrl = (process.env.JIRA_URL || '').replace(/\/$/, '');
            const sEmail   = process.env.JIRA_EMAIL || '';
            const sToken   = process.env.JIRA_TOKEN || '';
            const sProject = process.env.JIRA_PROJECT || 'KAN';
            if (!sJiraUrl || !sToken) return req.error(500, 'Jira not configured');

            const sAuth = Buffer.from(sEmail + ':' + sToken).toString('base64');
            // Severity → Jira priority + SLA due date
            const oPrioMap = { High: 'High', Medium: 'Medium', Low: 'Low' };
            const oSlaDays = { High: 2, Medium: 7, Low: 30 };
            const dDue = new Date();
            dDue.setDate(dDue.getDate() + (oSlaDays[oViol.severity] || 14));
            const sDueDate = dDue.toISOString().substring(0, 10);
            const oBody = {
                fields: {
                    project:   { key: sProject },
                    issuetype: { name: 'Task' },
                    priority:  { name: oPrioMap[oViol.severity] || 'Medium' },
                    duedate:   sDueDate,
                    labels:    ['sentinelgrc', 'sod-violation', (oViol.severity || 'unknown').toLowerCase()],
                    summary:   '[SentinelGRC] ' + oViol.severity + ' SoD Violation: ' +
                               oViol.userId + ' — ' + oViol.roleA + ' + ' + oViol.roleB,
                    description: {
                        type: 'doc', version: 1,
                        content: [
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Violation detected by SentinelGRC automated scan.' }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'User: ' + oViol.userId + ' (' + (oViol.userName || '') + ')' }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Conflicting roles: ' + oViol.roleA + ' + ' + oViol.roleB }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Severity: ' + oViol.severity }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Action required: remove one of the conflicting roles via SU01 and confirm with SU53.' }] }
                        ]
                    }
                }
            };

            const https2 = require('https');
            const oUrl = new URL(sJiraUrl + '/rest/api/3/issue');
            const sResp = await new Promise((resolve, reject) => {
                const r = https2.request({
                    hostname: oUrl.hostname,
                    path:     oUrl.pathname,
                    method:   'POST',
                    headers: {
                        'Authorization': 'Basic ' + sAuth,
                        'Content-Type':  'application/json',
                        'Accept':        'application/json'
                    }
                }, res => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve(d);
                        else reject(new Error('Jira ' + res.statusCode + ': ' + d.slice(0, 300)));
                    });
                });
                r.on('error', reject);
                r.setTimeout(30000, () => r.destroy(new Error('Jira timeout')));
                r.write(JSON.stringify(oBody));
                r.end();
            });
            const oResp = JSON.parse(sResp);
            console.log('[Jira] Created ticket', oResp.key);

            // Audit log (status update wrapped so enum mismatch never breaks ticket creation)
            try {
                await db.run(INSERT.into('sentinel.db.AuditLog').entries({
                    ID: cds.utils.uuid(), timestamp: new Date().toISOString(),
                    action: 'TICKET', entityType: 'Violation', entityId: violationId,
                    performedBy: req.user?.id || 'system',
                    details: JSON.stringify({ ticket: oResp.key })
                }));
            } catch (e) { console.log('[Jira] audit log skipped:', e.message); }

            return {
                ticketKey: oResp.key,
                ticketUrl: sJiraUrl + '/browse/' + oResp.key
            };
        });

        // ── applyNote (mark security note as applied) ────────────────────
        this.on('applyNote', async (req) => {
            const { noteId } = req.data;
            await db.run(
                UPDATE('sentinel.db.SecurityNote')
                    .set({ applied: true, modifiedAt: new Date().toISOString() })
                    .where({ noteId: noteId })
            );
            return true;
        });

        // ── openNoteTicket (Jira ticket for a security note) ─────────────
        this.on('openNoteTicket', async (req) => {
            const { noteId } = req.data;
            const oNote = await db.run(
                SELECT.one.from('sentinel.db.SecurityNote').where({ noteId: noteId })
            );
            if (!oNote) return req.error(404, 'Note not found');

            const sJiraUrl = (process.env.JIRA_URL || '').replace(/\/$/, '');
            const sEmail   = process.env.JIRA_EMAIL || '';
            const sToken   = process.env.JIRA_TOKEN || '';
            const sProject = process.env.JIRA_PROJECT || 'KAN';
            if (!sJiraUrl || !sToken) return req.error(500, 'Jira not configured');

            const sAuth = Buffer.from(sEmail + ':' + sToken).toString('base64');
            const oSla = { High: 2, Medium: 14, Low: 30 };
            const dDue = new Date();
            dDue.setDate(dDue.getDate() + (oSla[oNote.priority] || 14));

            const oBody = {
                fields: {
                    project:   { key: sProject },
                    issuetype: { name: 'Task' },
                    priority:  { name: oNote.priority || 'Medium' },
                    duedate:   dDue.toISOString().substring(0, 10),
                    labels:    ['sentinelgrc', 'security-note', (oNote.category || '').toLowerCase().replace(/\s+/g,'-')],
                    summary:   '[SentinelGRC] Apply SAP Note ' + oNote.noteId + ' — ' + (oNote.component || ''),
                    description: {
                        type: 'doc', version: 1,
                        content: [
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Missing SAP Security Note detected by SentinelGRC.' }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Note: ' + oNote.noteId + ' (' + (oNote.category || '') + ', priority ' + oNote.priority + ')' }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Component: ' + (oNote.component || '') }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: (oNote.description || '') }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Reference: https://me.sap.com/notes/' + oNote.noteId }] }
                        ]
                    }
                }
            };

            const https3 = require('https');
            const oUrl = new URL(sJiraUrl + '/rest/api/3/issue');
            const sResp = await new Promise((resolve, reject) => {
                const r = https3.request({
                    hostname: oUrl.hostname, path: oUrl.pathname, method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + sAuth,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }, res => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve(d);
                        else reject(new Error('Jira ' + res.statusCode + ': ' + d.slice(0, 300)));
                    });
                });
                r.on('error', reject);
                r.setTimeout(30000, () => r.destroy(new Error('Jira timeout')));
                r.write(JSON.stringify(oBody));
                r.end();
            });
            const oResp = JSON.parse(sResp);
            console.log('[Jira] Created note ticket', oResp.key);
            return { ticketKey: oResp.key, ticketUrl: sJiraUrl + '/browse/' + oResp.key };
        });

        // ── applyNote (mark security note as applied) ────────────────────
        this.on('applyNote', async (req) => {
            const { noteId } = req.data;
            await db.run(
                UPDATE('sentinel.db.SecurityNote')
                    .set({ applied: true, modifiedAt: new Date().toISOString() })
                    .where({ noteId: noteId })
            );
            return true;
        });

        // ── openNoteTicket (Jira ticket for a security note) ─────────────
        this.on('openNoteTicket', async (req) => {
            const { noteId } = req.data;
            const oNote = await db.run(
                SELECT.one.from('sentinel.db.SecurityNote').where({ noteId: noteId })
            );
            if (!oNote) return req.error(404, 'Note not found');

            const sJiraUrl = (process.env.JIRA_URL || '').replace(/\/$/, '');
            const sEmail   = process.env.JIRA_EMAIL || '';
            const sToken   = process.env.JIRA_TOKEN || '';
            const sProject = process.env.JIRA_PROJECT || 'KAN';
            if (!sJiraUrl || !sToken) return req.error(500, 'Jira not configured');

            const sAuth = Buffer.from(sEmail + ':' + sToken).toString('base64');
            const oSla = { High: 2, Medium: 14, Low: 30 };
            const dDue = new Date();
            dDue.setDate(dDue.getDate() + (oSla[oNote.priority] || 14));

            const oBody = {
                fields: {
                    project:   { key: sProject },
                    issuetype: { name: 'Task' },
                    priority:  { name: oNote.priority || 'Medium' },
                    duedate:   dDue.toISOString().substring(0, 10),
                    labels:    ['sentinelgrc', 'security-note', (oNote.category || '').toLowerCase().replace(/\s+/g,'-')],
                    summary:   '[SentinelGRC] Apply SAP Note ' + oNote.noteId + ' — ' + (oNote.component || ''),
                    description: {
                        type: 'doc', version: 1,
                        content: [
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Missing SAP Security Note detected by SentinelGRC.' }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Note: ' + oNote.noteId + ' (' + (oNote.category || '') + ', priority ' + oNote.priority + ')' }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Component: ' + (oNote.component || '') }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: (oNote.description || '') }] },
                            { type: 'paragraph', content: [{ type: 'text',
                                text: 'Reference: https://me.sap.com/notes/' + oNote.noteId }] }
                        ]
                    }
                }
            };

            const https3 = require('https');
            const oUrl = new URL(sJiraUrl + '/rest/api/3/issue');
            const sResp = await new Promise((resolve, reject) => {
                const r = https3.request({
                    hostname: oUrl.hostname, path: oUrl.pathname, method: 'POST',
                    headers: {
                        'Authorization': 'Basic ' + sAuth,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }, res => {
                    let d = '';
                    res.on('data', c => d += c);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve(d);
                        else reject(new Error('Jira ' + res.statusCode + ': ' + d.slice(0, 300)));
                    });
                });
                r.on('error', reject);
                r.setTimeout(30000, () => r.destroy(new Error('Jira timeout')));
                r.write(JSON.stringify(oBody));
                r.end();
            });
            const oResp = JSON.parse(sResp);
            console.log('[Jira] Created note ticket', oResp.key);
            return { ticketKey: oResp.key, ticketUrl: sJiraUrl + '/browse/' + oResp.key };
        });

        // ── generateReport (full Excel workbook) ──────────────────────────
        this.on('generateReport', async (req) => {
            try {
                const { buffer, filename } = await buildReport(db);
                return { fileName: filename, base64: buffer.toString('base64') };
            } catch (e) {
                return req.error(500, 'Report generation failed: ' + e.message);
            }
        });

        // ── generateComplianceReport (Compliance page only) ───────────────
        this.on('generateComplianceReport', async (req) => {
            try {
                const { buffer, filename } = await buildComplianceReport(db);
                return { fileName: filename, base64: buffer.toString('base64') };
            } catch (e) {
                return req.error(500, 'Report generation failed: ' + e.message);
            }
        });

        // ── generateViolationsReport (Violations page only) ────────────────
        this.on('generateViolationsReport', async (req) => {
            try {
                const { scanId } = req.data;
                const { buffer, filename } = await buildViolationsReport(db, scanId);
                return { fileName: filename, base64: buffer.toString('base64') };
            } catch (e) {
                return req.error(500, 'Report generation failed: ' + e.message);
            }
        });

        // ── generateUsersReport (Users & Risk page only) ────────────────────
        this.on('generateUsersReport', async (req) => {
            try {
                const { buffer, filename } = await buildUsersReport(db);
                return { fileName: filename, base64: buffer.toString('base64') };
            } catch (e) {
                return req.error(500, 'Report generation failed: ' + e.message);
            }
        });

        // ── generateCriticalRolesReport (Critical Roles page only) ─────────
        this.on('generateCriticalRolesReport', async (req) => {
            try {
                const { buffer, filename } = await buildCriticalRolesReport(db);
                return { fileName: filename, base64: buffer.toString('base64') };
            } catch (e) {
                return req.error(500, 'Report generation failed: ' + e.message);
            }
        });

        // ── generateSodRulesReport (SoD Rules page only) ────────────────────
        this.on('generateSodRulesReport', async (req) => {
            try {
                const { buffer, filename } = await buildSodRulesReport(db);
                return { fileName: filename, base64: buffer.toString('base64') };
            } catch (e) {
                return req.error(500, 'Report generation failed: ' + e.message);
            }
        });

        // ── saveScheduleConfig (Settings page: scan scheduling) ────────────
        this.on('saveScheduleConfig', async (req) => {
            const { enabled, cronExpression } = req.data;
            const scheduler = require('./scheduler');
            await db.run(
                UPSERT.into('sentinel.db.ScheduleConfig').entries({
                    ID: 'default', enabled: enabled, cronExpression: cronExpression,
                    modifiedAt: new Date().toISOString()
                })
            );
            if (enabled) {
                scheduler.scheduleJob(cronExpression);
            } else {
                scheduler.stopSchedule();
            }
            console.log('[SecurityHandler] Schedule config saved:', enabled, cronExpression);
            return true;
        });

        // ── recalculateRiskScores (backfill after formula change) ──────────
        this.on('recalculateRiskScores', async (req) => {
            const aScans = await db.run(SELECT.from('sentinel.db.ScanResult').where({ status: 'Complete' }));
            let iUpdated = 0;
            for (const oScan of aScans) {
                const aViol = await db.run(SELECT.from('sentinel.db.Violation').where({ scanId: oScan.ID }));
                const aCrit = await db.run(SELECT.from('sentinel.db.CriticalRoleAssignment').where({ scanId: oScan.ID }));
                const iUsers = oScan.usersScanned || 1;
                const iNewScore = calculateSystemRiskScore(aViol, aCrit, iUsers);
                await db.run(
                    UPDATE('sentinel.db.ScanResult')
                        .set({ riskScore: iNewScore, modifiedAt: new Date().toISOString() })
                        .where({ ID: oScan.ID })
                );
                iUpdated++;
            }
            console.log('[SecurityHandler] Recalculated risk scores for ' + iUpdated + ' scans');
            return { updated: iUpdated };
        });

        // ── sendScanAlert (SAP Alert Notification Service — publish event) ─
        this.on('sendScanAlert', async (req) => {
            try {
                const oScan = await db.run(
                    SELECT.one.from('sentinel.db.ScanResult')
                        .where({ status: 'Complete' })
                        .orderBy({ startedAt: 'desc' })
                );
                if (!oScan) return req.error(404, 'No completed scan to alert on');

                const iHigh   = oScan.highCount   || 0;
                const iMedium = oScan.mediumCount || 0;
                const iLow    = oScan.lowCount    || 0;

                let sSeverity = 'INFO';
                if (iHigh >= 5)      sSeverity = 'FATAL';
                else if (iHigh >= 1) sSeverity = 'ERROR';
                else if (iMedium >= 3) sSeverity = 'WARNING';
                else if (iMedium >= 1) sSeverity = 'NOTICE';

                const sBody = 'Scan ' + oScan.scanCode + ' complete on ' +
                    (oScan.completedAt || '').substring(0, 16).replace('T', ' ') + '. ' +
                    'Users scanned: ' + (oScan.usersScanned || 0) + '. ' +
                    'Violations: ' + (oScan.violationsFound || 0) +
                    ' (' + iHigh + ' High, ' + iMedium + ' Medium, ' + iLow + ' Low). ' +
                    'Compliance: ' + (oScan.complianceScore || 0) + '%. ' +
                    'Risk score: ' + (oScan.riskScore || 0) + '/100.';

                const sAnsUrl   = (process.env.ANS_URL || '').replace(/\/$/, '');
                const sOAuthUrl = process.env.ANS_OAUTH_URL || '';
                const sClientId = process.env.ANS_CLIENT_ID || '';
                const sClientSecret = process.env.ANS_CLIENT_SECRET || '';
                if (!sAnsUrl || !sOAuthUrl || !sClientId || !sClientSecret) {
                    return req.error(500, 'ANS not configured — set ANS_URL, ANS_OAUTH_URL, ANS_CLIENT_ID, ANS_CLIENT_SECRET');
                }

                const https5 = require('https');

                // 1. Get OAuth token
                const oTokenUrl = new URL(sOAuthUrl);
                const sTokenBody = 'grant_type=client_credentials';
                const sBasic = Buffer.from(sClientId + ':' + sClientSecret).toString('base64');
                const sToken = await new Promise((resolve, reject) => {
                    const r = https5.request({
                        hostname: oTokenUrl.hostname,
                        path:     oTokenUrl.pathname + oTokenUrl.search,
                        method:   'POST',
                        headers: {
                            'Authorization': 'Basic ' + sBasic,
                            'Content-Type':  'application/x-www-form-urlencoded',
                            'Content-Length': Buffer.byteLength(sTokenBody)
                        }
                    }, res => {
                        let d = '';
                        res.on('data', c => d += c);
                        res.on('end', () => {
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                try { resolve(JSON.parse(d).access_token); } catch (e) { reject(e); }
                            } else {
                                reject(new Error('OAuth ' + res.statusCode + ': ' + d.slice(0, 300)));
                            }
                        });
                    });
                    r.on('error', reject);
                    r.setTimeout(20000, () => r.destroy(new Error('OAuth timeout')));
                    r.write(sTokenBody);
                    r.end();
                });

                // 2. Publish the event to ANS Producer API
                const oEvent = {
                    eventType:   'SentinelGRC.ScanCompleted',
                    resource: {
                        resourceName: oScan.scanCode,
                        resourceType: 'SapScan',
                        resourceInstance: 'RD1'
                    },
                    severity:    sSeverity,
                    category:    'ALERT',
                    subject:     'SentinelGRC scan ' + oScan.scanCode + ' — ' +
                                 (oScan.violationsFound || 0) + ' violations',
                    body:        sBody,
                    tags: (function () {
                        var t = {};
                        t['ans:source']    = 'SentinelGRC';
                        t.scanCode         = oScan.scanCode;
                        t.highCount        = String(iHigh);
                        t.mediumCount      = String(iMedium);
                        t.lowCount         = String(iLow);
                        t.complianceScore  = String(oScan.complianceScore || 0);
                        t.riskScore        = String(oScan.riskScore || 0);
                        return t;
                    })()
                };
                // clean invalid ans:source key (JSON can't have colon in identifier); replace after JSON.stringify
                const sPayload = JSON.stringify(oEvent);

                const oProdUrl = new URL(sAnsUrl + '/cf/producer/v1/resource-events');
                const sResp = await new Promise((resolve, reject) => {
                    const r = https5.request({
                        hostname: oProdUrl.hostname,
                        path:     oProdUrl.pathname,
                        method:   'POST',
                        headers: {
                            'Authorization': 'Bearer ' + sToken,
                            'Content-Type':  'application/json',
                            'Accept':        'application/json',
                            'Content-Length': Buffer.byteLength(sPayload)
                        }
                    }, res => {
                        let d = '';
                        res.on('data', c => d += c);
                        res.on('end', () => {
                            if (res.statusCode >= 200 && res.statusCode < 300) resolve(d);
                            else reject(new Error('ANS ' + res.statusCode + ': ' + d.slice(0, 400)));
                        });
                    });
                    r.on('error', reject);
                    r.setTimeout(30000, () => r.destroy(new Error('ANS timeout')));
                    r.write(sPayload);
                    r.end();
                });
                console.log('[ANS] Published event for scan', oScan.scanCode, '- severity', sSeverity);

                // Audit log
                try {
                    await db.run(INSERT.into('sentinel.db.AuditLog').entries({
                        ID: cds.utils.uuid(), timestamp: new Date().toISOString(),
                        action: 'ALERT', entityType: 'ScanResult', entityId: oScan.ID,
                        performedBy: req.user?.id || 'system',
                        details: JSON.stringify({ severity: sSeverity, scanCode: oScan.scanCode })
                    }));
                } catch (e) { console.log('[ANS] audit log skipped:', e.message); }

                return { published: true, eventType: 'SentinelGRC.ScanCompleted' };
            } catch (e) {
                console.error('[ANS] Publish failed:', e.message);
                return req.error(500, 'ANS publish failed: ' + e.message);
            }
        });

        // ── acknowledgeViolation ─────────────────────────────────────────
        this.on('acknowledgeViolation', async (req) => {
            const { violationId, mitigatingControl } = req.data;
            await db.run(
                UPDATE('sentinel.db.Violation').set({
                    status:            'Acknowledged',
                    acknowledgedBy:    req.user?.id || 'unknown',
                    mitigatingControl: mitigatingControl || '',
                    modifiedAt:        new Date().toISOString()
                }).where({ ID: violationId })
            );
            return true;
        });

        // ── resolveViolation ─────────────────────────────────────────────
        this.on('resolveViolation', async (req) => {
            await db.run(
                UPDATE('sentinel.db.Violation').set({
                    status:     'Resolved',
                    modifiedAt: new Date().toISOString()
                }).where({ ID: req.data.violationId })
            );
            return true;
        });

        // ── saveRemediationTask ──────────────────────────────────────────
        this.on('saveRemediationTask', async (req) => {
            const d = req.data;
            const sNow = new Date().toISOString();
            const oTask = {
                ID:           cds.utils.uuid(),
                taskCode:     'REM-' + String(Date.now()).slice(-5),
                violationId:  d.violationId,
                userId:       d.userId,
                roleToRemove: d.roleToRemove,
                title:        d.title,
                notes:        d.notes,
                assignedTo:   d.assignedTo,
                priority:     d.priority || 'High',
                status:       'Scheduled',
                scheduledDate: d.scheduledDate,
                dueDate:       d.dueDate,
                createdAt:    sNow,
                modifiedAt:   sNow
            };
            await db.run(INSERT.into('sentinel.db.RemediationTask').entries(oTask));
            return oTask;
        });

        // ── completeRemediationTask ──────────────────────────────────────
        this.on('completeRemediationTask', async (req) => {
            await db.run(
                UPDATE('sentinel.db.RemediationTask').set({
                    status:      'Done',
                    completedAt: new Date().toISOString(),
                    completedBy: req.data.completedBy || req.user?.id || 'unknown',
                    modifiedAt:  new Date().toISOString()
                }).where({ ID: req.data.taskId })
            );
            return true;
        });

        // ── getCurrentRiskScore ──────────────────────────────────────────
        this.on('getCurrentRiskScore', async () => {
            const oLatest = await db.run(
                SELECT.one.from('sentinel.db.ScanResult')
                    .where({ status: 'Complete' })
                    .orderBy({ startedAt: 'desc' })
            );
            if (!oLatest) return {
                riskScore: 0, complianceScore: 0, openViolations: 0,
                criticalRoles: 0, lastScanAt: null, lastScanId: null
            };
            const iOpen = await db.run(
                SELECT.one.from('sentinel.db.Violation')
                    .columns('count(*) as cnt')
                    .where({ status: 'Open' })
            );
            const iCrit = await db.run(
                SELECT.one.from('sentinel.db.CriticalRoleAssignment')
                    .columns('count(*) as cnt')
                    .where({ status: 'Open' })
            );
            return {
                riskScore:      oLatest.riskScore,
                complianceScore: oLatest.complianceScore,
                openViolations:  iOpen?.cnt || 0,
                criticalRoles:   iCrit?.cnt || 0,
                lastScanAt:      oLatest.completedAt,
                lastScanId:      oLatest.scanCode
            };
        });

        // ── getViolationSummary ──────────────────────────────────────────
        this.on('getViolationSummary', async () => {
            const aRows = await db.run(
                SELECT.from('sentinel.db.Violation')
                    .columns('severity', 'count(*) as count')
                    .where({ status: { in: ['Open', 'Acknowledged'] } })
                    .groupBy('severity')
            );
            return JSON.stringify(aRows);
        });

        // ── getComplianceTrend ───────────────────────────────────────────
        this.on('getComplianceTrend', async (req) => {
            const iLimit = req.data.limit || 30;
            const aRows = await db.run(
                SELECT.from('sentinel.db.ScanResult')
                    .columns('scanCode', 'complianceScore', 'riskScore',
                             'violationsFound', 'completedAt')
                    .where({ status: 'Complete' })
                    .orderBy({ startedAt: 'desc' })
                    .limit(iLimit)
            );
            return JSON.stringify(aRows.reverse()); // oldest first for charts
        });

        // ── userInfo ──────────────────────────────────────────────────
        this.on('userInfo', async (req) => {
            const user = req.user;
            console.log("[DEBUG userInfo] user=", JSON.stringify({id: user.id, roles: user.roles, attr: user.attr, is: user.is}));
            // In local dev, anonymous user gets full access
            if (!user.id || user.id === 'anonymous') {
                const id = 'motaz.boubaker@aymax.fr';
                return { name: 'Motaz Boubaker', email: id, given_name: 'Motaz', family_name: 'Boubaker', isAnalyst: true, role: 'Security Analyst' };
            }
            const rolesStr = JSON.stringify(user.roles || "") + JSON.stringify(user.attr || "") + (user.id || "");
            console.log('[userInfo] user.roles:', JSON.stringify(user.roles), 'user.id:', user.id, 'user.attr:', JSON.stringify(user.attr));
            const isAnalyst = (function() { return (
                rolesStr.includes('SecurityAnalyst') || rolesStr.includes('CISO') || (rolesStr.includes('Admin') && !rolesStr.includes('BasisAdmin'))); })();
            const id = user.id || 'motaz.boubaker@aymax.fr';
            const parts = id.split(/[.@]/);
            const given = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'User';
            const family = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
            return {
                name:        given + (family ? ' ' + family : ''),
                email:       id,
                given_name:  given,
                family_name: family,
                isAnalyst:   isAnalyst,
                role:        isAnalyst ? 'Security Analyst' : 'Basis Admin'
            };
        });

        await super.init();
    }
};
