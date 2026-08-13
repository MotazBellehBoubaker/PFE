sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/CopilotService",
    "sap/ui/model/json/JSONModel",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format"
], function (BaseController, CopilotService, JSONModel, ChartFormatter, Format) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Overview", {

        onInit: function () {
            this.getRouter().getRoute("overview").attachPatternMatched(this._onRouteMatched, this);
            this._oOvState = new JSONModel({
                latestScanCode:    "—",
                riskScore:         0,
                violationsFound:   0,
                violationSubheader:"",
                complianceScore:   0,
                usersScanned:      0,
                lockedSubheader:   "",
                criticalRoles:     0,
                trendData:         [],
                severityData:      [],
                complianceData:    []
            });
            this.getView().setModel(this._oOvState, "ovState");
        },

        _onRouteMatched: function () {
            this._loadOverviewData();
            this._initCharts();
        },

        _loadOverviewData: function () {
            var oModel = this.getModel("sentinelgrc");

            // Load latest scan
            oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt desc"
            }).requestContexts(0, 1).then(function (aCtx) {
                if (!aCtx.length) return;
                var o = aCtx[0].getObject();
                this._oOvState.setProperty("/latestScanCode",  o.scanCode        || "—");
                this._oOvState.setProperty("/riskScore",       o.riskScore       || 0);
                this._oOvState.setProperty("/violationsFound", o.violationsFound  || 0);
                this._oOvState.setProperty("/complianceScore", o.complianceScore  || 0);
                this._oOvState.setProperty("/usersScanned",    o.usersScanned     || 0);
                this._oOvState.setProperty("/violationSubheader",
                    (o.highCount || 0) + " High · " + (o.mediumCount || 0) + " Med · " + (o.lowCount || 0) + " Low");
                // Update CopilotService with real data for AI features
                CopilotService.setContext({
                    scanCode:        o.scanCode        || 'SC-2026-001',
                    violations:      o.violationsFound || 0,
                    riskScore:       o.riskScore       || 0,
                    complianceScore: o.complianceScore || 0,
                    usersScanned:    o.usersScanned    || 0,
                    highCount:       o.highCount       || 0,
                    mediumCount:     o.mediumCount     || 0,
                    lowCount:        o.lowCount        || 0,
                    lastScanAt:      o.completedAt     || null
                });
                // Filter violations list to latest scan only
                var oViolList = this.byId("recentViolationsList");
                if (oViolList && oViolList.getBinding("items") && o.ID) {
                    var Filter = sap.ui.model.Filter;
                    var FilterOperator = sap.ui.model.FilterOperator;
                    oViolList.getBinding("items").filter([
                        new Filter("scanId", FilterOperator.EQ, o.ID)
                    ]);
                }
            }.bind(this));

            // Load most recent scans for trend (chronological order for the chart)
            oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt desc"
            }).requestContexts(0, 15).then(function (aCtx) {
                var aTrend = aCtx.map(function (c) {
                    var o = c.getObject();
                    return { scanCode: o.scanCode, riskScore: o.riskScore, violationsFound: o.violationsFound };
                }).reverse(); // oldest to newest, left to right
                this._oOvState.setProperty("/trendData", aTrend);
                this._initCharts();
            }.bind(this));

            // Load violations for severity donut
            oModel.bindList("/Violations").requestContexts(0, 200).then(function (aCtx) {
                var iHigh = 0, iMed = 0, iLow = 0;
                aCtx.forEach(function (c) {
                    var s = c.getObject().severity;
                    if (s === "High")   iHigh++;
                    else if (s === "Medium") iMed++;
                    else iLow++;
                });
                this._oOvState.setProperty("/severityData", [
                    { severity: "High",   count: iHigh },
                    { severity: "Medium", count: iMed  },
                    { severity: "Low",    count: iLow  }
                ]);
                this._initCharts();
            }.bind(this));

            // Load compliance components for bar chart
            oModel.bindList("/ComplianceComponents").requestContexts(0, 200).then(function (aCtx) {
                var iCompliant = 0, iOutdated = 0, iUnknown = 0;
                aCtx.forEach(function (c) {
                    var s = c.getObject().status;
                    if (s === "Compliant")  iCompliant++;
                    else if (s === "Outdated") iOutdated++;
                    else iUnknown++;
                });
                this._oOvState.setProperty("/complianceData", [
                    { status: "Compliant", count: iCompliant },
                    { status: "Outdated",  count: iOutdated  },
                    { status: "Unknown",   count: iUnknown   }
                ]);
                this._initCharts();
            }.bind(this));

            // Load critical roles count — scoped to latest scan
            oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt desc"
            }).requestContexts(0, 1).then(function (aLatest) {
                if (!aLatest.length) return;
                var sScanId = aLatest[0].getObject().ID;
                return oModel.bindList("/CriticalRoleAssignments", null, null, null, {
                    $filter: "scanId eq " + sScanId
                }).requestContexts(0, 200);
            }).then(function (aCtx) {
                this._oOvState.setProperty("/criticalRoles", aCtx ? aCtx.length : 0);
            }.bind(this));

            // Load locked users count
            oModel.bindList("/SapUsers").requestContexts(0, 500).then(function (aCtx) {
                var iLocked = aCtx.filter(function (c) { return c.getObject().locked; }).length;
                this._oOvState.setProperty("/lockedSubheader", iLocked + " locked accounts");
            }.bind(this));
        },

        _initCharts: function () {
            try {
                Format.numericFormatter(ChartFormatter.getInstance());
                var fmt = ChartFormatter.DefaultPattern;

                var oTrend = this.byId("trendVizFrame");
                if (oTrend) {
                    oTrend.setVizProperties({
                        title:    { visible: false },
                        legend:   { visible: true },
                        plotArea: {
                            dataLabel:    { visible: false },
                            colorPalette: ["#0070f2", "#bb0000"]
                        },
                        valueAxis:    { title: { visible: false }, label: { formatString: fmt.SHORTFLOAT } },
                        categoryAxis: { title: { visible: false } }
                    });
                    var oPop = this.byId("trendPopover");
                    if (oPop) oPop.connect(oTrend.getVizUid());
                }

                var oDonut = this.byId("donutVizFrame");
                if (oDonut) {
                    oDonut.setVizProperties({
                        title:    { visible: false },
                        legend:   { visible: true },
                        plotArea: {
                            dataLabel:    { visible: true, type: "percentage" },
                            colorPalette: ["#bb0000", "#e76500", "#188918"]
                        }
                    });
                    var oDonutPop = this.byId("donutPopover");
                    if (oDonutPop) oDonutPop.connect(oDonut.getVizUid());
                }

                var oComp = this.byId("complianceVizFrame");
                if (oComp) {
                    oComp.setVizProperties({
                        title:    { visible: false },
                        legend:   { visible: false },
                        plotArea: {
                            dataLabel:    { visible: true },
                            colorPalette: ["#188918", "#e76500", "#888888"]
                        },
                        valueAxis:    { title: { visible: false } },
                        categoryAxis: { title: { visible: false } }
                    });
                    var oCompPop = this.byId("compliancePopover");
                    if (oCompPop) oCompPop.connect(oComp.getVizUid());
                }
            } catch (e) {
                console.warn("Chart init deferred:", e.message);
            }
        },

        onTriggerScan: function () {
            var oAppState = this.getModel("appState");
            var oModel    = this.getModel("sentinelgrc");
            oAppState.setProperty("/scanning", true);
            oAppState.setProperty("/scanProgress", 0);

            var iProgress = 0;
            var oInterval = setInterval(function () {
                iProgress += Math.random() * 18;
                if (iProgress >= 90) iProgress = 90;
                oAppState.setProperty("/scanProgress", iProgress / 100);
            }, 280);

            var oAction = oModel.bindContext("/triggerScan(...)");
            oAction.execute().then(function (oResult) {
                clearInterval(oInterval);
                oAppState.setProperty("/scanProgress", 1);
                setTimeout(function () {
                    oAppState.setProperty("/scanning", false);
                    oAppState.setProperty("/scanProgress", 0);
                    this._loadOverviewData();
                    this.showToast("Scan complete — data refreshed");
                }.bind(this), 400);
            }.bind(this)).catch(function (err) {
                clearInterval(oInterval);
                oAppState.setProperty("/scanning", false);
                this.showToast("Scan failed: " + (err.message || "unknown error"));
            }.bind(this));
        },

        onViewAllViolations: function () { this.navTo("violations"); },
        onViewAllUsers:      function () { this.navTo("users"); },
        onNavToCritical:     function () { this.navTo("critical"); },
        onNavToCompliance:   function () { this.navTo("compliance"); },
        onNavTo:             function () { this.navTo("violations"); },
        onViolationPress:    function () { this.navTo("violations"); },
        onExportOverview: function () {
            var oModel  = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/generateReport(...)");
            this.showToast("Generating full report…");
            oAction.execute().then(function () {
                var oResult = oAction.getBoundContext().getObject();
                var sBinary = atob(oResult.base64);
                var aBytes  = new Uint8Array(sBinary.length);
                for (var i = 0; i < sBinary.length; i++) aBytes[i] = sBinary.charCodeAt(i);
                var oBlob = new Blob([aBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                var sUrl  = URL.createObjectURL(oBlob);
                var oLink = document.createElement("a");
                oLink.href = sUrl;
                oLink.download = oResult.fileName;
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sUrl);
                this.showToast("Report downloaded: " + oResult.fileName);
            }.bind(this)).catch(function (err) {
                sap.m.MessageBox.error("Report generation failed: " + (err.message || "unknown error"));
            });
        },

        onUserPress: function (oEvent) {
            var oCtx    = oEvent.getSource().getBindingContext("sentinelgrc");
            var sUserId = oCtx.getProperty("userId");
            this.navTo("userDetail", { userId: sUserId });
        },

        onGenerateBriefing: function () {
            var oAppState = this.getModel("appState");
            oAppState.setProperty("/execSummaryLoading", true);
            oAppState.setProperty("/execSummary", null);
            CopilotService.generateBriefing()
                .then(function (sResult) {
                    oAppState.setProperty("/execSummary",
                        sResult.replace(/\n/g, "<br/>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"));
                    oAppState.setProperty("/execSummaryLoading", false);
                }.bind(this))
                .catch(function () {
                    oAppState.setProperty("/execSummaryLoading", false);
                    this.showError("Failed to generate briefing.");
                }.bind(this));
        }
    });
});
