sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Returns ValueState for a risk score
         * @param {number} iScore
         * @returns {string} sap.ui.core.ValueState
         */
        riskScoreState: function (iScore) {
            if (iScore >= 80) return "Error";
            if (iScore >= 60) return "Warning";
            return "Success";
        },

        /**
         * Returns ObjectStatus state for severity
         * @param {string} sSeverity
         * @returns {string}
         */
        severityState: function (sSeverity) {
            switch (sSeverity) {
                case "High":   return "Error";
                case "Medium": return "Warning";
                case "Low":    return "Success";
                default:       return "None";
            }
        },

        /**
         * Returns icon for severity
         * @param {string} sSeverity
         * @returns {string}
         */
        severityIcon: function (sSeverity) {
            switch (sSeverity) {
                case "High":   return "sap-icon://error";
                case "Medium": return "sap-icon://alert";
                case "Low":    return "sap-icon://information";
                default:       return "sap-icon://status-inactive";
            }
        },

        /**
         * Returns highlight color for table row by severity
         * @param {string} sSeverity
         * @returns {string} sap.ui.core.MessageType
         */
        rowHighlight: function (sSeverity) {
            switch (sSeverity) {
                case "High":   return "Error";
                case "Medium": return "Warning";
                case "Low":    return "Information";
                default:       return "None";
            }
        },

        /**
         * Returns ObjectStatus state for violation status
         * @param {string} sStatus
         * @returns {string}
         */
        violationStatusState: function (sStatus) {
            switch (sStatus) {
                case "Open":           return "Error";
                case "Acknowledged":   return "Warning";
                case "Resolved":       return "Success";
                default:               return "None";
            }
        },

        /**
         * Returns compliance score color
         * @param {number} iScore
         * @returns {string}
         */
        complianceColor: function (iScore) {
            if (iScore >= 85) return "Good";
            if (iScore >= 70) return "Neutral";
            return "Critical";
        },

        /**
         * Returns icon for connection status
         * @param {boolean} bConnected
         * @returns {string}
         */
        connectionIcon: function (bConnected) {
            return bConnected ? "sap-icon://connected" : "sap-icon://disconnected";
        },

        /**
         * Formats a risk score with color state
         * @param {number} iScore
         * @returns {string}
         */
        formatRiskScore: function (iScore) {
            return iScore ? iScore.toString() : "—";
        },

        /**
         * Returns pipeline stage status icon
         * @param {string} sStatus
         * @returns {string}
         */
        pipelineStageIcon: function (sStatus) {
            switch (sStatus) {
                case "passed":  return "sap-icon://accept";
                case "failed":  return "sap-icon://error";
                case "running": return "sap-icon://process";
                default:        return "sap-icon://pending";
            }
        },

        /**
         * Returns user type state
         * @param {string} sType
         * @returns {string}
         */
        formatDateOnly: function (sDate) {
            if (!sDate) return '—';
            try {
                var d = new Date(sDate);
                if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '—';
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch(e) { return '—'; }
        },
        userTypeLabel: function (sType) {
            var oMap = { 'A': 'Dialog', 'B': 'System', 'C': 'Communication', 'S': 'Service', 'L': 'Reference', '': 'Dialog' };
            return oMap[sType] || sType || 'Dialog';
        },
        userTypeState: function (sType) {
            switch (sType) {
                case "System":  return "Warning";
                case "Service": return "Warning";
                default:        return "None";
            }
        },

        /**
         * Formats an ISO date string to readable format
         * @param {string} sDate
         * @returns {string}
         */
        scanStatusState: function (sStatus) {
            switch (sStatus) {
                case 'Complete': return 'Success';
                case 'Running':  return 'Warning';
                case 'Failed':   return 'Error';
                default:         return 'None';
            }
        },

        userInitials: function (sName) {
            var sParts = sName.trim().split(/[_s-]/);
            if (sParts.length >= 2) {
                return (sParts[0][0] + sParts[1][0]).toUpperCase();
            }
            return sName.substring(0, 2).toUpperCase();
        },

        formatDate: function (sDate) {
            try {
                var oDate = new Date(sDate);
                return oDate.toLocaleDateString("en-GB", {
                    day:   "2-digit",
                    month: "short",
                    year:  "numeric",
                    hour:  "2-digit",
                    minute:"2-digit"
                });
            } catch (e) {
                return sDate;
            }
        }
    };
});
