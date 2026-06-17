sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/CopilotService",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (BaseController, CopilotService, Filter, FilterOperator, JSONModel) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.Rules", {

        onInit: function () {
            this.getRouter().getRoute("rules").attachPatternMatched(this._onRouteMatched, this);
            this._oEditorModel = new JSONModel({ rule: null, open: false });
            this.getView().setModel(this._oEditorModel, "editor");
        },

        _onRouteMatched: function () {},

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var oTable = this.byId("rulesTable");
            if (!oTable) return;
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter({
                    filters: [
                        new Filter("roleA",           FilterOperator.Contains, sQuery),
                        new Filter("roleB",           FilterOperator.Contains, sQuery),
                        new Filter("riskDescription", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                })]);
            } else {
                oBinding.filter([]);
            }
        },

        onNewRule: function () {
            this._oEditorModel.setProperty("/rule", { id: "NEW", roleA: "", roleB: "", severity: "Medium", risk: "", enabled: true });
            this._oEditorModel.setProperty("/open", true);
            this._openRuleEditor();
        },

        onEditRule: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("sentinelgrc");
            this._oEditorModel.setProperty("/rule", Object.assign({}, oCtx.getObject()));
            this._oEditorModel.setProperty("/open", true);
            this._openRuleEditor();
        },

        _openRuleEditor: function () {
            if (!this._oRuleEditorDialog) {
                this._oRuleEditorDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "sentinel.security.fragment.RuleEditor",
                    this
                );
                this.getView().addDependent(this._oRuleEditorDialog);
            }
            this._oRuleEditorDialog.open();
        },

        onSaveRule: function () {
            var oRule = this._oEditorModel.getProperty("/rule");
            var oRulesModel = this.getModel("sentinelgrc");
            this._oRuleEditorDialog.close();
            this.showToast("Rule saved: " + oRule.ruleCode);
        },

        onCancelRule: function () {
            this._oRuleEditorDialog.close();
        },

        onToggleRule: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("sentinelgrc");
            this.showToast("Toggle rule: " + oCtx.getProperty("ruleCode"));
        },

        onExportYAML: function () {
            this.showToast("Exporting SoD rules YAML…");
        },

        onAuthorWithAI: function () {
            this.showToast("AI Rule Author coming soon…");
        }
    });
});