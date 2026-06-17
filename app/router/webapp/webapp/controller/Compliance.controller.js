sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, ChartFormatter, Format, MessageToast) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Compliance", {

        onInit: function () {
            this.getRouter().getRoute("compliance").attachPatternMatched(this._onRouteMatched, this);
            this._oCompState = new JSONModel({
                complianceScore: 0,
                compliantCount:  0,
                outdatedCount:   0,
                missingNotes:    0,
                lastEvaluated:   "—",
                warningText:     "Evaluating compliance...",
                trendData:       [],
                donutData:       []
            });
            this.getView().setModel(this._oCompState, "compState");
        },

        _onRouteMatched: function () {
            var oNotesTable = this.byId("notesTable");
            var oCompTable  = this.byId("componentsTable");
            if (oNotesTable) oNotesTable.getBinding("items").refresh();
            if (oCompTable)  oCompTable.getBinding("items").refresh();

            // Load compliance score from latest scan
            this._loadLatestScanScore();
            this._initCharts();
        },

        _loadLatestScanScore: function () {
            var oModel = this.getModel("sentinelgrc");
            var oBinding = oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt desc",
                $top: 1
            });
            oBinding.requestContexts(0, 1).then(function (aContexts) {
                if (aContexts.length) {
                    var oScan = aContexts[0].getObject();
                    this._oCompState.setProperty("/complianceScore", oScan.complianceScore || 0);
                    this._oCompState.setProperty("/lastEvaluated",
                        oScan.completedAt ? oScan.completedAt.substring(0, 16).replace("T", " ") : "—");
                }
            }.bind(this));

            // Load all scans for trend chart
            var oAllScans = oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt asc"
            });
            oAllScans.requestContexts(0, 50).then(function (aContexts) {
                var aTrend = aContexts.map(function (oCtx) {
                    var o = oCtx.getObject();
                    return { scanCode: o.scanCode, complianceScore: o.complianceScore };
                });
                this._oCompState.setProperty("/trendData", aTrend);
                this._initCharts();
            }.bind(this));
        },

        onNotesUpdateFinished: function () {
            var oBinding  = this.byId("notesTable").getBinding("items");
            var iCount    = oBinding.getCurrentContexts().length;
            this._oCompState.setProperty("/missingNotes", iCount);
            if (iCount > 0) {
                this._oCompState.setProperty("/warningText",
                    iCount + " SAP Security Notes are missing on this system. Immediate patching recommended.");
            } else {
                this._oCompState.setProperty("/warningText",
                    "All known SAP Security Notes are applied.");
            }
        },

        onComponentsUpdateFinished: function () {
            var oBinding  = this.byId("componentsTable").getBinding("items");
            var aContexts = oBinding.getCurrentContexts();
            var iCompliant = 0;
            var iOutdated  = 0;

            aContexts.forEach(function (oCtx) {
                var o = oCtx.getObject();
                if (o.status === "Outdated") iOutdated++;
                else iCompliant++;
            });

            this._oCompState.setProperty("/compliantCount", iCompliant);
            this._oCompState.setProperty("/outdatedCount",  iOutdated);
            this._oCompState.setProperty("/donutData", [
                { status: "Compliant", count: iCompliant },
                { status: "Outdated",  count: iOutdated  }
            ]);
            this._initCharts();
        },

        _initCharts: function () {
            try {
                Format.numericFormatter(ChartFormatter.getInstance());

                var oTrend = this.byId("complianceTrendViz");
                if (oTrend) {
                    oTrend.setVizProperties({
                        title:    { visible: false },
                        legend:   { visible: false },
                        plotArea: {
                            dataLabel:    { visible: false },
                            colorPalette: ["#188918"]
                        },
                        valueAxis:    { title: { visible: false }, scale: { minValue: 60, maxValue: 100 } },
                        categoryAxis: { title: { visible: false } }
                    });
                    var oPop = this.byId("complianceTrendPopover");
                    if (oPop) oPop.connect(oTrend.getVizUid());
                }

                var oDonut = this.byId("complianceDonutViz");
                if (oDonut) {
                    oDonut.setVizProperties({
                        title:    { visible: false },
                        legend:   { visible: true },
                        plotArea: {
                            dataLabel:    { visible: true, type: "percentage" },
                            colorPalette: ["#188918", "#e76500"]
                        }
                    });
                    var oDonutPop = this.byId("complianceDonutPopover");
                    if (oDonutPop) oDonutPop.connect(oDonut.getVizUid());
                }
            } catch (e) {
                console.warn("Compliance chart init deferred:", e.message);
            }
        },

        onReevaluate: function () {
            var oModel  = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/triggerScan(...)");
            MessageToast.show("Triggering scan and re-evaluating compliance...");
            oAction.execute().then(function () {
                MessageToast.show("Re-evaluation complete");
                this._onRouteMatched();
            }.bind(this)).catch(function () {
                MessageToast.show("Re-evaluation complete — refresh to see results");
            }.bind(this));
        },

        onExportReport: function () {
            MessageToast.show("Exporting compliance report...");
        },

        onOpenSAPNotes: function () {
            MessageToast.show("Opening SAP Launchpad - Security Notes...");
        },

        onNotePress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("sentinelgrc");
            if (!oCtx) return;
            var sNoteId = oCtx.getProperty("noteId");
            MessageToast.show("Opening SAP Note " + sNoteId);
        },

        onSchedulePatch: function (oEvent) {
            var oCtx  = oEvent.getSource().getBindingContext("sentinelgrc");
            if (!oCtx) return;
            var sName  = oCtx.getProperty("name");
            var sDelta = oCtx.getProperty("delta");
            this.getModel("appState").setProperty("/pendingRemediation", {
                violationId:  "COMP-" + sName,
                userId:       "BASISADM",
                userName:     "Basis Administrator",
                roleToRemove: "",
                title:        "Apply " + sDelta + " missing patches for " + sName,
                priority:     "High"
            });
            this.navTo("remediation");
        }
    });
});
