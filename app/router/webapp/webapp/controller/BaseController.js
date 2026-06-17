sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sentinel/security/model/formatter"
], function (Controller, History, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("sentinel.security.controller.BaseController", {

        formatter: formatter,

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getModel: function (sName) {
            return this.getView().getModel(sName) || this.getOwnerComponent().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        navTo: function (sRoute, oParameters) {
            this.getRouter().navTo(sRoute, oParameters);
        },

        navBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("overview", {}, true);
            }
        },

        showToast: function (sMessage) {
            MessageToast.show(sMessage, { duration: 3000 });
        },

        showError: function (sMessage) {
            MessageBox.error(sMessage);
        },

        showSuccess: function (sMessage) {
            MessageBox.success(sMessage);
        },

        getAppState: function () {
            return this.getModel("appState");
        },

        setAppState: function (sPath, vValue) {
            this.getModel("appState").setProperty(sPath, vValue);
        }
    });
});
