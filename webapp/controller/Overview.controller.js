sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/CopilotService",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format"
], function (BaseController, CopilotService, ChartFormatter, Format) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Overview", {

        onInit: function () {
            this.getRouter().getRoute("overview").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._initCharts();
        },

        // ── Chart Initialization ──────────────────────────────────────────
        _initCharts: function () {
            try {
                Format.numericFormatter(ChartFormatter.getInstance());
                var fmt = ChartFormatter.DefaultPattern;

                // ── Trend Line Chart ──
                var oTrend = this.byId("trendVizFrame");
                if (oTrend) {
                    oTrend.setVizProperties({
                        title: { visible: false },
                        legend: { visible: true },
                        plotArea: {
                            dataLabel: { visible: false },
                            colorPalette: ["#0070f2", "#bb0000"]
                        },
                        valueAxis: {
                            title: { visible: false },
                            label: { formatString: fmt.SHORTFLOAT }
                        },
                        categoryAxis: { title: { visible: false } },
                        interaction: { selectability: { mode: "EXCLUSIVE" } }
                    });
                    var oTrendPopover = this.byId("trendPopover");
                    if (oTrendPopover) {
                        oTrendPopover.connect(oTrend.getVizUid());
                        oTrendPopover.setFormatString(fmt.STANDARDFLOAT);
                    }
                }

                // ── Severity Donut ──
                var oDonut = this.byId("donutVizFrame");
                if (oDonut) {
                    oDonut.setVizProperties({
                        title: { visible: false },
                        legend: { visible: true },
                        plotArea: {
                            dataLabel: {
                                visible: true,
                                type: "percentage"
                            },
                            colorPalette: ["#bb0000", "#e76500", "#188918"]
                        }
                    });
                    var oDonutPopover = this.byId("donutPopover");
                    if (oDonutPopover) {
                        oDonutPopover.connect(oDonut.getVizUid());
                        oDonutPopover.setFormatString(fmt.STANDARDFLOAT);
                    }
                }

                // ── Compliance Bar ──
                var oComp = this.byId("complianceVizFrame");
                if (oComp) {
                    oComp.setVizProperties({
                        title: { visible: false },
                        legend: { visible: false },
                        plotArea: {
                            dataLabel: { visible: true },
                            colorPalette: ["#188918", "#e76500"]
                        },
                        valueAxis: { title: { visible: false } },
                        categoryAxis: { title: { visible: false } }
                    });
                    var oCompPopover = this.byId("compliancePopover");
                    if (oCompPopover) {
                        oCompPopover.connect(oComp.getVizUid());
                        oCompPopover.setFormatString(fmt.STANDARDFLOAT);
                    }
                }
            } catch (e) {
                // sap.viz not yet loaded — charts will render on next visit
                console.warn("Chart init deferred:", e.message);
            }
        },

        // ── Scan Trigger ─────────────────────────────────────────────────
        onTriggerScan: function () {
            var oAppState = this.getModel("appState");
            oAppState.setProperty("/scanning", true);
            oAppState.setProperty("/scanProgress", 0);

            var iProgress = 0;
            var oInterval = setInterval(function () {
                iProgress += Math.random() * 18;
                if (iProgress >= 100) {
                    iProgress = 100;
                    clearInterval(oInterval);
                    setTimeout(function () {
                        oAppState.setProperty("/scanning", false);
                        oAppState.setProperty("/scanProgress", 0);
                        this.showToast("Scan SC-2026-032 complete · 4,218 users · 18 violations · Risk: 78");
                    }.bind(this), 400);
                }
                oAppState.setProperty("/scanProgress", iProgress / 100);
            }.bind(this), 280);
        },

        // ── Navigation ───────────────────────────────────────────────────
        onViewAllViolations: function () { this.navTo("violations"); },
        onViewAllUsers:      function () { this.navTo("users"); },
        onNavToCritical:     function () { this.navTo("critical"); },
        onNavToCompliance:   function () { this.navTo("compliance"); },
        onNavTo:             function () { this.navTo("violations"); },
        onViolationPress:    function () { this.navTo("violations"); },
        onUserPress: function (oEvent) {
            var sUserId = oEvent.getSource().getBindingContext("users").getProperty("id");
            this.navTo("userDetail", { userId: sUserId });
        },

        // ── AI ───────────────────────────────────────────────────────────
        onExportOverview: function () { this.showToast("Exporting overview report..."); },

        onGenerateBriefing: function () {
            var oAppState = this.getModel("appState");
            oAppState.setProperty("/execSummaryLoading", true);
            oAppState.setProperty("/execSummary", null);
            CopilotService.generateBriefing()
                .then(function (sResult) {
                    oAppState.setProperty("/execSummary", sResult.replace(/\n/g, "<br/>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"));
                    oAppState.setProperty("/execSummaryLoading", false);
                }.bind(this))
                .catch(function () {
                    oAppState.setProperty("/execSummaryLoading", false);
                    this.showError("Failed to generate briefing. Check API connectivity.");
                }.bind(this));
        },

        onGenerateTriage: function () {
            var oAppState = this.getModel("appState");
            oAppState.setProperty("/triageLoading", true);
            oAppState.setProperty("/triageInsights", null);
            CopilotService.generateTriage()
                .then(function (aResults) {
                    oAppState.setProperty("/triageInsights", aResults);
                    oAppState.setProperty("/triageLoading", false);
                }.bind(this))
                .catch(function () {
                    oAppState.setProperty("/triageLoading", false);
                    this.showError("Failed to analyze violations. Check API connectivity.");
                }.bind(this));
        }
    });
});
