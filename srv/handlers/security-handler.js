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

module.exports = class SecurityHandler extends cds.ApplicationService {

    async init() {
        const db = await cds.connect.to('db');

        // ── triggerScan ──────────────────────────────────────────────────
        this.on('triggerScan', async (req) => {
            const sScanId  = cds.utils.uuid();
            const sNow     = new Date().toISOString();
            const sScanCode = 'SC-' + new Date().getFullYear() + '-' +
                              String(Date.now()).slice(-3);

            console.log(`[SecurityHandler] Starting scan ${sScanCode}...`);

            // 1 — Create scan record (Running)
            await db.run(INSERT.into('sentinel.db.ScanResult').entries({
                ID: sScanId, scanCode: sScanCode,
                startedAt: sNow, trigger: 'Manual',
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

                // 13 — Persist missing security notes
                if (aMissingNotes.length) {
                    for (const oNote of aMissingNotes) {
                        await db.run(UPSERT.into('sentinel.db.SecurityNote').entries({
                            ...oNote, applied: false,
                            createdAt: sNow, modifiedAt: sNow
                        }));
                    }
                }

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
