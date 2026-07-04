'use strict';
const { SECURITY_NOTES } = require('./security-notes-catalog');

// ─────────────────────────────────────────────────────────────────
//  Compliance Engine — Component baseline + security notes analysis
// ─────────────────────────────────────────────────────────────────

// Baseline required versions — update this as SAP releases new SPs
const COMPONENT_BASELINE = {
    'SAP_BASIS':     { required: '757', minSP: 0 },
    'SAP_ABA':       { required: '756', minSP: 0 },
    'SAP_AP':        { required: '750', minSP: 18 },
    'ABAP_PLATFORM': { required: '2023', minSP: 0 },
    'SAP_HR':        { required: '600', minSP: 88 },
    'WEBCUIF':       { required: '754', minSP: 0 },
    'SAP_FIN':       { required: '617', minSP: 0 },
    'SAP_SCM':       { required: '700', minSP: 0 },
    'SAP_HANA_DB':   { required: '2.00.070', minSP: 0 },
    'SAP_BW':        { required: '750', minSP: 10 }
};

/**
 * Evaluate component versions against baseline
 * @param {Array} aInstalledVersions - from extractComponentVersions()
 * @returns {{ components: Array, score: number }}
 */
function evaluateCompliance(aInstalledVersions) {
    const aResult = [];
    let iCompliant = 0, iTotal = 0;

    // Check each baseline component
    Object.entries(COMPONENT_BASELINE).forEach(([sName, oBaseline]) => {
        const oInstalled = aInstalledVersions.find(v =>
            v.name === sName || v.name.startsWith(sName)
        );

        if (!oInstalled) {
            // Component not found — could be not installed
            aResult.push({
                name:             sName,
                installedVersion: 'NOT FOUND',
                requiredVersion:  oBaseline.required,
                delta:            0,
                status:           'Unknown',
                riskNote:         'Component not detected in system',
                lastChecked:      new Date().toISOString()
            });
            iTotal++;
            return;
        }

        const iInstalledSP = oInstalled.sp || 0;
        const iRequiredSP  = oBaseline.minSP || 0;
        const sInstalledRel = oInstalled.current.split('.')[0];
        const bVersionOk   = sInstalledRel >= oBaseline.required;
        const bSpOk        = bVersionOk && iInstalledSP >= iRequiredSP;
        const iDelta       = bSpOk ? 0 : Math.max(0, iRequiredSP - iInstalledSP);

        const sStatus = bSpOk ? 'Compliant' : 'Outdated';
        if (bSpOk) iCompliant++;
        iTotal++;

        aResult.push({
            name:             sName,
            installedVersion: oInstalled.current,
            requiredVersion:  `${oBaseline.required}.${String(iRequiredSP).padStart(4,'0')}`,
            delta:            iDelta,
            status:           sStatus,
            riskNote:         bSpOk ? 'Up to date' : `${iDelta} missing patches`,
            lastChecked:      new Date().toISOString()
        });
    });

    // Also add installed components not in baseline
    aInstalledVersions
        .filter(v => !COMPONENT_BASELINE[v.name])
        .forEach(v => {
            aResult.push({
                name:             v.name,
                installedVersion: v.current,
                requiredVersion:  v.current,
                delta:            0,
                status:           'Compliant',
                riskNote:         'Not in baseline — no patch requirement',
                lastChecked:      new Date().toISOString()
            });
            iCompliant++;
            iTotal++;
        });

    const iScore = iTotal > 0 ? Math.round((iCompliant / iTotal) * 100) : 0;

    console.log(`[ComplianceEngine] Score: ${iScore}% (${iCompliant}/${iTotal} compliant)`);
    return { components: aResult, score: iScore };
}

/**
 * Identify missing security notes based on outdated components
 * @param {Array} aComponents - from evaluateCompliance().components
 * @param {Array} aAppliedNotes - notes already applied in the system
 * @returns {Array} missing security notes
 */
function identifyMissingNotes(aComponents, aAppliedNotes = []) {
    const aAppliedIds = new Set(aAppliedNotes.map(n => n.noteId));
    // Show the full catalog, minus notes already marked as applied
    return SECURITY_NOTES
        .filter(n => !aAppliedIds.has(n.noteId))
        .map(n => ({
            noteId:      n.noteId,
            component:   n.component,
            priority:    n.priority,
            category:    n.category,
            description: n.description,
            releaseDate: n.releaseDate,
            noteUrl:     n.noteUrl
        }));
}

module.exports = { evaluateCompliance, identifyMissingNotes, COMPONENT_BASELINE };
