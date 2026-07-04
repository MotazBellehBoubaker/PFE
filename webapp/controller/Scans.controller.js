sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format"
], function (BaseController, JSONModel, ChartFormatter, Format) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Scans", {

        onInit: function () {
            this.getRouter().getRoute("scans").attachPatternMatched(this._onRouteMatched, this);
            this._oScansState = new JSONModel({
                totalScans:       0,
                avgDuration:      0,
                latestRisk:       0,
                latestCompliance: 0,
                latestScanCode:   "",
                chartData:        []
            });
            this.getView().setModel(this._oScansState, "scansState");
        },

        _onRouteMatched: function () {
            var oTable = this.byId("scansTable");
            if (oTable) {
                oTable.getBinding("items").refresh();
            }
            this._initCharts();
        },

        onTableUpdateFinished: function () {
            var oModel = this.getModel("sentinelgrc");
            oModel.bindList("/ScanResults", null, null, null, {
                $orderby: "startedAt desc"
            }).requestContexts(0, 500).then(function (aContexts) {
                var iTotalScans    = aContexts.length;
                var iTotalDuration = 0;
                var aChartData     = [];
                aContexts.forEach(function (oCtx) {
                    var oScan = oCtx.getObject();
                    iTotalDuration += (oScan.durationSec || 0);
                    aChartData.push({
                        scanCode:        oScan.scanCode,
                        riskScore:       oScan.riskScore,
                        violationsFound: oScan.violationsFound,
                        complianceScore: oScan.complianceScore
                    });
                });
                var oLatest = aContexts.length ? aContexts[0].getObject() : {};
                this._oScansState.setProperty("/totalScans",       iTotalScans);
                this._oScansState.setProperty("/avgDuration",
                    iTotalScans ? Math.round(iTotalDuration / iTotalScans) : 0);
                this._oScansState.setProperty("/latestRisk",       oLatest.riskScore       || 0);
                this._oScansState.setProperty("/latestCompliance", oLatest.complianceScore || 0);
                this._oScansState.setProperty("/latestScanCode",   oLatest.scanCode        || "");
                this._oScansState.setProperty("/chartData",        aChartData.reverse());
            }.bind(this));
        },

        _initCharts: function () {
            try {
                Format.numericFormatter(ChartFormatter.getInstance());
                var fmt = ChartFormatter.DefaultPattern;
                var oFrame = this.byId("scansTrendVizFrame");
                if (oFrame) {
                    oFrame.setVizProperties({
                        title:    { visible: false },
                        legend:   { visible: true },
                        plotArea: {
                            dataLabel:    { visible: false },
                            colorPalette: ["#0070f2", "#bb0000", "#107c10"]
                        },
                        valueAxis:    { title: { visible: false } },
                        categoryAxis: { title: { visible: false } }
                    });
                    var oPop = this.byId("scansTrendPopover");
                    if (oPop) oPop.connect(oFrame.getVizUid());
                }
            } catch (e) {
                console.warn("Scans chart init deferred:", e.message);
            }
        },

        onTriggerScan: function () {
            var oModel = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/triggerScan(...)");
            this.showToast("Triggering scan...");
            oAction.execute().then(function () {
                this.showToast("Scan complete — refreshing data");
                this.byId("scansTable").getBinding("items").refresh();
            }.bind(this)).catch(function (err) {
                this.showToast("Scan failed: " + err.message);
            }.bind(this));
        },

        onExport: function () {
            this.showToast("Exporting scan history CSV...");
        },

        onPromoteToTest: function () {
            this.showToast("Transport request created · Awaiting approval");
        }
    });
});
