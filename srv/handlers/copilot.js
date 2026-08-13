'use strict';

/*
 * The AI surface: the Risk Co-pilot chat plus the four one-shot generators
 * behind the "AI" buttons (executive briefing, remediation playbook, SoD rule
 * description).
 *
 * The model never queries the database itself. Instead every call carries a
 * freshly-built snapshot of the latest scan (totals, plus the highest-severity
 * open violations) in the system prompt, so answers cite real user IDs and
 * role names rather than plausible-sounding invented ones.
 *
 * Every builder here returns null when AI Core is not configured, and lets a
 * genuine call failure throw so the caller can log it. Either way the UI falls
 * back to its built-in text — a briefing written from a template is better than
 * an error dialog during a demo.
 */

const cds = require('@sap/cds');
const { isConfigured, chat } = require('../lib/ai-core');

// Enough violations to reason about priorities without pushing the whole table
// through the context window on every message.
const MAX_VIOLATIONS_IN_CONTEXT = 15;

const SYSTEM_PREAMBLE =
    'You are the SentinelGRC Risk Co-pilot, an SAP GRC security analyst assistant ' +
    'embedded in a compliance platform. You advise on segregation-of-duties (SoD) ' +
    'violations, critical role assignments, user risk and remediation in SAP.\n\n' +
    'Ground every answer in the scan data below. Cite the actual user IDs, role ' +
    'names and counts it contains — never invent a user, role or number. If the ' +
    'data does not cover what was asked, say so and suggest what scan or page ' +
    'would show it.\n\n' +
    'Answer in Markdown, concisely: a couple of short paragraphs or a tight list. ' +
    'Reference SAP transactions (SU01, SU10, SU53, SM19, PFCG) where they are the ' +
    'concrete next step.';

/** Format the latest scan and its open violations as the model's context block. */
function formatContext(oScan, aViolations, iCriticalRoles) {
    if (!oScan) {
        return '\n\n--- SCAN DATA ---\nNo scan has completed yet in this system.';
    }

    const sDate = oScan.completedAt ? String(oScan.completedAt).substring(0, 10) : 'in progress';
    const aLines = [
        '',
        '',
        '--- SCAN DATA ---',
        `Scan: ${oScan.scanCode} (system RD1), completed ${sDate}`,
        `Users scanned: ${oScan.usersScanned}`,
        `SoD violations: ${oScan.violationsFound} total — ${oScan.highCount} High, ${oScan.mediumCount} Medium, ${oScan.lowCount} Low`,
        `Risk score: ${oScan.riskScore}/100`,
        `Compliance score: ${oScan.complianceScore}%`,
        `Critical role assignments (SAP_ALL / firefighter): ${iCriticalRoles}`
    ];

    if (aViolations.length) {
        aLines.push('', `Open violations (highest severity first, up to ${MAX_VIOLATIONS_IN_CONTEXT}):`);
        aViolations.forEach((v) => {
            aLines.push(
                `- ${v.severity} | user ${v.userId}${v.userName ? ' (' + v.userName + ')' : ''}` +
                `${v.dept ? ', ' + v.dept : ''} | ${v.roleA} + ${v.roleB}` +
                `${v.risk ? ' | ' + v.risk : ''}`
            );
        });
    } else {
        aLines.push('', 'No open violations.');
    }

    return aLines.join('\n');
}

/** Read the latest scan plus its open violations straight from the database. */
async function loadContext() {
    const { ScanResult, Violation, CriticalRoleAssignment } = cds.entities('sentinel.db');

    const oScan = await SELECT.one.from(ScanResult).orderBy('startedAt desc');
    if (!oScan) return { oScan: null, aViolations: [], iCriticalRoles: 0 };

    // 'High' before 'Medium' before 'Low' is not alphabetical, so sort by the
    // severity ranking the UI uses rather than by the column itself.
    const aOpen = await SELECT.from(Violation)
        .where({ scanId: oScan.ID, status: 'Open' });

    const oRank = { High: 0, Medium: 1, Low: 2 };
    aOpen.sort((a, b) => (oRank[a.severity] ?? 3) - (oRank[b.severity] ?? 3));

    const aCritical = await SELECT.from(CriticalRoleAssignment).where({ scanId: oScan.ID });

    return {
        oScan,
        aViolations:    aOpen.slice(0, MAX_VIOLATIONS_IN_CONTEXT),
        iCriticalRoles: aCritical.length
    };
}

/**
 * Answer one chat message, or return null when the co-pilot should fall back
 * to its built-in responses.
 *
 * `sHistory` is the prior turns as a JSON array of { role, content }; the UI
 * sends the last few so follow-up questions keep their thread.
 */
