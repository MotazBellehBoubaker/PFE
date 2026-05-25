sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format",
    "sap/m/MessageToast"
], function (BaseController, ChartFormatter, Format, MessageToast) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Compliance", {

        onInit: function () {
            this.getRouter().getRoute("compliance").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._initCharts();
        },

        _initCharts: function () {
            try {
                Format.numericFormatter(ChartFormatter.getInstance());
                var fmt = ChartFormatter.DefaultPattern;

                // Compliance trend line
                var oTrend = this.byId("complianceTrendViz");
                if (oTrend) {
                    oTrend.setVizProperties({
                        title: { visible: false },
                        legend: { visible: false },
                        plotArea: {
                            dataLabel: { visible: false },
                            colorPalette: ["#188918"],
                            referenceLine: {
                                line: {
                                    valueAxis: [{
                                        value: 70,
                                        visible: true,
                                        color: "#e76500",
                                        label: { text: "Min 70%", visible: true }
                                    }]
                                }
                            }
                        },
                        valueAxis: {
                            title: { visible: false },
                            label: { formatString: fmt.SHORTFLOAT },
                            scale: { minValue: 60, maxValue: 100 }
                        },
                        categoryAxis: { title: { visible: false } }
                    });
                    var oPop = this.byId("complianceTrendPopover");
                    if (oPop) oPop.connect(oTrend.getVizUid());
                }

                // Status donut
                var oDonut = this.byId("complianceDonutViz");
                if (oDonut) {
                    oDonut.setVizProperties({
                        title: { visible: false },
                        legend: { visible: true },
                        plotArea: {
                            dataLabel: { visible: true, type: "percentage" },
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
            MessageToast.show("Re-evaluating baseline against latest SAP security notes...");
        },

        onExportReport: function () {
            MessageToast.show("Exporting compliance report...");
        },

        onOpenSAPNotes: function () {
            MessageToast.show("Opening SAP Launchpad - Security Notes...");
            // In production: window.open("https://me.sap.com/notes", "_blank");
        },

        onNotePress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("compliance");
            if (!oCtx) return;
            var sNoteId = oCtx.getProperty("noteId");
            MessageToast.show("Opening SAP Note " + sNoteId + " in SAP Support Portal");
            // In production: window.open("https://me.sap.com/notes/" + sNoteId, "_blank");
        },

        onSchedulePatch: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("compliance");
            if (!oCtx) return;
            var sName = oCtx.getProperty("name");
            var sDelta = oCtx.getProperty("delta");
            // Store context for remediation calendar
            var oAppState = this.getModel("appState");
            oAppState.setProperty("/pendingRemediation", {
                violationId:  "COMP-" + sName,
                userId:       "BASISADM",
                userName:     "Basis Administrator",
                roleToRemove: "",
                title:        "Apply " + sDelta + " missing patches for " + sName,
                priority:     "High"
            });
            this.navTo("remediation");
            MessageToast.show("Opening Remediation Calendar for " + sName + " patching");
        }
    });
});
