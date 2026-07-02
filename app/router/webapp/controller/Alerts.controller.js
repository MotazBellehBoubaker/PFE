sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, FilterOperator) {
    "use strict";
    return BaseController.extend("sentinel.security.controller.Alerts", {
        onInit: function () {
            this._oAlertsModel = new JSONModel({ alerts: [], sentToday: 0 });
            this.getView().setModel(this._oAlertsModel, "alerts");
            this.getRouter().getRoute("alerts").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            this._loadAlerts();
        },
        _loadAlerts: function () {
            var oModel = this.getModel("sentinelgrc");
            oModel.bindList("/AuditLogs", null, null, null, {
                $orderby: "timestamp desc"
            }).requestContexts(0, 100).then(function (aCtx) {
                var today = new Date().toISOString().substring(0, 10);
                var aAlerts = aCtx.map(function (oCtx) {
                    var o = oCtx.getObject();
                    var sDetails = "";
                    try { sDetails = JSON.parse(o.details || "{}"); } catch(e) { sDetails = {}; }
                    var sSeverity = o.action === "SCAN" ? "High" :
                                   o.action === "ACKNOWLEDGE" ? "Medium" : "Low";
                    var sSubject = o.action === "SCAN" ?
                        "Security scan completed · " + (sDetails.violations || 0) + " violations detected" :
                        o.action === "ACKNOWLEDGE" ?
                        "Violation acknowledged by " + o.performedBy :
                        o.action + " · " + o.entityType;
                    return {
                        id:        o.ID ? o.ID.substring(0, 8).toUpperCase() : "",
                        time:      o.timestamp ? o.timestamp.substring(0, 16).replace("T", " ") : "",
                        severity:  sSeverity,
                        subject:   sSubject,
                        channel:   "System",
                        recipient: o.performedBy || "system",
                        status:    "Delivered",
                        rawTime:   o.timestamp || ""
                    };
                });
                var iToday = aAlerts.filter(function(a) {
                    return a.rawTime.substring(0, 10) === today;
                }).length;
                this._oAlertsModel.setProperty("/alerts", aAlerts);
                this._oAlertsModel.setProperty("/sentToday", iToday);
            }.bind(this));
        },
        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var aAlerts = this._oAlertsModel.getProperty("/alerts") || [];
            if (sQuery) {
                aAlerts = aAlerts.filter(function(a) {
                    return a.subject.toLowerCase().includes(sQuery.toLowerCase());
                });
            } else {
                this._loadAlerts();
                return;
            }
            this._oAlertsModel.setProperty("/alerts", aAlerts);
        },
        onSeverityFilter: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            this._loadAlerts();
            if (sKey && sKey !== "All") {
                var aAlerts = this._oAlertsModel.getProperty("/alerts") || [];
                aAlerts = aAlerts.filter(function(a) { return a.severity === sKey; });
                this._oAlertsModel.setProperty("/alerts", aAlerts);
            }
        },
        onManageRoutes: function () {
            this.showToast("Opening alert route manager…");
        }
    });
});
