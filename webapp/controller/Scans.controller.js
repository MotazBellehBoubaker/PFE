sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format"
], function (BaseController, ChartFormatter, Format) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Scans", {

        onInit: function () {
            this.getRouter().getRoute("scans").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._initCharts();
        },

        _initCharts: function () {
            try {
                Format.numericFormatter(ChartFormatter.getInstance());
                var fmt = ChartFormatter.DefaultPattern;
                var oFrame = this.byId("scansTrendVizFrame");
                if (oFrame) {
                    oFrame.setVizProperties({
                        title: { visible: false },
                        legend: { visible: true },
                        plotArea: {
                            dataLabel: { visible: false },
                            colorPalette: ["#0070f2", "#bb0000"]
                        },
                        valueAxis:    { title: { visible: false }, label: { formatString: fmt.SHORTFLOAT } },
                        categoryAxis: { title: { visible: false } }
                    });
                    var oPop = this.byId("scansTrendPopover");
                    if (oPop) {
                        oPop.connect(oFrame.getVizUid());
                        oPop.setFormatString(fmt.STANDARDFLOAT);
                    }
                }
            } catch (e) {
                console.warn("Scans chart init deferred:", e.message);
            }
        },

        onTriggerScan: function () {
            this.navTo("overview");
            setTimeout(function () {
                this.showToast("Scan triggered — navigate to Overview to track progress");
            }.bind(this), 300);
        },

        onExport: function () {
            this.showToast("Exporting scan history CSV…");
        },

        onPromoteToTest: function () {
            this.showToast("Transport request created · TMS-2026-031 · Awaiting approval");
        }
    });
});
