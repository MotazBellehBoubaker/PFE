'use strict';

// ─────────────────────────────────────────────────────────────────
//  SoD Engine — Analyses user-role pairs against the SoD rule matrix
// ─────────────────────────────────────────────────────────────────

/**
 * Run full SoD analysis
 * @param {Array} aUsers            - from extractUsers()
 * @param {Array} aRoleAssignments  - from extractRoleAssignments()
 * @param {Array} aSodRules         - from HANA db SodRule entity
 * @param {string} sScanId          - UUID of the current scan
 * @returns {Array} violations
 */
function runSodAnalysis(aUsers, aRoleAssignments, aSodRules, sScanId) {
    console.log(`[SodEngine] Running analysis: ${aUsers.length} users, ${aSodRules.length} rules`);

    // Build user → roles map for O(1) lookup
    const oUserRoles = {};
    aRoleAssignments.forEach(r => {
        if (!oUserRoles[r.userId]) oUserRoles[r.userId] = new Set();
        oUserRoles[r.userId].add(r.roleId);
    });

    // Build user → details map
    const oUserDetails = {};
    aUsers.forEach(u => { oUserDetails[u.userId] = u; });

    const aViolations = [];
    const oSeen = new Set(); // Deduplicate: same user+ruleA+ruleB

    aUsers.forEach(oUser => {
        const aUserRoles = oUserRoles[oUser.userId];
        if (!aUserRoles) return;

        aSodRules
            .filter(r => r.active !== false)
            .forEach(oRule => {
                const hasRoleA = aUserRoles.has(oRule.roleA);
                const hasRoleB = aUserRoles.has(oRule.roleB);

                if (hasRoleA && hasRoleB) {
                    const sKey = `${oUser.userId}|${oRule.roleA}|${oRule.roleB}`;
                    if (oSeen.has(sKey)) return;
                    oSeen.add(sKey);

                    aViolations.push({
                        scanId:     sScanId,
                        userId:     oUser.userId,
                        userName:   oUser.userName || oUser.userId,
                        dept:       oUser.department || '',
                        roleA:      oRule.roleA,
                        roleB:      oRule.roleB,
                        ruleId:     oRule.ID,
                        risk:       oRule.riskDescription || '',
                        severity:   oRule.riskLevel || 'Medium',
                        status:     'Open',
                        detectedAt: new Date().toISOString()
                    });
                }
            });
    });

    console.log(`[SodEngine] Found ${aViolations.length} violations`);
    return aViolations;
}

/**
 * Detect critical role assignments (SAP_ALL, firefighter, wildcards)
 * @param {Array} aRoleAssignments
 * @param {Array} aCriticalProfiles - from extractCriticalProfiles()
 * @param {Array} aFirefighterRoles - from extractFirefighterRoles()
 * @param {string} sScanId
 */
function detectCriticalRoles(aRoleAssignments, aCriticalProfiles, aFirefighterRoles, sScanId) {
    const aCritical = [];
    const oSeen = new Set();

    // From UST04 critical profiles
    aCriticalProfiles.forEach(r => {
        const sKey = `${r.userId}|${r.profile}`;
        if (oSeen.has(sKey)) return;
        oSeen.add(sKey);
        aCritical.push({
            scanId:       sScanId,
            userId:       r.userId,
            userName:     r.userId,
            profile:      r.profile,
            criticalType: r.criticalType,
            severity:     'High',
            status:       'Open'
        });
    });

    // From firefighter role patterns
    aFirefighterRoles.forEach(r => {
        const sKey = `${r.userId}|${r.profile}`;
        if (oSeen.has(sKey)) return;
        oSeen.add(sKey);
        aCritical.push({
            scanId:       sScanId,
            userId:       r.userId,
            userName:     r.userId,
            profile:      r.profile,
            criticalType: 'FIREFIGHTER',
            severity:     'High',
            status:       'Open'
        });
    });

    // Wildcard auth object check (S_TCODE with * value)
    aRoleAssignments
        .filter(r => r.roleId && r.roleId.includes('*'))
        .forEach(r => {
            const sKey = `${r.userId}|${r.roleId}`;
            if (oSeen.has(sKey)) return;
            oSeen.add(sKey);
            aCritical.push({
                scanId:       sScanId,
                userId:       r.userId,
                userName:     r.userId,
                profile:      r.roleId,
                criticalType: 'WILDCARD',
                severity:     'Medium',
                status:       'Open'
            });
        });

    console.log(`[SodEngine] Detected ${aCritical.length} critical role assignments`);
    return aCritical;
}

/**
 * Calculate risk score per user
 * Formula: (High violations × 3) + (Medium × 2) + (Low × 1) + (critical roles × 5)
 * Capped at 100
 */
function calculateUserRiskScores(aViolations, aCriticalRoles) {
    const oScores = {};
    const weights = { High: 3, Medium: 2, Low: 1 };

    aViolations.forEach(v => {
        if (!oScores[v.userId]) oScores[v.userId] = 0;
        oScores[v.userId] += weights[v.severity] || 1;
    });

    aCriticalRoles.forEach(r => {
        if (!oScores[r.userId]) oScores[r.userId] = 0;
        oScores[r.userId] += 5;
    });

    // Cap at 100
    Object.keys(oScores).forEach(k => {
        oScores[k] = Math.min(100, oScores[k]);
    });

    return oScores;
}

/**
 * Calculate overall system risk score (0-100)
 */
function calculateSystemRiskScore(aViolations, aCriticalRoles, iTotalUsers) {
    if (!iTotalUsers) return 0;

    const weights = { High: 3, Medium: 2, Low: 1 };
    let iRaw = 0;

    aViolations.forEach(v => { iRaw += weights[v.severity] || 1; });
    aCriticalRoles.forEach(() => { iRaw += 5; });

    // Normalise: if 1% of users have high violations, that is already score 50
    const iNorm = Math.round((iRaw / (iTotalUsers * 0.5)) * 50);
    return Math.min(100, Math.max(0, iNorm));
}

module.exports = {
    runSodAnalysis,
    detectCriticalRoles,
    calculateUserRiskScores,
    calculateSystemRiskScore
};
