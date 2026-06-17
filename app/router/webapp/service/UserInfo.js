sap.ui.define([], function () {
    "use strict";

    /**
     * Reads the logged-in user info from the XSUAA /userinfo endpoint.
     * Falls back to hardcoded dev user when running locally.
     */
    return {
        /**
         * Returns a promise resolving to:
         * { name, email, initials, roles }
         */
        getUser: function () {
            // Try XSUAA userinfo endpoint first
            return fetch("/security-service/userInfo", {
                headers: { "Accept": "application/json" }
            })
            .then(function (res) {
                if (!res.ok) throw new Error("No userinfo");
                return res.json();
            })
            .then(function (oData) {
                var sName     = oData.given_name && oData.family_name
                    ? oData.given_name + " " + oData.family_name
                    : (oData.name || oData.email || "Unknown User");
                var sEmail    = oData.email || "";
                var sParts    = sName.trim().split(" ");
                var sInitials = sParts.length >= 2
                    ? (sParts[0][0] + sParts[sParts.length - 1][0]).toUpperCase()
                    : sName.substring(0, 2).toUpperCase();
                return {
                    name:     sName,
                    email:    sEmail,
                    initials: sInitials,
                    roles:    oData["xs.system.attributes"] || []
                };
            })
            .catch(function () {
                // Fallback for local hybrid development
                return {
                    name:     "Motaz Belleh Boubaker",
                    email:    "motaz.boubaker@aymax.fr",
                    initials: "MB",
                    roles:    ["SentinelGRC_Admin"]
                };
            });
        }
    };
});
