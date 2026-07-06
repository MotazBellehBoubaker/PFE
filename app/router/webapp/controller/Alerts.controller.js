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
            if (!this._oRoutesDialog) {
                this._oRoutesDialog = new sap.m.Dialog({
                    title: "Alert Routes · SAP Alert Notification Service",
                    contentWidth: "28rem",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Text({
                                    text: "SentinelGRC publishes scan-completion events to SAP Alert Notification Service (ANS). Email, Teams, and other channels are configured as subscriptions in the ANS cockpit.",
                                    wrapping: true
                                }).addStyleClass("sapUiSmallMarginBottom"),
                                new sap.m.Label({ text: "Alert Recipient", labelFor: "routeEmailInput" }).addStyleClass("sapUiTinyMarginBottom"),
                                new sap.m.Input({
                                    id: "routeEmailInput",
                                    value: "motaz.boubaker@aymax.fr",
                                    type: "Email",
                                    enabled: false
                                }).addStyleClass("sapUiSmallMarginBottom"),
                                new sap.m.Text({
                                    text: "Configured in SAP Alert Notification Service · Actions → SentinelGRC-Email",
                                    class: "sapUiTinyMarginTop"
                                }).addStyleClass("sentinelSuggLabel")
                            ]
                        }).addStyleClass("sapUiSmallMargin")
                    ],
                    buttons: [
                        new sap.m.Button({
                            id: "sendAlertBtn",
                            text: "Send Alert Now",
                            type: "Emphasized",
                            icon: "sap-icon://email",
                            press: this.onSendTestAlert.bind(this)
                        }),
                        new sap.m.Button({
                            text: "Open ANS Cockpit",
                            press: function () {
                                window.open("https://emea.cockpit.btp.cloud.sap/cockpit#/globalaccount/1d9033b5-7cac-44ec-9ee1-bcaf49b70d7d/subaccount/f6e04827-3af9-44de-a4b7-4840b1a1efc2/org/896a89da-6f50-4624-87f3-3659736c1a1b/space/944ef988-e909-4898-bcda-ca1dcfdc5a60/service/39d33b51-399d-42f5-bda5-02ac1c7df587/instance/0e1eeea5-c55f-458d-9f79-2ae0eb1a540c/cfansactions", "_blank");
                            }
                        }),
                        new sap.m.Button({
                            text: "Close",
                            press: function () { this._oRoutesDialog.close(); }.bind(this)
                        })
                    ]
                });
            }
            this._oRoutesDialog.open();
        },
        onSendTestAlert: function () {
            var that = this;
            sap.m.MessageBox.confirm(
                "This will publish a live scan-alert event to SAP Alert Notification Service, and an email will be sent to the configured recipient. Continue?",
                {
                    title: "Send Alert",
                    onClose: function (sAction) {
                        if (sAction !== sap.m.MessageBox.Action.OK) return;
                        that._doSendAlert();
                    }
                }
            );
        },
        _doSendAlert: function () {
            var oBtn = this.byId("sendAlertBtn");
            if (oBtn) {
                oBtn.setBusy(true);
                oBtn.setText("Publishing…");
            }
            var oModel  = this.getModel("sentinelgrc");
            var oAction = oModel.bindContext("/sendScanAlert(...)");
            oAction.execute().then(function () {
                var oResult = oAction.getBoundContext().getObject();
                if (oBtn) { oBtn.setBusy(false); oBtn.setText("Send Alert Now"); }
                sap.m.MessageBox.success(
                    "Event " + oResult.eventType + " was published to SAP Alert Notification Service.\n\n" +
                    "An email with the latest scan summary has been dispatched to the configured recipient.",
                    { title: "Alert Sent" }
                );
                this._loadAlerts();
            }.bind(this)).catch(function (err) {
                if (oBtn) { oBtn.setBusy(false); oBtn.setText("Send Alert Now"); }
                sap.m.MessageBox.error("Failed to publish alert: " + (err.message || "unknown error"));
            });
        }
    });
});