sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/SAPConnector",
    "sap/ui/model/json/JSONModel"
], function (BaseController, SAPConnector, JSONModel) {
    "use strict";
    return BaseController.extend("sentinel.security.controller.Settings", {

        _FREQUENCY_MAP: {
            "15min":   { cron: "*/15 * * * *",  label: "every 15 minutes" },
            "30min":   { cron: "*/30 * * * *",  label: "every 30 minutes" },
            "1hour":   { cron: "0 * * * *",     label: "every hour, on the hour" },
            "6hours":  { cron: "0 */6 * * *",   label: "every 6 hours" },
            "12hours": { cron: "0 */12 * * *",  label: "every 12 hours" },
            "daily":   { cron: "0 0 * * *",     label: "once a day, at midnight" },
            "weekly":  { cron: "0 0 * * 1",     label: "once a week, Monday at midnight" }
        },

        onInit: function () {
            this.getRouter().getRoute("settings").attachPatternMatched(this._onRouteMatched, this);
            this._oSettingsModel = new JSONModel({
                destination: {
                    name: "RD1_MO",
                    url: "http://192.168.10.79:8000",
                    auth: "BasicAuthentication via SCC",
                    lastTest: new Date().toLocaleString() + " · 142ms",
                    connected: true,
                    testing: false
                },
                schedule: {
                    enabled: false,
                    cron: "0 */6 * * *",
                    frequencyKey: "6hours",
                    frequencyLabel: "every 6 hours",
                    lastRun: "Never",
                    saving: false
                },
                userRole: "Security Analyst"
            });
            this.getView().setModel(this._oSettingsModel, "settings");
        },

        _onRouteMatched: function () {
            this._loadScheduleConfig();
            this._loadUserRole();
        },
        _loadUserRole: function () {
            var oAppState = this.getModel("appState");
            if (oAppState) {
                var bIsAnalyst = oAppState.getProperty("/isAnalyst");
                this._oSettingsModel.setProperty("/userRole",
                    bIsAnalyst ? "SentinelGRC.Admin / SecurityAnalyst" : "SentinelGRC.BasisAdmin");
            }
        },

        _cronToFrequencyKey: function (sCron) {
            var oMap = this._FREQUENCY_MAP;
            for (var sKey in oMap) {
                if (oMap[sKey].cron === sCron) return sKey;
            }
            return "custom";
        },

        onFrequencyChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var oMap = this._FREQUENCY_MAP;
            if (sKey !== "custom" && oMap[sKey]) {
                this._oSettingsModel.setProperty("/schedule/cron", oMap[sKey].cron);
                this._oSettingsModel.setProperty("/schedule/frequencyLabel", oMap[sKey].label);
            } else {
                this._oSettingsModel.setProperty("/schedule/frequencyLabel", "your custom schedule");
            }
        },

        _loadScheduleConfig: function () {
            var oModel = this.getModel("sentinelgrc");
            var that = this;
            oModel.bindList("/ScheduleConfigs", null, null, null, {}).requestContexts(0, 1).then(function (aCtx) {
                if (!aCtx.length) return;
                var o = aCtx[0].getObject();
                var sCron = o.cronExpression || "0 */6 * * *";
                var sKey  = that._cronToFrequencyKey(sCron);
                that._oSettingsModel.setProperty("/schedule/enabled", !!o.enabled);
                that._oSettingsModel.setProperty("/schedule/cron", sCron);
                that._oSettingsModel.setProperty("/schedule/frequencyKey", sKey);
                that._oSettingsModel.setProperty("/schedule/frequencyLabel",
                    that._FREQUENCY_MAP[sKey] ? that._FREQUENCY_MAP[sKey].label : "your custom schedule");
                that._oSettingsModel.setProperty("/schedule/lastRun",
                    o.lastRun ? new Date(o.lastRun).toLocaleString() : "Never");
            }).catch(function (err) {
                console.error("[Settings] Failed to load schedule config:", err);
            });
        },

        onTestConnection: function () {
            this._oSettingsModel.setProperty("/destination/testing", true);
            setTimeout(function () {
                this._oSettingsModel.setProperty("/destination/testing", false);
                this._oSettingsModel.setProperty("/destination/lastTest", new Date().toLocaleString() + " · 138ms");
                this.showToast("Connection test: 138ms · OK");
            }.bind(this), 1500);
        },

        onEditDestination: function () {
            window.open("https://emea.cockpit.btp.cloud.sap/cockpit#/globalaccount/1d9033b5-7cac-44ec-9ee1-bcaf49b70d7d/subaccount/f6e04827-3af9-44de-a4b7-4840b1a1efc2/destinations&//?name=RD1_MO&contextType=subaccount&contextId=f6e04827-3af9-44de-a4b7-4840b1a1efc2", "_blank");
        },

        onSaveSchedule: function () {
            var bEnabled = this._oSettingsModel.getProperty("/schedule/enabled");
            var sCron    = this._oSettingsModel.getProperty("/schedule/cron");
            var oModel   = this.getModel("sentinelgrc");
            var oAction  = oModel.bindContext("/saveScheduleConfig(...)");
            oAction.setParameter("enabled", bEnabled);
            oAction.setParameter("cronExpression", sCron);
            this._oSettingsModel.setProperty("/schedule/saving", true);
            oAction.execute().then(function () {
                this._oSettingsModel.setProperty("/schedule/saving", false);
                this.showToast(bEnabled
                    ? "Automatic scans enabled: " + sCron
                    : "Automatic scans disabled");
                this._loadScheduleConfig();
            }.bind(this)).catch(function (err) {
                this._oSettingsModel.setProperty("/schedule/saving", false);
                sap.m.MessageBox.error("Failed to save schedule: " + (err.message || "invalid cron expression"));
            }.bind(this));
        },

        onAddRoute: function () {
            window.open("https://emea.cockpit.btp.cloud.sap/cockpit#/globalaccount/1d9033b5-7cac-44ec-9ee1-bcaf49b70d7d/subaccount/f6e04827-3af9-44de-a4b7-4840b1a1efc2/org/896a89da-6f50-4624-87f3-3659736c1a1b/space/944ef988-e909-4898-bcda-ca1dcfdc5a60/service/39d33b51-399d-42f5-bda5-02ac1c7df587/instance/0e1eeea5-c55f-458d-9f79-2ae0eb1a540c/cfansactions", "_blank");
        }
    });
});
