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
                        new Filter("roleA", FilterOperator.Contains, sQuery),
                        new Filter("roleB", FilterOperator.Contains, sQuery),
                        new Filter("risk",  FilterOperator.Contains, sQuery)
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
            var oCtx = oEvent.getSource().getBindingContext("rules");
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
            var oRulesModel = this.getModel("rules");
            var aRules = oRulesModel.getProperty("/rules");
            if (oRule.id === "NEW") {
                oRule.id = "R-" + String(aRules.length + 1).padStart(3, "0");
                oRule.hits = 0;
                aRules.push(oRule);
            } else {
                var idx = aRules.findIndex(function (r) { return r.id === oRule.id; });
                if (idx >= 0) aRules[idx] = oRule;
            }
            oRulesModel.setProperty("/rules", aRules);
            this._oRuleEditorDialog.close();
            this.showToast("Rule saved: " + oRule.id);
        },

        onCancelRule: function () {
            this._oRuleEditorDialog.close();
        },

        onToggleRule: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("rules");
            var sPath = oCtx.getPath() + "/enabled";
            var bCurrent = this.getModel("rules").getProperty(sPath);
            this.getModel("rules").setProperty(sPath, !bCurrent);
        },

        onExportYAML: function () {
            this.showToast("Exporting SoD rules YAML…");
        },

        onAuthorWithAI: function () {
            this.showToast("AI Rule Author coming soon…");
        }
    });
});
