"use strict";

var $ = require("jquery"),
    TemplateBase = require("../../ui/widget/ui.template_base"),
    domUtils = require("../../core/utils/dom");

var NgTemplate = TemplateBase.inherit({

    ctor: function(element, templateCompiler) {
        this._element = element;

        this._compiledTemplate = templateCompiler(domUtils.normalizeTemplateElement(this._element));
    },

    _renderCore: function(options) {
        var compiledTemplate = this._compiledTemplate,
            result = $.isFunction(compiledTemplate) ? compiledTemplate(options) : compiledTemplate;

        return result;
    },

    source: function() {
        return $(this._element).clone();
    }

});

module.exports = NgTemplate;