async function buildReply(sMessage, sHistory) {
    if (!isConfigured()) return null;

    let aHistory = [];
    try {
        const aParsed = JSON.parse(sHistory || '[]');
        if (Array.isArray(aParsed)) {
            aHistory = aParsed
                .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
                .slice(-8);
        }
    } catch {
        aHistory = [];
    }

    const { oScan, aViolations, iCriticalRoles } = await loadContext();
    const sSystem = SYSTEM_PREAMBLE + formatContext(oScan, aViolations, iCriticalRoles);

    return await chat(sSystem, aHistory, sMessage);
}

// ── One-shot generators ──────────────────────────────────────────────────────
//
// The buttons in the UI are not a conversation: each is a single instruction
// answered against the same scan snapshot the co-pilot uses. They share the
// grounding rules below and differ only in the role and the task.

const GROUNDING_RULES =
    'Ground every statement in the scan data below. Cite the actual user IDs, ' +
    'role names and counts it contains — never invent a user, role or number. ' +
    'If the data does not support a claim, leave the claim out.';

/**
 * Run one instruction against the current scan context and return the text.
 *
 * `sRole` opens the system prompt (who the model is for this task) and
 * `sFormat` closes it (what the answer should look like). Returns null when
 * AI Core is not configured.
 */
async function oneShot(sRole, sFormat, sInstruction) {
    if (!isConfigured()) return null;

    const { oScan, aViolations, iCriticalRoles } = await loadContext();
    const sSystem = sRole + '\n\n' + GROUNDING_RULES + '\n\n' + sFormat +
        formatContext(oScan, aViolations, iCriticalRoles);

    return await chat(sSystem, [], sInstruction);
}

/** CISO-ready summary of the latest scan. */
async function buildBriefing() {
    return await oneShot(
        'You are the SentinelGRC Risk Co-pilot writing an executive security ' +
        'briefing for a CISO on the state of SAP access risk in system RD1.',
        'Write Markdown: one short opening paragraph on the current posture, ' +
        'then a "Top 3 Priority Actions" numbered list, then a one-line closing ' +
        'observation. Name the SAP transactions (SU01, SU10, PFCG, SM19) that ' +
        'are the concrete next step. Keep it under 300 words — it is read before ' +
        'a board meeting, not filed.',
        'Write the executive briefing for the latest scan.'
    );
}

/**
 * Step-by-step remediation for one violation.
 *
 * The violation is re-read from the database rather than trusted from the
 * request, so the playbook describes the roles the user actually holds.
 */
async function buildRemediation(sViolationId) {
    if (!isConfigured()) return null;

    const { Violation } = cds.entities('sentinel.db');
    const oViolation = await SELECT.one.from(Violation).where({ ID: sViolationId });
    if (!oViolation) throw new Error(`Violation ${sViolationId} not found`);

    const sTarget = [
        '',
        '',
        '--- VIOLATION TO REMEDIATE ---',
        `User: ${oViolation.userId}${oViolation.userName ? ' (' + oViolation.userName + ')' : ''}` +
        `${oViolation.dept ? ', ' + oViolation.dept : ''}`,
        `Conflicting roles: ${oViolation.roleA} + ${oViolation.roleB}`,
        `Severity: ${oViolation.severity}`,
        oViolation.risk ? `Risk: ${oViolation.risk}` : ''
    ].filter(Boolean).join('\n');

    return await oneShot(
        'You are an SAP GRC remediation specialist writing a playbook a basis ' +
        'administrator will follow step by step.',
        'Write Markdown with three bolded sections: the SAP steps to remove the ' +
        'conflict (a numbered list naming the exact transactions — SU01, SU10, ' +
        'PFCG, SU53), the compensating controls to apply until it is removed, ' +
        'and the preventive measure that stops it recurring. Say which of the ' +
        'two roles to remove and why that one.' + sTarget,
        `Write the remediation playbook for user ${oViolation.userId}.`
    );
}

/** Business-risk description for a new or edited SoD rule. */
async function buildRuleDescription(sRoleA, sRoleB, sRiskLevel) {
    if (!isConfigured()) return null;
    if (!sRoleA || !sRoleB) throw new Error('roleA and roleB are required');

    return await oneShot(
        'You are an SAP GRC analyst authoring the business-risk description for ' +
        'a segregation-of-duties rule.',
        'Write one paragraph of plain prose — no headings, no lists, no preamble. ' +
        'Say what a single user holding both roles could do end to end, which ' +
        'control it defeats, and the compliance exposure it creates. Three or ' +
        'four sentences.',
        `Describe the ${sRiskLevel || 'High'} risk of one user holding both ` +
        `${sRoleA} and ${sRoleB}.`
    );
}


module.exports = {
    buildReply,
    formatContext,
    buildBriefing,
    buildRemediation,
    buildRuleDescription
};
