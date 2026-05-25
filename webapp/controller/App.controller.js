sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sentinel/security/service/CopilotService",
    "sap/m/Popover",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/Avatar",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/ScrollContainer",
    "sap/m/Title",
    "sap/m/FormattedText",
    "sap/m/MessageToast",
    "sap/ui/core/Icon",
    "sap/m/ObjectStatus"
], function (
    BaseController, CopilotService,
    Popover, VBox, HBox, Text, Avatar, Button,
    Input, ScrollContainer, Title,
    FormattedText, MessageToast, Icon, ObjectStatus
) {
    "use strict";

    return BaseController.extend("sentinel.security.controller.App", {

        // ── Lifecycle ─────────────────────────────────────────────────────
        onInit: function () {
            this.getView().addStyleClass(
                this.getOwnerComponent().getContentDensityClass()
            );
            this._copilotHistory  = [];
            this._copilotMessages = [];
        },

        onAfterRendering: function () {
            if (this._fabPlaced) return;
            this._fabPlaced = true;

            // Add side panel div to body
            if (!document.getElementById("sentinelCopilotPanel")) {
                var oPanel = document.createElement("div");
                oPanel.id = "sentinelCopilotPanel";
                oPanel.className = "sentinelSidePanel";
                document.body.appendChild(oPanel);
            }

            // Place FAB button — toggles panel open/closed
            var that = this;
            var oFAB = new Button({
                icon: "sap-icon://ai",
                type: "Emphasized",
                tooltip: "Risk Co-pilot",
                press: function () { that._toggleCopilot(); }
            }).addStyleClass("sentinelFABBtn");
            oFAB.placeAt("sentinelFABContainer");
        },

        // ── Navigation ────────────────────────────────────────────────────
        onNavItemSelect: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            var sKey  = oItem.getKey ? oItem.getKey() : "";
            var mMap  = {
                overview:"overview", violations:"violations", users:"users",
                critical:"critical", compliance:"compliance", rules:"rules",
                scans:"scans", remediation:"remediation", alerts:"alerts", settings:"settings"
            };
            if (mMap[sKey]) this.navTo(mMap[sKey]);
        },

        onSideNavToggle: function () {
            var p = this.byId("toolPage");
            p.setSideExpanded(!p.getSideExpanded());
        },

        // ── System Selector ───────────────────────────────────────────────
        onSystemChange: function (oEvent) {
            var sKey    = oEvent.getParameter("selectedItem").getKey();
            var oStatus = this.byId("connectionStatus");
            oStatus.setState("Warning").setText("Connecting...").setIcon("sap-icon://refresh");
            setTimeout(function () {
                oStatus.setState("Success").setText(sKey + " · Connected").setIcon("sap-icon://connected");
                MessageToast.show("Switched to " + sKey + " system");
            }, 1200);
        },

        onNotifications: function () {
            MessageToast.show("3 new alerts: 2 High violations, 1 compliance drop");
        },

        // ── Profile Popover ───────────────────────────────────────────────
        onProfilePress: function (oEvent) {
            if (!this._oProfilePopover) {
                this._oProfilePopover = this._buildProfilePopover();
                this.getView().addDependent(this._oProfilePopover);
            }
            this._oProfilePopover.openBy(oEvent.getSource());
        },

        _buildProfilePopover: function () {
            var that = this;
            return new Popover({
                showHeader : false,
                placement  : "Bottom",
                contentWidth: "300px",
                content: [
                    new VBox({ items: [
                        new HBox({ alignItems: "Center", items: [
                            new Avatar({ initials: "MB", backgroundColor: "Accent6", displaySize: "M" })
                                .addStyleClass("sapUiSmallMarginEnd"),
                            new VBox({ items: [
                                new Title({ text: "Motaz Belleh Boubaker", level: "H5" }),
                                new Text({ text: "SAP Security Intern",          wrapping: false }).addStyleClass("sapUiSmallText"),
                                new Text({ text: "motaz.belleh@company.com",  wrapping: false }).addStyleClass("sapUiSmallText")
                            ]})
                        ]}).addStyleClass("sapUiSmallMarginBottom"),

                        new HBox({ items: [
                            new ObjectStatus({ text: "Sentinel Admin",  state: "Information", icon: "sap-icon://role"      }).addStyleClass("sapUiSmallMarginEnd"),
                            new ObjectStatus({ text: "PRD · Connected", state: "Success",     icon: "sap-icon://connected" })
                        ]}).addStyleClass("sapUiSmallMarginBottom"),

                        new HBox({ alignItems: "Center", items: [
                            new Icon({ src: "sap-icon://time-account" }).addStyleClass("sapUiSmallMarginEnd"),
                            new Text({ text: "Session started 2h ago" }).addStyleClass("sapUiSmallText")
                        ]}).addStyleClass("sapUiSmallMarginBottom"),

                        new Button({ text: "Settings", icon: "sap-icon://settings", width: "100%",
                            press: function () { that._oProfilePopover.close(); that.navTo("settings"); }
                        }).addStyleClass("sapUiSmallMarginBottom"),

                        new Button({ text: "Sign Out", icon: "sap-icon://log", width: "100%", type: "Reject",
                            press: function () { that._oProfilePopover.close(); MessageToast.show("Signing out..."); }
                        })
                    ]}).addStyleClass("sapUiSmallMargin")
                ]
            });
        },

        // ── Co-pilot Side Panel ───────────────────────────────────────────
        _toggleCopilot: function () {
            var oPanel = document.getElementById("sentinelCopilotPanel");
            if (!oPanel) return;
            var bOpen = oPanel.classList.contains("sentinelSidePanelOpen");
            if (bOpen) {
                this._closeCopilotPanel();
            } else {
                this.onOpenCopilot();
            }
        },

        onOpenCopilot: function () {
            if (!this._copilotBuilt) {
                this._buildCopilotPanel();
            }
            // Reset conversation
            this._copilotHistory  = [];
            this._copilotMessages = [];
            this._renderMessages([{
                role: "assistant",
                html: "Hi Motaz \uD83D\uDC4B I'm grounded on <strong>SC-2026-031</strong>. " +
                      "You have <strong style='color:#bb0000'>18 open violations</strong> " +
                      "and a system risk score of <strong>78</strong>. " +
                      "What would you like to know?"
            }]);
            // Slide panel in
            var oPanel = document.getElementById("sentinelCopilotPanel");
            if (oPanel) oPanel.classList.add("sentinelSidePanelOpen");
        },

        _closeCopilotPanel: function () {
            var oPanel = document.getElementById("sentinelCopilotPanel");
            if (oPanel) oPanel.classList.remove("sentinelSidePanelOpen");
        },

        _buildCopilotPanel: function () {
            var that = this;
            this._copilotBuilt = true;

            // Message scroll area
            this._oMsgContainer = new VBox({ width: "100%" });
            var oScroll = new ScrollContainer({
                vertical: true, horizontal: false,
                height: "100%", width: "100%",
                content: [this._oMsgContainer]
            }).addStyleClass("sentinelChatScroll");

            // Suggested chips
            var oSuggLabel = new Text({ text: "SUGGESTED QUESTIONS" })
                .addStyleClass("sentinelSuggLabel");
            var oSuggBox = new HBox({ wrap: "Wrap" })
                .addStyleClass("sentinelSuggBox");
            [
                "Summarize today's scan",
                "Prioritize violations",
                "Why is JKOWAL high risk?",
                "Remediate SAP_ALL",
                "What changed?"
            ].forEach(function (sText) {
                oSuggBox.addItem(
                    new Button({ text: sText, press: function () { that._sendMessage(sText); } })
                        .addStyleClass("sentinelSuggBtn sapUiSmallMarginEnd sapUiTinyMarginBottom")
                );
            });

            // Input row
            this._oCopilotInput = new Input({
                placeholder: "Ask about violations, users, risks...",
                submit: function () { that._onSend(); }
            }).addStyleClass("sentinelChatInput");

            var oInputRow = new HBox({
                alignItems: "Center",
                items: [
                    this._oCopilotInput,
                    new Button({
                        icon: "sap-icon://paper-plane",
                        type: "Emphasized",
                        press: function () { that._onSend(); }
                    }).addStyleClass("sapUiSmallMarginBegin")
                ]
            }).addStyleClass("sentinelChatInputRow");

            // Header
            var oHeader = new HBox({
                alignItems: "Center",
                justifyContent: "SpaceBetween",
                items: [
                    new HBox({ alignItems: "Center", items: [
                        new Avatar({ backgroundColor: "Accent4", displaySize: "XS" })
                            .addStyleClass("sapUiSmallMarginEnd"),
                        new VBox({ items: [
                            new Title({ text: "Risk Co-pilot", level: "H5" }),
                            new HBox({ alignItems: "Center", items: [
                                new ObjectStatus({
                                    text: "SAP AI Core · Powered by Claude",
                                    state: "Success",
                                    icon: "sap-icon://status-positive"
                                }).addStyleClass("sapUiSmallText")
                            ]})
                        ]})
                    ]}),
                    new HBox({ items: [
                        new Button({ icon: "sap-icon://delete",  type: "Transparent", tooltip: "Clear chat",
                            press: function () { that._clearChat(); } }),
                        new Button({ icon: "sap-icon://decline", type: "Transparent", tooltip: "Close",
                            press: function () { that._closeCopilotPanel(); } })
                    ]})
                ]
            }).addStyleClass("sentinelChatHeader");

            // Assemble VBox and render into panel div
            new VBox({
                displayBlock: true,
                items: [oHeader, oScroll, oSuggLabel, oSuggBox, oInputRow]
            }).addStyleClass("sentinelChatInner")
              .placeAt("sentinelCopilotPanel");
        },

        _clearChat: function () {
            this._copilotHistory  = [];
            this._copilotMessages = [];
            this._renderMessages([{
                role: "assistant",
                html: "Chat cleared. How can I help with your SAP security posture?"
            }]);
        },

        _onSend: function () {
            if (!this._oCopilotInput) return;
            var sText = this._oCopilotInput.getValue().trim();
            if (!sText) return;
            this._oCopilotInput.setValue("");
            this._sendMessage(sText);
        },

        _sendMessage: function (sText) {
            this._copilotMessages.push({ role: "user",      html: this._esc(sText) });
            this._copilotMessages.push({ role: "assistant", html: "<em style='color:#888'>Thinking\u2026</em>" });
            this._renderMessages(this._copilotMessages);

            CopilotService.sendMessage(sText, this._copilotHistory.slice(-8))
                .then(function (sReply) {
                    this._copilotHistory.push({ role: "user",      content: sText  });
                    this._copilotHistory.push({ role: "assistant", content: sReply });
                    this._copilotMessages.pop();
                    this._copilotMessages.push({ role: "assistant", html: this._mdToHtml(sReply) });
                    this._renderMessages(this._copilotMessages);
                }.bind(this))
                .catch(function () {
                    this._copilotMessages.pop();
                    this._copilotMessages.push({ role: "assistant",
                        html: "<span style='color:#bb0000'>Connection error. Please try again.</span>" });
                    this._renderMessages(this._copilotMessages);
                }.bind(this));
        },

        _renderMessages: function (aMessages) {
            if (!this._oMsgContainer) return;
            this._oMsgContainer.destroyItems();

            aMessages.forEach(function (oMsg) {
                var bUser   = oMsg.role === "user";
                var oBubble = new VBox({
                    items: [new FormattedText({ htmlText: oMsg.html || "" })]
                }).addStyleClass(bUser ? "sentinelUserBubble" : "sentinelBotBubble");

                var oRow;
                if (bUser) {
                    oRow = new HBox({ justifyContent: "End", items: [oBubble] })
                        .addStyleClass("sapUiSmallMarginBottom");
                } else {
                    oRow = new HBox({
                        alignItems: "Start",
                        items: [
                            new Icon({ src: "sap-icon://ai", color: "Highlight", size: "1rem" })
                                .addStyleClass("sapUiSmallMarginEnd sapUiTinyMarginTop"),
                            new VBox({ items: [
                                new Text({ text: "CO-PILOT" })
                                    .addStyleClass("sentinelSuggLabel sapUiTinyMarginBottom"),
                                oBubble
                            ]})
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom");
                }
                this._oMsgContainer.addItem(oRow);
            }.bind(this));

            // Scroll to bottom
            setTimeout(function () {
                var o = this._oMsgContainer.getParent();
                if (o && o.scrollTo) o.scrollTo(0, 99999);
            }.bind(this), 80);
        },

        _esc: function (s) {
            return String(s)
                .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        },

        _mdToHtml: function (s) {
            return this._esc(s)
                .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                .replace(/`([^`]+)`/g,
                    "<code style='background:#f5f5f5;padding:1px 4px;border-radius:3px;" +
                    "font-family:monospace;font-size:.88em'>$1</code>")
                .replace(/^\s*[-\u2022]\s+(.+)$/gm, "\u2022 $1<br/>")
                .replace(/^\s*\d+\.\s+(.+)$/gm,     "$1<br/>")
                .replace(/\n\n/g, "<br/><br/>")
                .replace(/\n/g,   "<br/>");
        }
    });
});
