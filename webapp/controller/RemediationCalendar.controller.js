sap.ui.define([
    "sentinel/security/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/library",
    "sap/ui/core/date/UI5Date",
    "sap/m/MessageToast",
    "sap/ui/core/Item"
], function (
    BaseController, JSONModel, Fragment, DateFormat,
    coreLibrary, UI5Date, MessageToast, Item
) {
    "use strict";

    var ValueState = coreLibrary.ValueState;

    return BaseController.extend("sentinel.security.controller.RemediationCalendar", {

        onInit: function () {
            this.getRouter().getRoute("remediation")
                .attachPatternMatched(this._onRouteMatched, this);
            this._initModel();
        },

        // ── Build the empty model shell; real data comes from the backend ─
        _initModel: function () {
            var oModel = new JSONModel();
            oModel.setData({
                startDate: UI5Date.getInstance(),
                people: this._buildEmptyPeople()
            });
            this.getView().setModel(oModel, "remCal");

            this._oTaskDetail = new JSONModel({ selectedTask: null });
            this.getView().setModel(this._oTaskDetail, "taskDetail");
        },

        // ── Team resource(s) — always shown so the calendar rows and the
        //    "Assign to" picker are never empty ─────────────────────────────
        _buildEmptyPeople: function () {
            return [
                { name: "Motaz Belleh Boubaker", role: "SAP Security Intern", pic: "sap-icon://employee", appointments: [], headers: [] }
            ];
        },

        // ── Load remediation tasks from the CAP backend (RemediationTasks)
        //    and rebuild the calendar model from real, persisted data ──────
        _loadTasksFromBackend: function () {
            var that = this;
            var oODataModel = this.getOwnerComponent().getModel("sentinelgrc");
            var oList = oODataModel.bindList("/RemediationTasks", null, null, null, {
                $orderby: "scheduledDate asc"
            });
            return oList.requestContexts(0, 5000).then(function (aCtx) {
                var aTasks = aCtx.map(function (oCtx) { return oCtx.getObject(); });
                that._applyTasksToCalendar(aTasks);
            }).catch(function (oError) {
                MessageToast.show("Could not load remediation tasks: " + (oError.message || "unknown error"));
            });
        },

        _mapStatusToDisplay: function (sStatus) {
            return sStatus === "InProgress" ? "In Progress" : (sStatus || "Scheduled");
        },

        _applyTasksToCalendar: function (aTasks) {
            var mType = { High: "Type01", Medium: "Type03", Low: "Type08" };
            var aPeople = this._buildEmptyPeople();
            var oUnassigned = null;

            aTasks.forEach(function (oTask) {
                var sStatus = this._mapStatusToDisplay(oTask.status);
                var dStart  = oTask.scheduledDate ? new Date(oTask.scheduledDate) : new Date();
                var dEnd    = oTask.dueDate ? new Date(oTask.dueDate) : new Date(dStart.getTime() + 3600000);

                var oAppt = {
                    id:           oTask.taskCode || oTask.ID,
                    taskId:       oTask.ID,
                    start:        UI5Date.getInstance(dStart.getTime()),
                    end:          UI5Date.getInstance(dEnd.getTime()),
                    title:        oTask.title || "Remediation Task",
                    info:         [oTask.violationId, oTask.notes].filter(Boolean).join(" · "),
                    notes:        oTask.notes || "",
                    violationId:  oTask.violationId || "",
                    userId:       oTask.userId || "",
                    userName:     oTask.userId || "",
                    roleToRemove: oTask.roleToRemove || "",
                    assignedTo:   oTask.assignedTo || "",
                    priority:     oTask.priority || "High",
                    status:       sStatus,
                    type:         sStatus === "Done" ? "Type08" : (mType[oTask.priority] || "Type01"),
                    tentative:    false
                };

                var oOwner = aPeople.filter(function (p) { return p.name === oTask.assignedTo; })[0];
                if (!oOwner) {
                    if (!oUnassigned) {
                        oUnassigned = { name: "Unassigned", role: "Not yet assigned", pic: "sap-icon://employee", appointments: [], headers: [] };
                    }
                    oOwner = oUnassigned;
                }
                oOwner.appointments.push(oAppt);
            }.bind(this));

            if (oUnassigned) aPeople.push(oUnassigned);

            var oModel = this.getView().getModel("remCal");
            oModel.setProperty("/people", aPeople);
            this._buildTasksTable();
        },

        _onRouteMatched: function () {
            // Always land on today, and re-resolve the latest scan on each visit
            this.getView().getModel("remCal").setProperty("/startDate", UI5Date.getInstance());
            this._pLatestScanId = null;
            this._mIssueData    = {};

            this._loadTasksFromBackend();

            var oPending = this.getModel("appState").getProperty("/pendingRemediation");
            if (oPending) {
                this.getModel("appState").setProperty("/pendingRemediation", null);
                // Delay to ensure view + fragment are ready
                setTimeout(function () {
                    this._openCreateDialog("create_prefilled", oPending);
                }.bind(this), 500);
            }
        },

        // ── Appointment select — exact SAP sample pattern ────────────────
        handleAppointmentSelect: function (oEvent) {
            var oAppointment  = oEvent.getParameter("appointment");
            var aAppointments = oEvent.getParameter("appointments");

            if (oAppointment) {
                this._handleSingleAppointment(oAppointment);
            } else if (aAppointments) {
                // group — ignore for now
            }
        },

        _handleSingleAppointment: function (oAppointment) {
            var oView = this.getView();
            if (!oAppointment) return;

            if (!oAppointment.getSelected()) {
                if (this._pDetailsPopover) {
                    this._pDetailsPopover.then(function (oP) { oP.close(); });
                }
                return;
            }

            if (!this._pDetailsPopover) {
                this._pDetailsPopover = Fragment.load({
                    id: oView.getId(),
                    name: "sentinel.security.fragment.RemediationDetails",
                    controller: this
                }).then(function (oP) {
                    oView.addDependent(oP);
                    return oP;
                });
            }

            this._pDetailsPopover.then(function (oP) {
                // Use binding context from the appointment — same as SAP sample
                oP.setBindingContext(oAppointment.getBindingContext("remCal"), "remCal");
                oP.openBy(oAppointment);
            }.bind(this));
        },

        // ── Interval click → open create with prefilled dates ────────────
        handleAppointmentAddWithContext: function (oEvent) {
            this.oClickEventParameters = {
                startDate: oEvent.getParameter("startDate"),
                endDate:   oEvent.getParameter("endDate"),
                row:       oEvent.getParameter("row")
            };
            this._openCreateDialog("create_with_context", null);
        },

        // ── Toolbar add button ───────────────────────────────────────────
        handleAppointmentCreate: function () {
            this._openCreateDialog("create", null);
        },

        // ── Open create dialog ───────────────────────────────────────────
        _openCreateDialog: function (sType, oPrefill) {
            var oView = this.getView();
            if (!this._pCreateDialog) {
                this._pCreateDialog = Fragment.load({
                    id: oView.getId(),
                    name: "sentinel.security.fragment.RemediationCreate",
                    controller: this
                }).then(function (oD) {
                    oView.addDependent(oD);
                    return oD;
                });
            }
            this._pCreateDialog.then(function (oD) {
                oD._sDialogType = sType;
                this._clearCreateDialog();

                if (sType === "create_with_context" && this.oClickEventParameters) {
                    // Pre-fill dates from interval click
                    this.byId("startDate").setDateValue(this.oClickEventParameters.startDate);
                    this.byId("endDate").setDateValue(this.oClickEventParameters.endDate);
                    // Pre-select the row's person
                    if (this.oClickEventParameters.row) {
                        var sName = this.oClickEventParameters.row.getTitle();
                        var aPeople = oView.getModel("remCal").getProperty("/people");
                        var oSel = this.byId("selectPerson");
                        aPeople.forEach(function (p, i) {
                            if (p.name === sName) oSel.setSelectedIndex(i);
                        });
                    }
                    delete this.oClickEventParameters;

                } else if ((sType === "create_prefilled" || sType === "create") && oPrefill) {
                    // Auto-fill ALL fields from the calling page context
                    this.byId("violationRef").setValue(oPrefill.violationId   || "");
                    this.byId("affectedUser").setValue(oPrefill.userId         || "");
                    this.byId("roleToRemove").setValue(oPrefill.roleToRemove   || "");
                    this.byId("inputTitle").setValue(oPrefill.title            || "");
                    this.byId("moreInfo").setValue(oPrefill.info               || "");
                    this.byId("selectPriority").setSelectedKey(oPrefill.priority || "High");

                    // Pre-select issue type so the user sees context
                    var oTypeSelect = this.byId("issueTypeSelect");
                    if (oTypeSelect) {
                        if (oPrefill.violationId && oPrefill.violationId.startsWith("COMP")) {
                            oTypeSelect.setSelectedKey("compliance");
                        } else if (oPrefill.violationId && oPrefill.violationId.startsWith("CRIT")) {
                            oTypeSelect.setSelectedKey("critical");
                        } else if (oPrefill.violationId) {
                            oTypeSelect.setSelectedKey("violation");
                        }
                    }

                    // Set dates: tomorrow 09:00 → 10:00
                    var oStart = UI5Date.getInstance();
                    oStart.setDate(oStart.getDate() + 1); oStart.setHours(9, 0, 0, 0);
                    var oEnd = UI5Date.getInstance();
                    oEnd.setDate(oEnd.getDate() + 1); oEnd.setHours(10, 0, 0, 0);
                    this.byId("startDate").setDateValue(oStart);
                    this.byId("endDate").setDateValue(oEnd);
                    this.byId("startDate").setValueState(ValueState.None);
                    this.byId("endDate").setValueState(ValueState.None);
                }
                oD.open();
            }.bind(this));
        },

        _clearCreateDialog: function () {
            this._sEditingTaskId = null;
            // Set default dates: tomorrow 09:00 → 10:00
            var oStart = UI5Date.getInstance();
            oStart.setDate(oStart.getDate() + 1);
            oStart.setHours(9, 0, 0, 0);
            var oEnd = UI5Date.getInstance();
            oEnd.setDate(oEnd.getDate() + 1);
            oEnd.setHours(10, 0, 0, 0);

            this.byId("startDate").setDateValue(oStart);
            this.byId("endDate").setDateValue(oEnd);
            this.byId("startDate").setValueState(ValueState.None);
            this.byId("endDate").setValueState(ValueState.None);
            this.byId("inputTitle").setValue("");
            this.byId("moreInfo").setValue("");
            this.byId("violationRef").setValue("");
            this.byId("affectedUser").setValue("");
            this.byId("roleToRemove").setValue("");
            this.byId("selectPriority").setSelectedKey("High");
            this.byId("issueTypeSelect").setSelectedKey("");
            var oPicker = this.byId("issueSelect");
            if (oPicker) { oPicker.setVisible(false); oPicker.destroyItems(); }
            var oLabel = this.byId("issuePickerLabel");
            if (oLabel) oLabel.setVisible(false);
            var oSel = this.byId("selectPerson");
            if (oSel && oSel.getItems().length > 0) oSel.setSelectedItem(oSel.getItems()[0]);
        },

        // ── Issue sources — real records from the latest completed scan ──
        _getLatestScanId: function () {
            if (!this._pLatestScanId) {
                this._pLatestScanId = this._readList("/ScanResults", {
                    $orderby: "startedAt desc",
                    $filter:  "status eq 'Complete'",
                    $select:  "ID,scanCode"
                }, 1).then(function (aScans) {
                    return aScans.length ? aScans[0].ID : null;
                });
            }
            return this._pLatestScanId;
        },

        _readList: function (sPath, mParams, iLimit) {
            var oODataModel = this.getOwnerComponent().getModel("sentinelgrc");
            return oODataModel.bindList(sPath, null, null, null, mParams)
                .requestContexts(0, iLimit || 500)
                .then(function (aCtx) {
                    return aCtx.map(function (oCtx) { return oCtx.getObject(); });
                });
        },

        _loadIssues: function (sKey) {
            var that = this;
            // Compliance findings are system-wide, not tied to a single scan
            if (sKey === "compliance") {
                return this._readList("/ComplianceComponents", {
                    $filter:  "status eq 'Outdated'",
                    $orderby: "name asc"
                });
            }
            return this._getLatestScanId().then(function (sScanId) {
                if (!sScanId) return [];
                if (sKey === "violation") {
                    return that._readList("/Violations", {
                        $filter:  "scanId eq " + sScanId + " and status ne 'Resolved'",
                        $orderby: "severity asc,userId asc"
                    });
                }
                if (sKey === "critical") {
                    return that._readList("/CriticalRoleAssignments", {
                        $filter:  "scanId eq " + sScanId + " and status ne 'Resolved'",
                        $orderby: "criticalType asc,userId asc"
                    });
                }
                return [];
            });
        },

        _issueItemText: function (sKey, o) {
            if (sKey === "violation")  return o.userId + " · " + o.roleA + " + " + o.roleB + " (" + o.severity + ")";
            if (sKey === "compliance") return o.name + " · " + (o.delta || 0) + " missing patches";
            return o.userId + " · " + o.profile + " (" + o.criticalType + ")";
        },

        _issueItemKey: function (sKey, o) {
            if (sKey === "violation")  return "v|" + o.ID;
            if (sKey === "compliance") return "c|" + o.name;
            return "r|" + o.ID;
        },

        // ── Issue type selector ──────────────────────────────────────────
        onIssueTypeChanged: function (oEvent) {
            var sKey    = oEvent.getParameter("selectedItem").getKey();
            var oPicker = this.byId("issueSelect");
            var oLabel  = this.byId("issuePickerLabel");
            if (!oPicker || !oLabel) return;
            oPicker.destroyItems();

            if (!sKey || sKey === "manual") {
                oPicker.setVisible(false); oLabel.setVisible(false); return;
            }
            oPicker.setVisible(true); oLabel.setVisible(true);
            oLabel.setText(sKey === "violation"  ? "Select Violation:"
                         : sKey === "compliance" ? "Select Outdated Component:"
                         : "Select Critical Role:");

            oPicker.addItem(new Item({ key: "", text: "Loading…" }));
            oPicker.setEnabled(false);

            var that = this;
            this._loadIssues(sKey).then(function (aItems) {
                that._mIssueData = that._mIssueData || {};
                that._mIssueData[sKey] = aItems;
                oPicker.destroyItems();
                oPicker.addItem(new Item({
                    key:  "",
                    text: aItems.length ? "-- Select --" : "-- None found in latest scan --"
                }));
                aItems.forEach(function (o) {
                    oPicker.addItem(new Item({
                        key:  that._issueItemKey(sKey, o),
                        text: that._issueItemText(sKey, o)
                    }));
                });
                oPicker.setEnabled(true);
            }).catch(function (oError) {
                oPicker.destroyItems();
                oPicker.addItem(new Item({ key: "", text: "-- Could not load --" }));
                oPicker.setEnabled(true);
                MessageToast.show("Could not load items: " + (oError.message || "unknown error"));
            });
        },

        onIssueSelected: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem || !oItem.getKey()) return;
            var sKey  = oItem.getKey();
            var iSep  = sKey.indexOf("|");
            var sType = sKey.substring(0, iSep);
            var sId   = sKey.substring(iSep + 1);
            var mData = this._mIssueData || {};

            if (sType === "v") {
                var oV = (mData.violation || []).filter(function (v) { return v.ID === sId; })[0];
                if (!oV) return;
                this.byId("violationRef").setValue(oV.ID);
                this.byId("affectedUser").setValue(oV.userId);
                this.byId("roleToRemove").setValue(oV.roleB);
                this.byId("inputTitle").setValue("Remove " + oV.roleB + " from " + oV.userId);
                this.byId("moreInfo").setValue(oV.risk || "");
                this.byId("selectPriority").setSelectedKey(oV.severity || "High");
            } else if (sType === "c") {
                var oC = (mData.compliance || []).filter(function (c) { return c.name === sId; })[0];
                if (!oC) return;
                this.byId("violationRef").setValue("COMP-" + oC.name);
                this.byId("affectedUser").setValue("BASISADM");
                this.byId("roleToRemove").setValue(oC.name);
                this.byId("inputTitle").setValue("Apply " + (oC.delta || 0) + " missing patches for " + oC.name);
                this.byId("moreInfo").setValue(oC.riskNote || "");
                this.byId("selectPriority").setSelectedKey("High");
            } else if (sType === "r") {
                var oR = (mData.critical || []).filter(function (r) { return r.ID === sId; })[0];
                if (!oR) return;
                this.byId("violationRef").setValue("CRIT-" + oR.userId);
                this.byId("affectedUser").setValue(oR.userId);
                this.byId("roleToRemove").setValue(oR.profile);
                this.byId("inputTitle").setValue("Remove " + oR.profile + " from " + oR.userId);
                this.byId("moreInfo").setValue((oR.criticalType || "") + " critical profile assignment");
                this.byId("selectPriority").setSelectedKey(oR.severity || "High");
            }
        },

        // ── Save — persists to the CAP backend, then reloads from it ─────
        handleDialogSaveButton: function () {
            var oStartDate = this.byId("startDate");
            var oEndDate   = this.byId("endDate");

            if (!oStartDate.getDateValue()) { oStartDate.setValueState(ValueState.Error); return; }
            if (!oEndDate.getDateValue())   { oEndDate.setValueState(ValueState.Error);   return; }
            if (oStartDate.getValueState() === ValueState.Error) return;
            if (oEndDate.getValueState()   === ValueState.Error) return;

            var sPriority   = this.byId("selectPriority").getSelectedKey() || "High";
            var oStart      = oStartDate.getDateValue();
            var oEnd        = oEndDate.getDateValue();
            var oSelPerson  = this.byId("selectPerson").getSelectedItem();
            var sAssignedTo = oSelPerson ? oSelPerson.getText() : "Basis Admin";
            var bIsEdit     = !!this._sEditingTaskId;

            var oODataModel = this.getOwnerComponent().getModel("sentinelgrc");
            var oAction = oODataModel.bindContext(
                bIsEdit ? "/updateRemediationTask(...)" : "/saveRemediationTask(...)"
            );
            if (bIsEdit) oAction.setParameter("taskId", this._sEditingTaskId);
            oAction.setParameter("violationId",   this.byId("violationRef").getValue() || "");
            oAction.setParameter("userId",        this.byId("affectedUser").getValue() || "");
            oAction.setParameter("roleToRemove",  this.byId("roleToRemove").getValue() || "");
            oAction.setParameter("title",         this.byId("inputTitle").getValue() || "Remediation Task");
            oAction.setParameter("notes",         this.byId("moreInfo").getValue() || "");
            oAction.setParameter("assignedTo",    sAssignedTo);
            oAction.setParameter("priority",      sPriority);
            oAction.setParameter("scheduledDate", oStart.toISOString());
            oAction.setParameter("dueDate",       oEnd.toISOString());

            var that = this;
            oAction.execute().then(function () {
                var oSaved = oAction.getBoundContext().getObject();
                that._sEditingTaskId = null;
                that._pCreateDialog.then(function (oD) { oD.close(); });
                MessageToast.show("Task " + (oSaved.taskCode || "") +
                    (bIsEdit ? " updated for " : " scheduled for ") + sAssignedTo);
                return that._loadTasksFromBackend();
            }).catch(function (oError) {
                MessageToast.show("Failed to save remediation task: " + (oError.message || "unknown error"));
            });
        },

        handleDialogCancelButton: function () {
            this._sEditingTaskId = null;
            if (this._pCreateDialog) {
                this._pCreateDialog.then(function (oD) { oD.close(); });
            }
        },

        handleCreateChange: function (oEvent) {
            var oPicker = oEvent.getSource();
            oPicker.setValueState(oPicker.getDateValue() ? ValueState.None : ValueState.Error);
        },

        // ── Shared task actions (used by both the calendar popover and the
        //    tasks-table detail panel) ─────────────────────────────────────
        _openEditDialogForTask: function (oTask) {
            if (!oTask) return;
            this._openCreateDialog("edit", null);
            this._pCreateDialog.then(function () {
                this.byId("inputTitle").setValue(oTask.title          || "");
                this.byId("moreInfo").setValue(oTask.notes            || "");
                this.byId("startDate").setDateValue(oTask.start       || null);
                this.byId("endDate").setDateValue(oTask.end           || null);
                this.byId("violationRef").setValue(oTask.violationId  || "");
                this.byId("affectedUser").setValue(oTask.userId       || "");
                this.byId("roleToRemove").setValue(oTask.roleToRemove || "");
                this.byId("selectPriority").setSelectedKey(oTask.priority || "High");
                this.byId("startDate").setValueState(ValueState.None);
                this.byId("endDate").setValueState(ValueState.None);
                // Set after _clearCreateDialog() (run inside _openCreateDialog) resets it
                this._sEditingTaskId = oTask.taskId || null;
            }.bind(this));
        },

        _deleteTask: function (sTaskId) {
            if (!sTaskId) { MessageToast.show("Task deleted"); return; }
            var oAction = this.getOwnerComponent().getModel("sentinelgrc")
                .bindContext("/deleteRemediationTask(...)");
            oAction.setParameter("taskId", sTaskId);
            var that = this;
            oAction.execute().then(function () {
                MessageToast.show("Task deleted");
                that._oTaskDetail.setProperty("/selectedTask", null);
                return that._loadTasksFromBackend();
            }).catch(function (oError) {
                MessageToast.show("Failed to delete task: " + (oError.message || "unknown error"));
            });
        },

        _completeTask: function (sTaskId) {
            if (!sTaskId) { MessageToast.show("Task marked as Done"); return; }
            var oAction = this.getOwnerComponent().getModel("sentinelgrc")
                .bindContext("/completeRemediationTask(...)");
            oAction.setParameter("taskId", sTaskId);
            oAction.setParameter("completedBy", "Motaz Belleh Boubaker");
            var that = this;
            oAction.execute().then(function () {
                MessageToast.show("Task marked as Done");
                return that._loadTasksFromBackend();
            }).catch(function (oError) {
                MessageToast.show("Failed to update task: " + (oError.message || "unknown error"));
            });
        },

        _getPopoverTask: function (oP) {
            var oCtx = oP.getBindingContext("remCal");
            if (!oCtx) return null;
            return this.getView().getModel("remCal").getProperty(oCtx.getPath());
        },

        // ── Calendar popover actions ─────────────────────────────────────
        handleEditButton: function () {
            if (!this._pDetailsPopover) return;
            this._pDetailsPopover.then(function (oP) {
                var oTask = this._getPopoverTask(oP);
                if (!oTask) return;
                oP.close();
                this._openEditDialogForTask(oTask);
            }.bind(this));
        },

        handleDeleteAppointment: function () {
            if (!this._pDetailsPopover) return;
            this._pDetailsPopover.then(function (oP) {
                var oTask = this._getPopoverTask(oP);
                if (!oTask) return;
                oP.close();
                this._deleteTask(oTask.taskId);
            }.bind(this));
        },

        handleMarkDone: function () {
            if (!this._pDetailsPopover) return;
            this._pDetailsPopover.then(function (oP) {
                var oTask = this._getPopoverTask(oP);
                if (!oTask) return;
                oP.close();
                this._completeTask(oTask.taskId);
            }.bind(this));
        },

        // ── Tasks-table detail panel ─────────────────────────────────────
        onTaskSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            if (!oItem) return;
            this._oTaskDetail.setProperty("/selectedTask", oItem.data("task") || null);
        },

        onCloseTaskDetail: function () {
            this._oTaskDetail.setProperty("/selectedTask", null);
            var oTable = this.byId("allTasksList");
            if (oTable) oTable.removeSelections(true);
        },

        onEditSelectedTask: function () {
            this._openEditDialogForTask(this._oTaskDetail.getProperty("/selectedTask"));
        },

        onDeleteSelectedTask: function () {
            var oTask = this._oTaskDetail.getProperty("/selectedTask");
            if (oTask) this._deleteTask(oTask.taskId);
        },

        onCompleteSelectedTask: function () {
            var oTask = this._oTaskDetail.getProperty("/selectedTask");
            if (oTask) this._completeTask(oTask.taskId);
        },

        // ── Tasks table ──────────────────────────────────────────────────
        _buildTasksTable: function () {
            var oTable = this.byId("allTasksList");
            if (!oTable) return;
            oTable.removeAllItems();

            var oModel  = this.getView().getModel("remCal");
            if (!oModel) return;
            var oFmt    = DateFormat.getDateTimeInstance({ style: "medium" });
            var aPeople = oModel.getProperty("/people") || [];
            var nSched = 0, nInProg = 0, nDone = 0;

            // Keep the detail panel pinned to the same task across reloads
            var oSelected   = this._oTaskDetail ? this._oTaskDetail.getProperty("/selectedTask") : null;
            var sSelectedId = oSelected ? oSelected.taskId : null;
            var oSelectedItem = null, oSelectedTask = null;

            aPeople.forEach(function (oPerson) {
                (oPerson.appointments || []).forEach(function (oTask) {
                    if (oTask.status === "Done")        nDone++;
                    else if (oTask.status === "In Progress") nInProg++;
                    else                                nSched++;

                    var sDate = oTask.start ? oFmt.format(oTask.start) : "—";
                    var sPrio = oTask.priority === "High" ? "Error" : oTask.priority === "Medium" ? "Warning" : "None";
                    var sStt  = oTask.status  === "Done" ? "Success" : oTask.status === "In Progress" ? "Warning" : "None";

                    var oItem = new sap.m.ColumnListItem({
                        highlight: sPrio,
                        type: "Active",
                        cells: [
                            new sap.m.Text({ text: oTask.id || "—" }).addStyleClass("sentinelMono"),
                            new sap.m.ObjectStatus({ text: oTask.priority, state: sPrio }),
                            new sap.m.VBox({ items: [
                                new sap.m.Text({ text: oTask.title || "—", wrapping: false }),
                                new sap.m.Text({ text: oTask.info  || "",  wrapping: false }).addStyleClass("sapUiSmallText")
                            ]}),
                            new sap.m.ObjectIdentifier({ title: oTask.userName || oTask.userId || "—", text: oTask.userId || "" }),
                            new sap.m.Text({ text: oTask.violationId || "—" }).addStyleClass("sentinelMono"),
                            new sap.m.Text({ text: sDate }).addStyleClass("sentinelMono"),
                            new sap.m.Text({ text: oPerson.name }),
                            new sap.m.ObjectStatus({ text: oTask.status || "Scheduled", state: sStt })
                        ]
                    });
                    // Carry the task on the row so the detail panel can read it
                    oItem.data("task", oTask);
                    oTable.addItem(oItem);

                    if (sSelectedId && oTask.taskId === sSelectedId) {
                        oSelectedItem = oItem;
                        oSelectedTask = oTask;
                    }
                });
            });

            // Restore the previous selection (or drop it if the task is gone)
            if (this._oTaskDetail && sSelectedId) {
                if (oSelectedItem) {
                    oTable.setSelectedItem(oSelectedItem);
                    this._oTaskDetail.setProperty("/selectedTask", oSelectedTask);
                } else {
                    this._oTaskDetail.setProperty("/selectedTask", null);
                }
            }

            // Update KPI tiles
            var oNumSched = this.byId("numScheduled");
            var oNumProg  = this.byId("numInProgress");
            var oNumDone  = this.byId("numDone");
            if (oNumSched) oNumSched.setValue(nSched);
            if (oNumProg)  oNumProg.setValue(nInProg);
            if (oNumDone)  oNumDone.setValue(nDone);
        },

        // ── Export ───────────────────────────────────────────────────────
        onExport: function () { MessageToast.show("Exporting remediation calendar..."); },

        // ── Formatters ───────────────────────────────────────────────────
        formatDate: function (oDate) {
            if (!oDate) return "";
            return DateFormat.getDateTimeInstance({ style: "medium" }).format(oDate);
        },

        formatStatusState: function (sStatus) {
            return sStatus === "Done" ? "Success" : sStatus === "In Progress" ? "Warning" : "None";
        }
    });
});
