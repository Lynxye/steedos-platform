module.exports = {

    recomputeFormulaValues: function(object_name, record_id, item_element) {
        $("body").addClass("loading");
        var userSession = Creator.USER_CONTEXT;
        var authorization = "Bearer " + userSession.spaceId + "," + userSession.user.authToken;
        $.ajax({
            type: "POST",
            url: Steedos.absoluteUrl("/api/v4/" + object_name + "/" + record_id + "/recomputeFormulaValues"),
            data: JSON.stringify({}),
            dataType: "json",
            contentType: 'application/json',
            beforeSend: function(XHR) {
                XHR.setRequestHeader('Content-Type', 'application/json');
                XHR.setRequestHeader('Authorization', authorization);
            },
            success: function(data) {
                $("body").removeClass("loading");
                if (data) {
                    if (data.error) {
                        toastr.error(t("object_fields_function_recomputeFormulaValues_error", t(data.error.reason)));
                    } else {
                        toastr.success(t("object_fields_function_recomputeFormulaValues_success"));
                    }
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                $("body").removeClass("loading");
                var errorMsg = errorThrown;
                var error = XMLHttpRequest.responseJSON.error;
                if (error) {
                    console.error("Recompute Formula Values Faild:", error);
                    if (error.reason) {
                        errorMsg = error.reason;
                    } else if (error.message) {
                        errorMsg = error.message;
                    } else {
                        errorMsg = error;
                    }
                }
                errorMsg = t(errorMsg);
                if (error.details) {
                    if (_.isObject(error.details)) {
                        errorMsg += JSON.stringify(error.details);
                    } else {
                        errorMsg += t(error.details);
                    }
                }
                toastr.error(t("object_fields_function_recomputeFormulaValues_error", errorMsg));
            }
        });
    },
    recomputeFormulaValuesVisible: function(object_name, record_id, record_permissions) {
        if (!Creator.isSpaceAdmin()) {
            return false
        }
        var record = Creator.odata.get(object_name, record_id, "type");
        if (record && record.type === "formula") {
            return true;
        }
    }

}