sap.ui.define([], function () {
    "use strict";

    // Dynamic context — updated each time the copilot is opened
    var _oContext = {
        scanCode: "SC-2026-001",
        violations: 0,
        riskScore: 0,
        complianceScore: 0,
        usersScanned: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        lastScanAt: null
    };

    function delay(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    function ctx() { return _oContext; }

    function buildResponse(sMsg) {
        var s = sMsg.toLowerCase();
        var v = ctx().violations;
        var r = ctx().riskScore;
        var c = ctx().complianceScore;
        var u = ctx().usersScanned;
        var h = ctx().highCount;
        var m = ctx().mediumCount;
        var l = ctx().lowCount;
        var scan = ctx().scanCode;
        var date = ctx().lastScanAt ? ctx().lastScanAt.substring(0, 10) : new Date().toISOString().substring(0, 10);

        if (s.includes("summarize") || s.includes("today") || s.includes("scan")) {
            return "**Scan Summary — " + scan + "**\n\n" +
                "Completed on **" + date + "** scanning **" + u + " SAP users** across system RD1.\n\n" +
                "- **" + v + " SoD violations** detected (" + h + " High, " + m + " Medium, " + l + " Low)\n" +
                "- **Risk Score:** " + r + "/100 — " + (r >= 80 ? "Critical attention required" : r >= 50 ? "Elevated risk" : "Moderate risk") + "\n" +
                "- **Compliance Score:** " + c + "% — " + (c >= 90 ? "Strong posture" : c >= 70 ? "Acceptable" : "Needs improvement") + "\n\n" +
                (h > 0 ? "⚠️ **" + h + " High-severity violations require immediate action** — users hold conflicting roles in financial approval workflows." : "No critical violations detected.");
        }

        if (s.includes("prioritize") || s.includes("priority") || s.includes("first")) {
            return "**Violation Priority Matrix — " + scan + "**\n\n" +
                "**1. IMMEDIATE (Today)** — " + h + " High-severity violations\n" +
                "Users combining financial creation and approval roles — direct fraud exposure. Remove conflicting roles or implement compensating controls before end of business.\n\n" +
                "**2. THIS WEEK** — " + m + " Medium-severity violations\n" +
                "Privilege escalation risks — users with user admin + role assignment combinations. Schedule access review with IT managers.\n\n" +
                "**3. NEXT SPRINT** — " + l + " Low-severity violations\n" +
                "Reporting and display role overlaps. Low fraud risk but should be cleaned up for compliance. Estimated effort: 2 hours.\n\n" +
                "Total remediation effort: approximately **" + Math.ceil(v * 0.8) + " person-hours** across " + u + " users.";
        }

        if (s.includes("jkowal") || s.includes("high risk user") || s.includes("top risk")) {
            return "**User Risk Analysis**\n\n" +
                "Based on scan **" + scan + "**, the highest-risk users were identified through role assignment analysis across " + u + " accounts.\n\n" +
                "Top risk factors identified:\n" +
                "- **Conflicting financial roles** — combining transaction creation with approval authority\n" +
                "- **Critical profile assignments** — SAP_ALL or equivalent wildcard access\n" +
                "- **Firefighter access** — emergency access IDs used outside approved windows\n\n" +
                "Risk score of **" + r + "/100** indicates " + (r >= 80 ? "critical" : "elevated") + " exposure. " +
                "Recommend immediate SU01 review and role removal for all users scoring above 70.";
        }

        if (s.includes("sap_all") || s.includes("critical role") || s.includes("remediate")) {
            return "**SAP_ALL Remediation Playbook**\n\n" +
                "SAP_ALL grants unrestricted access to all system functions — highest possible risk.\n\n" +
                "**Immediate Steps:**\n" +
                "1. Execute **SU01** → identify all users with SAP_ALL\n" +
                "2. Contact user's manager for business justification\n" +
                "3. Remove SAP_ALL and assign role-based access (SU10 for mass changes)\n" +
                "4. Implement **firefighter access** (GRC Emergency Access) for any legitimate emergency needs\n\n" +
                "**Compensating Controls (interim):**\n" +
                "- Enable audit logging in **SM19** for all SAP_ALL users\n" +
                "- Set up real-time alert in SentinelGRC for SAP_ALL assignment\n" +
                "- Require dual approval for any transactions run by SAP_ALL holders\n\n" +
                "Current scan found **" + ctx().highCount + " critical role violations** — all flagged for immediate review.";
        }

        if (s.includes("changed") || s.includes("new") || s.includes("difference") || s.includes("since")) {
            return "**Changes Since Last Scan**\n\n" +
                "Latest scan **" + scan + "** completed on " + date + ":\n\n" +
                "- **" + v + " violations** detected across **" + u + " users**\n" +
                "- Compliance score: **" + c + "%**\n" +
                "- Risk score: **" + r + "/100**\n\n" +
                (h > 0 ?
                    "🔴 **" + h + " High-severity violations** require immediate attention — these represent the highest change in risk exposure.\n\n" :
                    "✅ No High-severity violations detected in this scan.\n\n") +
                "Run another scan after remediating violations to track improvement. Target: reduce violations to 0 High, compliance above 95%.";
        }

        if (s.includes("compliance")) {
            return "**Compliance Analysis — " + c + "%**\n\n" +
                "Current compliance score of **" + c + "%** is calculated across all active security controls and SAP component versions.\n\n" +
                "The " + (100 - c) + "% gap is driven by:\n" +
                "- **" + v + " open SoD violations** (primary driver)\n" +
                "- Outdated component versions detected during scan\n" +
                "- Critical role assignments not yet remediated\n\n" +
                "**To reach 95% compliance:**\n" +
                "1. Remediate all " + h + " High-severity violations → +3-4%\n" +
                "2. Update flagged SAP components → +1-2%\n" +
                "3. Remove SAP_ALL assignments → +1%\n\n" +
                "Estimated timeline: **5-7 business days** with dedicated basis team effort.";
        }

        if (s.includes("user") || s.includes("who")) {
            return "**User Risk Overview — " + scan + "**\n\n" +
                "Scan analyzed **" + u + " SAP users** and found risk concentrations in:\n\n" +
                "- Finance team: highest SoD violation density (procure-to-pay conflicts)\n" +
                "- Basis team: critical role assignments (SAP_ALL holders)\n\n" +
                "**" + h + " users** are in the High-risk category and should be reviewed immediately. " +
                "Navigate to **Users & Risk** page to see the full risk ranking with individual scores.";
        }

        // Default response
        return "I'm the SentinelGRC Risk Co-pilot, powered by **SAP AI Core**.\n\n" +
            "Latest scan **" + scan + "** shows **" + v + " violations** with a compliance score of **" + c + "%** and risk score of **" + r + "/100** across **" + u + " users**.\n\n" +
            "I can help you with:\n" +
            "- 📊 **Scan summaries** and trend analysis\n" +
            "- 🎯 **Violation prioritization** and remediation playbooks\n" +
            "- 👤 **User risk profiles** and access reviews\n" +
            "- ✅ **Compliance guidance** and gap analysis\n\n" +
            "What would you like to explore?";
    }

    return {

        setContext: function(oData) {
            _oContext = Object.assign(_oContext, oData);
        },

        SCAN_CONTEXT: "SentinelGRC Risk Co-pilot",

        sendMessage: function (sMessage) {
            return delay(900 + Math.random() * 600).then(function () {
                return buildResponse(sMessage);
            });
        },

        generateBriefing: function () {
            return delay(2000).then(function () {
                var v = ctx().violations;
                var r = ctx().riskScore;
                var c = ctx().complianceScore;
                var u = ctx().usersScanned;
                var h = ctx().highCount;
                var scan = ctx().scanCode;
                var date = ctx().lastScanAt ? ctx().lastScanAt.substring(0, 10) : new Date().toISOString().substring(0, 10);

                return "**Executive Security Briefing — SentinelGRC · RD1**\n\n" +
                    "The latest security scan (**" + scan + "**) completed on " + date + " identified **" + v + " active SoD violations** across **" + u + " SAP users**, yielding a risk score of **" + r + "/100** and compliance score of **" + c + "%**. " +
                    (h > 0 ? "The most critical finding involves **" + h + " high-severity violations** where users hold conflicting roles in financial approval workflows, creating direct fraud exposure in the procure-to-pay cycle." : "No high-severity violations were detected in this scan.") + "\n\n" +
                    "**Top 3 Priority Actions:**\n" +
                    "1. " + (h > 0 ? "Immediately revoke conflicting financial roles from the **" + h + " high-severity violation users** — specifically those combining vendor creation with payment approval capabilities." : "Maintain current access controls and schedule quarterly review to sustain compliance posture.") + "\n" +
                    "2. Review and restrict all users identified with **critical role assignments** (SAP_ALL equivalent profiles) — these represent the highest privilege escalation risk in the system.\n" +
                    "3. Schedule emergency access review with business owners for all High-severity violations within **48 hours** and implement compensating controls until roles are remediated.\n\n" +
                    "**Positive Observation:** **" + c + "% compliance score** indicates " + (c >= 90 ? "a strong security posture." : "an acceptable baseline with clear improvement path.") + " The automated detection pipeline successfully identified all violations within seconds of scan initiation, enabling rapid response.";
            });
        },

        generateRemediation: function (oViolation) {
            return delay(1500).then(function () {
                return "**Remediation Playbook — " + (oViolation.userName || oViolation.userId) + "**\n\n" +
                    "**Immediate Action:** Place user account under enhanced monitoring and notify the user's manager.\n\n" +
                    "**Step-by-Step SAP Remediation:**\n" +
                    "1. Log into SAP with basis administrator credentials\n" +
                    "2. Execute transaction **SU01** → enter user ID **" + oViolation.userId + "**\n" +
                    "3. Navigate to the **Roles** tab\n" +
                    "4. Remove role **" + oViolation.roleB + "** (the conflicting role)\n" +
                    "5. Save changes and document in the system notes\n" +
                    "6. Execute **SU53** to verify access removal\n\n" +
                    "**Compensating Controls:**\n" +
                    "- Enable enhanced audit logging for user " + oViolation.userId + " in SM19\n" +
                    "- Require dual approval for all transactions involving " + oViolation.roleA + "\n\n" +
                    "**Preventive Measures:**\n" +
                    "- Add this role combination to SentinelGRC SoD rule engine\n" +
                    "- Implement automated quarterly access review for finance roles\n" +
                    "- Enable real-time alerts for this role combination assignment";
            });
        },

        generateRuleDescription: function (oRule) {
            return delay(1000).then(function () {
                return "This SoD rule detects a conflict between **" + (oRule.roleA || "Role A") + "** and **" + (oRule.roleB || "Role B") + "**. " +
                    "Combining these roles allows a single user to initiate and approve the same business transaction, " +
                    "bypassing the four-eyes principle and creating a " + (oRule.riskLevel || "High") + " risk of fraud or error. " +
                    "This rule is aligned with SAP GRC best practices and SOX compliance requirements.";
            });
        }
    };
});
