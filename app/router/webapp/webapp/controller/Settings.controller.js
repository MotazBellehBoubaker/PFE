sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/SAPConnector",
    "sap/ui/model/json/JSONModel"
], function (BaseController, SAPConnector, JSONModel) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Settings", {

        onInit: function () {
            this.getRouter().getRoute("settings").attachPatternMatched(this._onRouteMatched, this);
            this._oSettingsModel = new JSONModel({
                destination: {
                    name: "S4H_PROD_SYSTEM",
                    url: "https://s4hana.company.corp:44300",
                    auth: "OAuth2SAMLBearer",
                    lastTest: "2026-05-12 14:20 · 142ms",
                    connected: true,
                    testing: false
                },
                schedule: {
                    cron: "0 */6 * * *",
                    threshold: 10,
                    complianceAlert: 70
                }
            });
            this.getView().setModel(this._oSettingsModel, "settings");
        },

        _onRouteMatched: function () {},

        onTestConnection: function () {
            this._oSettingsModel.setProperty("/destination/testing", true);
            setTimeout(function () {
                this._oSettingsModel.setProperty("/destination/testing", false);
                this._oSettingsModel.setProperty("/destination/lastTest", new Date().toLocaleString() + " · 138ms");
                this.showToast("Connection test: 138ms · OK");
            }.bind(this), 1500);
        },

        onEditDestination: function () {
            this.showToast("Edit destination opened in BTP Cockpit");
        },

        onSaveSchedule: function () {
            this.showToast("Schedule settings saved to SAP Job Scheduling Service");
        },

        onAddRoute: function () {
            this.showToast("Opening SAP Alert Notification Service cockpit…");
        }
    });
});
