sap.ui.define([], function () {
    "use strict";

    return {
        getUser: function () {
            return fetch("/security-service/userInfo", {
                headers: { "Accept": "application/json" }
            })
            .then(function (res) {
                if (!res.ok) throw new Error("No userinfo");
                return res.json();
            })
            .then(function (oData) {
                var sName     = oData.name || oData.email || "User";
                var sEmail    = oData.email || "";
                var sParts    = sName.trim().split(" ");
                var sInitials = sParts.length >= 2
                    ? (sParts[0][0] + sParts[sParts.length-1][0]).toUpperCase()
                    : sName.substring(0, 2).toUpperCase();
                return {
                    name:      sName,
                    email:     sEmail,
                    initials:  sInitials,
                    isAnalyst: oData.isAnalyst !== false,
                    role:      oData.role || "Security Analyst"
                };
            })
            .catch(function () {
                return {
                    name:      "Motaz Belleh Boubaker",
                    email:     "motaz.boubaker@aymax.fr",
                    initials:  "MB",
                    isAnalyst: true,
                    role:      "Security Analyst"
                };
            });
        }
    };
});
