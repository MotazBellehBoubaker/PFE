sap.ui.define([], function () {
    "use strict";

    var SCAN_CONTEXT = [
        "You are the Risk Co-pilot for Sentinel, an SAP security posture management platform.",
        "Current scan: SC-2026-031 | Date: 2026-05-12 14:22 | Users: 4,218 | Risk score: 78 | Compliance: 82%",
        "VIOLATIONS (18 open): 7 High, 8 Medium, 3 Low.",
        "Key high violations: JKOWAL (Z_VEND_CREATE + Z_PAYM_APPROVE), AMUELL (Z_PO_CREATE + Z_PO_APPROVE),",
        "TBECKR (Z_VEND_BANK + Z_PAYM_RUN), SLINDQ (Z_USER_CREATE + Z_ROLE_ASSIGN).",
        "CRITICAL ROLES: BASISADM and MROSSI hold SAP_ALL. JKOWAL has Z_FF_FINANCE (firefighter). AMUELL has Z_WILDCARD_MM.",
        "TOP RISK USERS: JKOWAL(94), AMUELL(88), TBECKR(81), SLINDQ(74), MROSSI(68).",
        "COMPLIANCE ISSUES: SAP_BASIS outdated (756→757), SAP_AP outdated, WEBCUIF outdated (CVE-2024-0112).",
        "Answer in a professional, concise tone. Be specific and actionable. Keep answers under 200 words unless asked for detail."
    ].join("\n");

    function callClaude(sUserMessage, sSystemPrompt) {
        return fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                system: sSystemPrompt || SCAN_CONTEXT,
                messages: [{ role: "user", content: sUserMessage }]
            })
        })
        .then(function (oResponse) { return oResponse.json(); })
        .then(function (oData) {
            if (oData.content && oData.content[0]) {
                return oData.content[0].text;
            }
            throw new Error("No content in response");
        });
    }

    return {

        SCAN_CONTEXT: SCAN_CONTEXT,

        /**
         * Send a message to the co-pilot with conversation history
         * @param {string} sMessage
         * @param {Array} aHistory  [{role, content}, ...]
         * @returns {Promise<string>}
         */
        sendMessage: function (sMessage, aHistory) {
            var aMessages = (aHistory || []).slice(-6).concat([{ role: "user", content: sMessage }]);
            return fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    system: SCAN_CONTEXT,
                    messages: aMessages
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.content && d.content[0]) return d.content[0].text;
                throw new Error("No content");
            });
        },

        /**
         * Generate CISO executive briefing
         * @returns {Promise<string>}
         */
        generateBriefing: function () {
            return callClaude(
                "Generate a CISO-ready executive briefing for this security scan. Include: 1) A 2-sentence summary paragraph, 2) Top 3 priority actions numbered, 3) One positive observation. Be specific with user IDs and violation types.",
                SCAN_CONTEXT
            );
        },

        /**
         * Generate smart triage clusters
         * @returns {Promise<Array>}
         */
        generateTriage: function () {
            return callClaude(
                "Cluster the 18 open violations into exactly 3 themed groups. Respond ONLY with a JSON array (no markdown, no preamble): [{\"title\":\"...\",\"count\":N,\"priority\":\"High|Medium|Low\",\"rootCause\":\"...\",\"action\":\"...\"}]",
                SCAN_CONTEXT
            ).then(function (sText) {
                try {
                    return JSON.parse(sText.replace(/```json|```/g, "").trim());
                } catch (e) {
                    return [
                        { title: "Financial Fraud Risk",        count: 7, priority: "High",   rootCause: "Procure-to-pay and vendor payment roles combined on same users",         action: "Remove Z_PAYM_APPROVE from JKOWAL and TBECKR pending access review" },
                        { title: "Privilege Escalation",        count: 5, priority: "High",   rootCause: "User admin roles combined with role assignment capabilities",             action: "Revoke Z_ROLE_ASSIGN from SLINDQ and review all user admin combinations" },
                        { title: "Financial Reporting Integrity",count: 6, priority: "Medium", rootCause: "Journal entry posting and approval roles not segregated in FI module",   action: "Implement dual-control workflow for journal entries" }
                    ];
                }
            });
        },

        /**
         * Generate remediation playbook for a specific violation
         * @param {object} oViolation
         * @returns {Promise<string>}
         */
        generateRemediation: function (oViolation) {
            var sPrompt = "Generate a step-by-step remediation playbook for this SAP SoD violation:\n" +
                "User: " + oViolation.userName + " (" + oViolation.userId + ")\n" +
                "Role A: " + oViolation.roleA + "\n" +
                "Role B: " + oViolation.roleB + "\n" +
                "Business Risk: " + oViolation.risk + "\n" +
                "Severity: " + oViolation.severity + "\n\n" +
                "Provide: 1) Immediate action, 2) Step-by-step SAP remediation steps (with transaction codes), 3) Compensating controls, 4) Preventive measures.";
            return callClaude(sPrompt, SCAN_CONTEXT);
        }
    };
});
