"use strict";

var $ = require("jquery"),
    commonUtils = require("../../core/utils/common"),
    camelize = require("../../core/utils/inflector").camelize,
    registerComponent = require("../../core/component_registrator"),
    Widget = require("../widget/ui.widget"),
    publisherMixin = require("./ui.scheduler.publisher_mixin"),
    SchedulerNavigator = require("./ui.scheduler.navigator"),
    DropDownMenu = require("../drop_down_menu"),
    Tabs = require("../tabs"),
    errors = require("../../core/errors"),
    messageLocalization = require("../../localization/message");


var COMPONENT_CLASS = "dx-scheduler-header",
    VIEW_SWITCHER_CLASS = "dx-scheduler-view-switcher",
    VIEW_SWITCHER_LABEL_CLASS = "dx-scheduler-view-switcher-label";

var STEP_MAP = {
    day: "day",
    week: "week",
    workWeek: "workWeek",
    month: "month",
    timelineDay: "day",
    timelineWeek: "week",
    timelineWorkWeek: "workWeek",
    timelineMonth: "month",
    agenda: "agenda"
};

var VIEWS = ['day', 'week', 'workWeek', 'month', 'timelineDay', 'timelineWeek', 'timelineWorkWeek', 'timelineMonth', 'agenda'];

var SchedulerHeader = Widget.inherit({

    _getDefaultOptions: function() {
        return $.extend(this.callBase(), {
            views: [],
            currentView: "day",
            firstDayOfWeek: undefined,
            currentDate: new Date(),
            min: undefined,
            max: undefined,
            useDropDownViewSwitcher: false
        });
    },

    _optionChanged: function(args) {
        var value = args.value;

        switch(args.name) {
            case "views":
                var currentView = this.option("currentView");
                this._viewSwitcher.option({
                    items: value,
                    selectedItem: currentView
                });
                break;
            case "currentView":
                this._viewSwitcher.option("selectedItem", value);
                this._navigator.option("step", STEP_MAP[value]);
                this._changeViewSwitcherLabelText();
                break;
            case "currentDate":
                this._navigator.option("date", value);
                break;
            case "min":
            case "max":
            case "firstDayOfWeek":
                this._navigator.option(args.name, value);
                break;
            case "tabIndex":
            case "focusStateEnabled":
                this._viewSwitcher.option(args.name, value);
                this._navigator.option(args.name, value);
                this.callBase(args);
                break;
            case "useDropDownViewSwitcher":
                this._refreshViewSwitcher();
                break;
            default:
                this.callBase(args);
        }
    },

    _init: function() {
        this.callBase();
        this.element().addClass(COMPONENT_CLASS);
    },

    _render: function() {
        this.callBase();

        this._renderNavigator();
        this._renderViewSwitcher();
    },

    _renderNavigator: function() {
        this._navigator = this._createComponent("<div>", SchedulerNavigator, {
            min: this.option("min"),
            max: this.option("max"),
            date: this.option("currentDate"),
            step: STEP_MAP[this.option("currentView")],
            firstDayOfWeek: this.option("firstDayOfWeek"),
            tabIndex: this.option("tabIndex"),
            focusStateEnabled: this.option("focusStateEnabled"),
            observer: this.option("observer")
        });

        this._navigator.element().appendTo(this.element());
    },

    _renderViewSwitcher: function() {
        this._validateViews();

        var $viewSwitcher = $("<div>").addClass(VIEW_SWITCHER_CLASS).appendTo(this.element());

        if(!this.option("useDropDownViewSwitcher")) {
            this._renderViewSwitcherTabs($viewSwitcher);
        } else {
            this._renderViewSwitcherDropDownMenu($viewSwitcher);
        }
    },

    _validateViews: function() {
        var views = this.option("views");

        $.each(views, function(_, viewName) {
            if($.inArray(viewName, VIEWS) === -1) {
                errors.log("W0008", viewName);
            }
        });
    },

    _renderViewSwitcherTabs: function($element) {
        this._viewSwitcher = this._createComponent($element, Tabs, {
            selectionRequired: true,
            scrollingEnabled: true,
            onSelectionChanged: $.proxy(this._updateCurrentView, this),
            items: this.option("views"),
            itemTemplate: function(item) {
                return $("<span>")
                    .addClass("dx-tab-text")
                    .text(messageLocalization.format("dxScheduler-switcher" + camelize(item, true)));
            },
            selectedItem: this.option("currentView"),
            tabIndex: this.option("tabIndex"),
            focusStateEnabled: this.option("focusStateEnabled")
        });
    },

    _refreshViewSwitcher: function() {
        this._viewSwitcher._dispose();
        this._viewSwitcher.element().remove();

        delete this._viewSwitcher;

        this._removeViewSwitcherLabel();

        this._renderViewSwitcher();
    },

    _removeViewSwitcherLabel: function() {
        if(commonUtils.isDefined(this._$viewSwitcherLabel)) {
            this._$viewSwitcherLabel.detach();
            this._$viewSwitcherLabel.remove();

            delete this._$viewSwitcherLabel;
        }
    },

    _renderViewSwitcherDropDownMenu: function($element) {
        this._$viewSwitcherLabel = $("<div>").addClass(VIEW_SWITCHER_LABEL_CLASS).appendTo(this.element());

        this._changeViewSwitcherLabelText();

        this._viewSwitcher = this._createComponent($element, DropDownMenu, {
            onItemClick: $.proxy(this._updateCurrentView, this),
            items: this.option("views"),
            itemTemplate: function(item) {
                return $("<span>")
                    .addClass("dx-dropdownmenu-item-text")
                    .text(messageLocalization.format("dxScheduler-switcher" + camelize(item, true)));
            }
        });
    },

    _changeViewSwitcherLabelText: function() {
        if(!commonUtils.isDefined(this._$viewSwitcherLabel)) {
            return;
        }

        var currentViewText = messageLocalization.format("dxScheduler-switcher" + camelize(this.option("currentView"), true));
        this._$viewSwitcherLabel.text(currentViewText);
    },

    _updateCurrentView: function(e) {
        var selectedItem = e.itemData || e.component.option("selectedItem");

        this.notifyObserver("currentViewUpdated", selectedItem);
    },

    _renderFocusTarget: $.noop

}).include(publisherMixin);

registerComponent("dxSchedulerHeader", SchedulerHeader);

module.exports = SchedulerHeader;
