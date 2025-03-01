import $ from '../../core/renderer';
import eventsEngine from '../../events/core/events_engine';
import registerComponent from '../../core/component_registrator';
import Guid from '../../core/guid';
import { ensureDefined } from '../../core/utils/common';
import config from '../../core/config';
import { isDefined, isEmptyObject, isObject, isString } from '../../core/utils/type';
import { each } from '../../core/utils/iterator';
import { inArray } from '../../core/utils/array';
import { extend } from '../../core/utils/extend';
import { triggerResizeEvent, triggerShownEvent } from '../../events/visibility_change';
import { getPublicElement } from '../../core/element';
import messageLocalization from '../../localization/message';
import Widget from '../widget/ui.widget';
import Editor from '../editor/editor';
import { defaultScreenFactorFunc, getCurrentScreenFactor, hasWindow } from '../../core/utils/window';
import ValidationEngine from '../validation_engine';
import { default as FormItemsRunTimeInfo } from './ui.form.items_runtime_info';
import TabPanel from '../tab_panel';
import Scrollable from '../scroll_view/ui.scrollable';
import { Deferred } from '../../core/utils/deferred';
import { isMaterial } from '../themes';
import tryCreateItemOptionAction from './ui.form.item_options_actions';
import './ui.form.layout_manager';
import {
    concatPaths,
    createItemPathByIndex,
    getFullOptionName,
    getOptionNameFromFullName,
    tryGetTabPath,
    getTextWithoutSpaces,
    isEqualToDataFieldOrNameOrTitleOrCaption,
    isFullPathContainsTabs,
    getItemPath,
    convertToLayoutManagerOptions
} from './ui.form.utils';

import { convertToLabelMarkOptions } from './ui.form.layout_manager.utils'; // TODO: remove reference to 'ui.form.layout_manager.utils.js'
import {
    setLabelWidthByMaxLabelWidth
} from './components/label';

import '../validation_summary';
import '../validation_group';

// STYLE form

import {
    FORM_CLASS,
    FIELD_ITEM_CLASS,
    FORM_GROUP_CLASS,
    FORM_GROUP_CONTENT_CLASS,
    FIELD_ITEM_CONTENT_HAS_GROUP_CLASS,
    FIELD_ITEM_CONTENT_HAS_TABS_CLASS,
    FORM_GROUP_WITH_CAPTION_CLASS,
    FORM_GROUP_CAPTION_CLASS,
    FIELD_ITEM_TAB_CLASS,
    FORM_FIELD_ITEM_COL_CLASS,
    GROUP_COL_COUNT_CLASS,
    GROUP_COL_COUNT_ATTR,
    FIELD_ITEM_CONTENT_CLASS,
    FORM_VALIDATION_SUMMARY,
    ROOT_SIMPLE_ITEM_CLASS,
    FORM_UNDERLINED_CLASS } from './constants';

import { TOOLBAR_CLASS } from '../toolbar/constants';

const FOCUSED_STATE_CLASS = 'dx-state-focused';

const ITEM_OPTIONS_FOR_VALIDATION_UPDATING = ['items', 'isRequired', 'validationRules', 'visible'];

const Form = Widget.inherit({
    _init: function() {
        this.callBase();

        this._cachedColCountOptions = [];
        this._itemsRunTimeInfo = new FormItemsRunTimeInfo();
        this._groupsColCount = [];

        this._attachSyncSubscriptions();
    },

    _getDefaultOptions: function() {
        return extend(this.callBase(), {
            formID: 'dx-' + new Guid(),
            formData: {},
            colCount: 1,

            screenByWidth: defaultScreenFactorFunc,

            colCountByScreen: undefined,

            labelLocation: 'left',
            readOnly: false,
            onFieldDataChanged: null,
            customizeItem: null,
            onEditorEnterKey: null,
            minColWidth: 200,
            alignItemLabels: true,
            alignItemLabelsInAllGroups: true,
            alignRootItemLabels: true,
            showColonAfterLabel: true,
            showRequiredMark: true,
            showOptionalMark: false,
            requiredMark: '*',
            optionalMark: messageLocalization.format('dxForm-optionalMark'),
            requiredMessage: messageLocalization.getFormatter('dxForm-requiredMessage'),
            showValidationSummary: false,
            items: undefined,
            scrollingEnabled: false,
            validationGroup: undefined,
            stylingMode: config().editorStylingMode,
            labelMode: 'outside'
        });
    },

    _defaultOptionsRules: function() {
        return this.callBase().concat([
            {
                device: function() {
                    return isMaterial();
                },
                options: {
                    showColonAfterLabel: false,
                    labelLocation: 'top'
                }
            }
        ]);
    },

    _setOptionsByReference: function() {
        this.callBase();

        extend(this._optionsByReference, {
            formData: true,
            validationGroup: true
        });
    },

    _getGroupColCount: function($element) {
        return parseInt($element.attr(GROUP_COL_COUNT_ATTR));
    },

    _applyLabelsWidthByCol: function($container, index, options = {}, labelMarkOptions) {
        const fieldItemClass = options.inOneColumn ? FIELD_ITEM_CLASS : FORM_FIELD_ITEM_COL_CLASS + index;
        const cssExcludeTabbedSelector = options.excludeTabbed ? `:not(.${FIELD_ITEM_TAB_CLASS})` : '';

        setLabelWidthByMaxLabelWidth($container, `.${fieldItemClass}${cssExcludeTabbedSelector}`, labelMarkOptions);
        return;
    },

    _applyLabelsWidth: function($container, excludeTabbed, inOneColumn, colCount, labelMarkOptions) {
        colCount = inOneColumn ? 1 : colCount || this._getGroupColCount($container);
        const applyLabelsOptions = {
            excludeTabbed: excludeTabbed,
            inOneColumn: inOneColumn
        };
        let i;

        for(i = 0; i < colCount; i++) {
            this._applyLabelsWidthByCol($container, i, applyLabelsOptions, labelMarkOptions);
        }
    },

    _getGroupElementsInColumn: function($container, columnIndex, colCount) {
        const cssColCountSelector = isDefined(colCount) ? '.' + GROUP_COL_COUNT_CLASS + colCount : '';
        const groupSelector = '.' + FORM_FIELD_ITEM_COL_CLASS + columnIndex + ' > .' + FIELD_ITEM_CONTENT_CLASS + ' > .' + FORM_GROUP_CLASS + cssColCountSelector;

        return $container.find(groupSelector);
    },

    _applyLabelsWidthWithGroups: function($container, colCount, excludeTabbed, labelMarkOptions) {
        if(this.option('alignRootItemLabels') === true) { // TODO: private option
            const $rootSimpleItems = $container.find(`.${ROOT_SIMPLE_ITEM_CLASS}`);
            for(let colIndex = 0; colIndex < colCount; colIndex++) {
                // TODO: root items are aligned with root items only
                // this code doesn't align root items with grouped items in the same column
                // (see T942517)
                this._applyLabelsWidthByCol($rootSimpleItems, colIndex, excludeTabbed, labelMarkOptions);
            }
        }

        const alignItemLabelsInAllGroups = this.option('alignItemLabelsInAllGroups');
        if(alignItemLabelsInAllGroups) {
            this._applyLabelsWidthWithNestedGroups($container, colCount, excludeTabbed, labelMarkOptions);
        } else {
            const $groups = this.$element().find('.' + FORM_GROUP_CLASS);
            let i;
            for(i = 0; i < $groups.length; i++) {
                this._applyLabelsWidth($groups.eq(i), excludeTabbed, undefined, undefined, labelMarkOptions);
            }
        }
    },

    _applyLabelsWidthWithNestedGroups: function($container, colCount, excludeTabbed, labelMarkOptions) {
        const applyLabelsOptions = { excludeTabbed: excludeTabbed };
        let colIndex;
        let groupsColIndex;
        let groupColIndex;
        let $groupsByCol;

        for(colIndex = 0; colIndex < colCount; colIndex++) {
            $groupsByCol = this._getGroupElementsInColumn($container, colIndex);
            this._applyLabelsWidthByCol($groupsByCol, 0, applyLabelsOptions, labelMarkOptions);

            for(groupsColIndex = 0; groupsColIndex < this._groupsColCount.length; groupsColIndex++) {
                $groupsByCol = this._getGroupElementsInColumn($container, colIndex, this._groupsColCount[groupsColIndex]);
                const groupColCount = this._getGroupColCount($groupsByCol);

                for(groupColIndex = 1; groupColIndex < groupColCount; groupColIndex++) {
                    this._applyLabelsWidthByCol($groupsByCol, groupColIndex, applyLabelsOptions, labelMarkOptions);
                }
            }
        }
    },

    _labelLocation: function() {
        return this.option('labelLocation');
    },

    _alignLabelsInColumn: function({ layoutManager, inOneColumn, $container, excludeTabbed, items }) {
        if(!hasWindow() || this._labelLocation() === 'top') {
            // TODO: label location can be changed to 'left/right' for some labels
            // but this condition disables alignment for such items
            return;
        }

        const labelMarkOptions = convertToLabelMarkOptions(layoutManager._getMarkOptions());
        if(inOneColumn) {
            this._applyLabelsWidth($container, excludeTabbed, true, undefined, labelMarkOptions);
        } else {
            if(this._checkGrouping(items)) {
                this._applyLabelsWidthWithGroups($container, layoutManager._getColCount(), excludeTabbed, labelMarkOptions);
            } else {
                this._applyLabelsWidth($container, excludeTabbed, false, layoutManager._getColCount(), labelMarkOptions);
            }
        }
    },

    _prepareFormData: function() {
        if(!isDefined(this.option('formData'))) {
            this.option('formData', {});
        }
    },

    _setStylingModeClass: function() {
        if(this.option('stylingMode') === 'underlined') {
            this.$element().addClass(FORM_UNDERLINED_CLASS);
        }
    },

    _initMarkup: function() {
        ValidationEngine.addGroup(this._getValidationGroup());
        this._clearCachedInstances();
        this._prepareFormData();
        this.$element().addClass(FORM_CLASS);
        this._setStylingModeClass();

        this.callBase();

        this.setAria('role', 'form', this.$element());

        if(this.option('scrollingEnabled')) {
            this._renderScrollable();
        }

        this._renderLayout();
        this._renderValidationSummary();

        this._lastMarkupScreenFactor = this._targetScreenFactor || this._getCurrentScreenFactor();
    },

    _getCurrentScreenFactor: function() {
        return hasWindow() ? getCurrentScreenFactor(this.option('screenByWidth')) : 'lg';
    },

    _clearCachedInstances: function() {
        this._itemsRunTimeInfo.clear();
        this._cachedLayoutManagers = [];
    },

    _alignLabels: function(layoutManager, inOneColumn) {
        this._alignLabelsInColumn({
            $container: this.$element(),
            layoutManager,
            excludeTabbed: true,
            items: this.option('items'),
            inOneColumn
        });

        triggerResizeEvent(this.$element().find(`.${TOOLBAR_CLASS}`));
    },

    _clean: function() {
        this._clearValidationSummary();

        this.callBase();

        this._groupsColCount = [];
        this._cachedColCountOptions = [];
        this._lastMarkupScreenFactor = undefined;
    },

    _renderScrollable: function() {
        const useNativeScrolling = this.option('useNativeScrolling');
        this._scrollable = new Scrollable(this.$element(), {
            useNative: !!useNativeScrolling,
            useSimulatedScrollbar: !useNativeScrolling,
            useKeyboard: false,
            direction: 'both',
            bounceEnabled: false
        });
    },

    _getContent: function() {
        return this.option('scrollingEnabled') ? $(this._scrollable.content()) : this.$element();
    },

    _clearValidationSummary: function() {
        this._$validationSummary?.remove();
        this._$validationSummary = undefined;
        this._validationSummary = undefined;
    },

    _renderValidationSummary: function() {
        this._clearValidationSummary();

        if(this.option('showValidationSummary')) {
            this._$validationSummary = $('<div>')
                .addClass(FORM_VALIDATION_SUMMARY)
                .appendTo(this._getContent());

            this._validationSummary = this._$validationSummary.dxValidationSummary({
                validationGroup: this._getValidationGroup()
            }).dxValidationSummary('instance');
        }
    },

    _prepareItems(items, parentIsTabbedItem, currentPath, isTabs) {
        if(items) {
            const result = [];
            for(let i = 0; i < items.length; i++) {
                let item = items[i];
                const path = concatPaths(currentPath, createItemPathByIndex(i, isTabs));
                const itemRunTimeInfo = { item, itemIndex: i, path };
                const guid = this._itemsRunTimeInfo.add(itemRunTimeInfo);

                if(isString(item)) {
                    item = { dataField: item };
                }

                if(isObject(item)) {
                    const preparedItem = { ...item };
                    itemRunTimeInfo.preparedItem = preparedItem;
                    preparedItem.guid = guid;
                    this._tryPrepareGroupItem(preparedItem);
                    this._tryPrepareTabbedItem(preparedItem, path);
                    this._tryPrepareItemTemplate(preparedItem);

                    if(parentIsTabbedItem) {
                        preparedItem.cssItemClass = FIELD_ITEM_TAB_CLASS;
                    }

                    if(preparedItem.items) {
                        preparedItem.items = this._prepareItems(preparedItem.items, parentIsTabbedItem, path);
                    }
                    result.push(preparedItem);
                } else {
                    result.push(item);
                }
            }

            return result;
        }
    },

    _tryPrepareGroupItem: function(item) {
        if(item.itemType === 'group') {
            item.alignItemLabels = ensureDefined(item.alignItemLabels, true);

            item._prepareGroupItemTemplate = (itemTemplate) => {
                if(item.template) {
                    item.groupContentTemplate = this._getTemplate(itemTemplate);
                }

                item.template = this._itemGroupTemplate.bind(this, item);
            };
            item._prepareGroupItemTemplate(item.template);
        }
    },

    _tryPrepareTabbedItem: function(item, path) {
        if(item.itemType === 'tabbed') {
            item.template = this._itemTabbedTemplate.bind(this, item);
            item.tabs = this._prepareItems(item.tabs, true, path, true);
        }
    },

    _tryPrepareItemTemplate: function(item) {
        if(item.template) {
            item.template = this._getTemplate(item.template);
        }
    },

    _checkGrouping: function(items) {
        if(items) {
            for(let i = 0; i < items.length; i++) {
                const item = items[i];
                if(item.itemType === 'group') {
                    return true;
                }
            }
        }
    },

    _renderLayout: function() {
        const that = this;
        let items = that.option('items');
        const $content = that._getContent();

        // TODO: Introduce this.preparedItems and use it for partial rerender???
        // Compare new preparedItems with old preparedItems to detect what should be rerendered?
        items = that._prepareItems(items);

        //#DEBUG
        that._testResultItems = items;
        //#ENDDEBUG

        that._rootLayoutManager = that._renderLayoutManager($content, this._createLayoutManagerOptions(items, {
            isRoot: true,
            colCount: that.option('colCount'),
            alignItemLabels: that.option('alignItemLabels'),
            screenByWidth: this.option('screenByWidth'),
            colCountByScreen: this.option('colCountByScreen'),
            onLayoutChanged: function(inOneColumn) {
                that._alignLabels.bind(that)(that._rootLayoutManager, inOneColumn);
            },
            onContentReady: function(e) {
                that._alignLabels(e.component, e.component.isSingleColumnMode());
            }
        }));
    },

    _tryGetItemsForTemplate: function(item) {
        return item.items || [];
    },

    _itemTabbedTemplate: function(item, e, $container) {
        const $tabPanel = $('<div>').appendTo($container);
        const tabPanelOptions = extend({}, item.tabPanelOptions, {
            dataSource: item.tabs,
            onItemRendered: args => triggerShownEvent(args.itemElement),
            itemTemplate: (itemData, e, container) => {
                const $container = $(container);
                const alignItemLabels = ensureDefined(itemData.alignItemLabels, true);
                const layoutManager = this._renderLayoutManager($container, this._createLayoutManagerOptions(this._tryGetItemsForTemplate(itemData), {
                    colCount: itemData.colCount,
                    alignItemLabels: alignItemLabels,
                    screenByWidth: this.option('screenByWidth'),
                    colCountByScreen: itemData.colCountByScreen,
                    cssItemClass: itemData.cssItemClass,
                    onLayoutChanged: inOneColumn => {
                        this._alignLabelsInColumn({
                            $container,
                            layoutManager,
                            items: itemData.items,
                            inOneColumn
                        });
                    }
                }));

                if(this._itemsRunTimeInfo) {
                    this._itemsRunTimeInfo.extendRunTimeItemInfoByKey(itemData.guid, { layoutManager });
                }

                if(alignItemLabels) {
                    this._alignLabelsInColumn({
                        $container,
                        layoutManager,
                        items: itemData.items,
                        inOneColumn: layoutManager.isSingleColumnMode()
                    });
                }
            }
        });
        const tryUpdateTabPanelInstance = (items, instance) => {
            if(Array.isArray(items)) {
                items.forEach(item => this._itemsRunTimeInfo.extendRunTimeItemInfoByKey(item.guid, {
                    widgetInstance: instance
                }));
            }
        };
        const tabPanel = this._createComponent($tabPanel, TabPanel, tabPanelOptions);

        $($container).parent().addClass(FIELD_ITEM_CONTENT_HAS_TABS_CLASS);

        tabPanel.on('optionChanged', e => {
            if(e.fullName === 'dataSource') {
                tryUpdateTabPanelInstance(e.value, e.component);
            }
        });

        tryUpdateTabPanelInstance([{ guid: item.guid }, ...item.tabs], tabPanel);
    },

    _itemGroupTemplate: function(item, e, $container) {
        const $group = $('<div>')
            .toggleClass(FORM_GROUP_WITH_CAPTION_CLASS, isDefined(item.caption) && item.caption.length)
            .addClass(FORM_GROUP_CLASS)
            .appendTo($container);

        $($container).parent().addClass(FIELD_ITEM_CONTENT_HAS_GROUP_CLASS);

        let colCount;
        let layoutManager;

        if(item.caption) {
            $('<span>')
                .addClass(FORM_GROUP_CAPTION_CLASS)
                .text(item.caption)
                .appendTo($group);
        }

        const $groupContent = $('<div>')
            .addClass(FORM_GROUP_CONTENT_CLASS)
            .appendTo($group);

        if(item.groupContentTemplate) {
            item._renderGroupContentTemplate = () => {
                $groupContent.empty();
                const data = {
                    formData: this.option('formData'),
                    component: this
                };
                item.groupContentTemplate.render({
                    model: data,
                    container: getPublicElement($groupContent)
                });
            };
            item._renderGroupContentTemplate();
        } else {
            layoutManager = this._renderLayoutManager($groupContent, this._createLayoutManagerOptions(this._tryGetItemsForTemplate(item), {
                colCount: item.colCount,
                colCountByScreen: item.colCountByScreen,
                alignItemLabels: item.alignItemLabels,
                cssItemClass: item.cssItemClass,
            }));

            this._itemsRunTimeInfo && this._itemsRunTimeInfo.extendRunTimeItemInfoByKey(item.guid, { layoutManager });

            colCount = layoutManager._getColCount();
            if(inArray(colCount, this._groupsColCount) === -1) {
                this._groupsColCount.push(colCount);
            }
            $group.addClass(GROUP_COL_COUNT_CLASS + colCount);
            $group.attr(GROUP_COL_COUNT_ATTR, colCount);
        }
    },

    _createLayoutManagerOptions: function(items, extendedLayoutManagerOptions) {
        return convertToLayoutManagerOptions({
            form: this,
            formOptions: this.option(),
            $formElement: this.$element(),
            items,
            validationGroup: this._getValidationGroup(),
            extendedLayoutManagerOptions,
            onFieldDataChanged: args => {
                if(!this._isDataUpdating) {
                    this._triggerOnFieldDataChanged(args);
                }
            },
            onContentReady: args => {
                this._itemsRunTimeInfo.addItemsOrExtendFrom(args.component._itemsRunTimeInfo);
                extendedLayoutManagerOptions.onContentReady && extendedLayoutManagerOptions.onContentReady(args);
            },
            onDisposing: ({ component }) => {
                const nestedItemsRunTimeInfo = component.getItemsRunTimeInfo();
                this._itemsRunTimeInfo.removeItemsByItems(nestedItemsRunTimeInfo);
            },
        });
    },

    _renderLayoutManager: function($parent, layoutManagerOptions) {
        const baseColCountByScreen = {
            lg: layoutManagerOptions.colCount,
            md: layoutManagerOptions.colCount,
            sm: layoutManagerOptions.colCount,
            xs: 1
        };

        this._cachedColCountOptions.push({ colCountByScreen: extend(baseColCountByScreen, layoutManagerOptions.colCountByScreen) });

        const $element = $('<div>');
        $element.appendTo($parent);
        const instance = this._createComponent($element, 'dxLayoutManager', layoutManagerOptions);
        instance.on(
            'autoColCountChanged',
            () => {
                this._clearAutoColCountChangedTimeout();
                this.autoColCountChangedTimeoutId = setTimeout(
                    () => (!this._disposed) && this._refresh(),
                    0
                );
            }
        );
        this._cachedLayoutManagers.push(instance);
        return instance;
    },

    _getValidationGroup: function() {
        return this.option('validationGroup') || this;
    },

    _createComponent: function($element, type, config) {
        const that = this;
        config = config || {};

        that._extendConfig(config, {
            readOnly: that.option('readOnly')
        });

        return that.callBase($element, type, config);
    },

    _attachSyncSubscriptions: function() {
        const that = this;

        that.on('optionChanged', function(args) {
            const optionFullName = args.fullName;

            if(optionFullName === 'formData') {
                if(!isDefined(args.value)) {
                    that._options.silent('formData', args.value = {});
                }

                that._triggerOnFieldDataChangedByDataSet(args.value);
            }

            if(that._cachedLayoutManagers.length) {
                each(that._cachedLayoutManagers, function(index, layoutManager) {
                    if(optionFullName === 'formData') {
                        that._isDataUpdating = true;
                        layoutManager.option('layoutData', args.value);
                        that._isDataUpdating = false;
                    }

                    if(args.name === 'readOnly' || args.name === 'disabled') {
                        layoutManager.option(optionFullName, args.value);
                    }
                });
            }
        });
    },

    _optionChanged: function(args) {
        const splitFullName = args.fullName.split('.');

        // search() is used because the string can be ['items', ' items ', ' items .', 'items[0]', 'items[ 10 ] .', ...]
        if((splitFullName.length > 1)
            && (splitFullName[0].search('items') !== -1)
            && this._itemsOptionChangedHandler(args)) {
            return;
        }

        if((splitFullName.length > 1)
            && (splitFullName[0].search('formData') !== -1)
            && this._formDataOptionChangedHandler(args)) {
            return;
        }

        this._defaultOptionChangedHandler(args);
    },

    _defaultOptionChangedHandler: function(args) {
        switch(args.name) {
            case 'formData':
                if(!this.option('items')) {
                    this._invalidate();
                } else if(isEmptyObject(args.value)) {
                    this._resetValues();
                }
                break;
            case 'onFieldDataChanged':
                break;
            case 'items':
            case 'colCount':
            case 'onEditorEnterKey':
            case 'labelLocation':
            case 'labelMode':
            case 'alignItemLabels':
            case 'showColonAfterLabel':
            case 'customizeItem':
            case 'alignItemLabelsInAllGroups':
            case 'showRequiredMark':
            case 'showOptionalMark':
            case 'requiredMark':
            case 'optionalMark':
            case 'requiredMessage':
            case 'scrollingEnabled':
            case 'formID':
            case 'colCountByScreen':
            case 'screenByWidth':
            case 'stylingMode':
                this._invalidate();
                break;
            case 'showValidationSummary':
                this._renderValidationSummary();
                break;
            case 'minColWidth':
                if(this.option('colCount') === 'auto') {
                    this._invalidate();
                }
                break;
            case 'alignRootItemLabels':
            case 'readOnly':
                break;
            case 'width':
                this.callBase(args);
                this._rootLayoutManager.option(args.name, args.value);
                this._alignLabels(this._rootLayoutManager, this._rootLayoutManager.isSingleColumnMode());
                break;
            case 'visible':
                this.callBase(args);

                if(args.value) {
                    triggerShownEvent(this.$element());
                }
                break;
            case 'validationGroup':
                ValidationEngine.removeGroup(args.previousValue || this);
                this._invalidate();
                break;
            default:
                this.callBase(args);
        }
    },

    _itemsOptionChangedHandler: function(args) {
        const nameParts = args.fullName.split('.');
        const value = args.value;
        const itemPath = this._getItemPath(nameParts);
        const item = this.option(itemPath);
        const optionNameWithoutPath = args.fullName.replace(itemPath + '.', '');
        const simpleOptionName = optionNameWithoutPath.split('.')[0].replace(/\[\d+]/, '');
        const itemAction = this._tryCreateItemOptionAction(simpleOptionName, item, item[simpleOptionName], args.previousValue, itemPath);

        let result = this._tryExecuteItemOptionAction(itemAction) || this._tryChangeLayoutManagerItemOption(args.fullName, value);

        if(!result && item) {
            this._changeItemOption(item, optionNameWithoutPath, value);
            const items = this._generateItemsFromData(this.option('items'));
            this.option('items', items);
            result = true;
        }

        return result;
    },

    _formDataOptionChangedHandler: function(args) {
        const nameParts = args.fullName.split('.');
        const value = args.value;
        const dataField = nameParts.slice(1).join('.');
        const editor = this.getEditor(dataField);
        if(editor) {
            editor.option('value', value);
        } else {
            this._triggerOnFieldDataChanged({ dataField, value });
        }
        return true;
    },

    _tryCreateItemOptionAction: function(optionName, item, value, previousValue, itemPath) {
        if(optionName === 'tabs') {
            this._itemsRunTimeInfo.removeItemsByPathStartWith(`${itemPath}.tabs`);
            value = this._prepareItems(value, true, itemPath, true); // preprocess user value as in _tryPrepareTabbedItem
        }
        return tryCreateItemOptionAction(optionName, {
            item,
            value,
            previousValue,
            itemsRunTimeInfo: this._itemsRunTimeInfo
        });
    },

    _tryExecuteItemOptionAction: function(action) {
        return action && action.tryExecute();
    },

    _updateValidationGroupAndSummaryIfNeeded: function(fullName) {
        const optionName = getOptionNameFromFullName(fullName);
        if(ITEM_OPTIONS_FOR_VALIDATION_UPDATING.indexOf(optionName) > -1) {
            ValidationEngine.addGroup(this._getValidationGroup());
            if(this.option('showValidationSummary')) {
                this._validationSummary && this._validationSummary._initGroupRegistration();
            }
        }
    },

    _setLayoutManagerItemOption(layoutManager, optionName, value, path) {
        if(this._updateLockCount > 0) {
            !layoutManager._updateLockCount && layoutManager.beginUpdate();
            const key = this._itemsRunTimeInfo.findKeyByPath(path);
            this.postponedOperations.add(key, () => {
                !layoutManager._disposed && layoutManager.endUpdate();
                return new Deferred().resolve();
            });
        }
        const contentReadyHandler = e => {
            e.component.off('contentReady', contentReadyHandler);
            if(isFullPathContainsTabs(path)) {
                const tabPath = tryGetTabPath(path);
                const tabLayoutManager = this._itemsRunTimeInfo.findGroupOrTabLayoutManagerByPath(tabPath);
                if(tabLayoutManager) {
                    this._alignLabelsInColumn({
                        items: tabLayoutManager.option('items'),
                        layoutManager: tabLayoutManager,
                        $container: tabLayoutManager.$element(),
                        inOneColumn: tabLayoutManager.isSingleColumnMode()
                    });
                }
            } else {
                this._alignLabels(this._rootLayoutManager, this._rootLayoutManager.isSingleColumnMode());
            }
        };
        layoutManager.on('contentReady', contentReadyHandler);
        layoutManager.option(optionName, value);
        this._updateValidationGroupAndSummaryIfNeeded(optionName);
    },

    _tryChangeLayoutManagerItemOption(fullName, value) {
        const nameParts = fullName.split('.');
        const optionName = getOptionNameFromFullName(fullName);

        if(optionName === 'items' && nameParts.length > 1) {
            const itemPath = this._getItemPath(nameParts);
            const layoutManager = this._itemsRunTimeInfo.findGroupOrTabLayoutManagerByPath(itemPath);

            if(layoutManager) {
                this._itemsRunTimeInfo.removeItemsByItems(layoutManager.getItemsRunTimeInfo());
                const items = this._prepareItems(value, false, itemPath);
                this._setLayoutManagerItemOption(layoutManager, optionName, items, itemPath);
                return true;
            }
        } else if(nameParts.length > 2) {
            const endPartIndex = nameParts.length - 2;
            const itemPath = this._getItemPath(nameParts.slice(0, endPartIndex));
            const layoutManager = this._itemsRunTimeInfo.findGroupOrTabLayoutManagerByPath(itemPath);

            if(layoutManager) {
                const fullOptionName = getFullOptionName(nameParts[endPartIndex], optionName);
                if(optionName === 'editorType') { // T903774
                    if(layoutManager.option(fullOptionName) !== value) {
                        return false;
                    }
                }
                if(optionName === 'visible') { // T874843
                    const formItems = this.option(getFullOptionName(itemPath, 'items'));
                    if(formItems && formItems.length) {
                        const layoutManagerItems = layoutManager.option('items');
                        formItems.forEach((item, index) => {
                            const layoutItem = layoutManagerItems[index];
                            layoutItem.visibleIndex = item.visibleIndex;
                        });
                    }
                }

                this._setLayoutManagerItemOption(layoutManager, fullOptionName, value, itemPath);
                return true;
            }
        }
        return false;
    },

    _tryChangeLayoutManagerItemOptions(itemPath, options) {
        let result;
        this.beginUpdate();
        each(options, (optionName, optionValue) => {
            result = this._tryChangeLayoutManagerItemOption(getFullOptionName(itemPath, optionName), optionValue);
            if(!result) {
                return false;
            }
        });
        this.endUpdate();
        return result;
    },

    _getItemPath: function(nameParts) {
        let itemPath = nameParts[0];
        let i;

        for(i = 1; i < nameParts.length; i++) {
            if(nameParts[i].search(/items\[\d+]|tabs\[\d+]/) !== -1) {
                itemPath += '.' + nameParts[i];
            } else {
                break;
            }
        }

        return itemPath;
    },

    _triggerOnFieldDataChanged: function(args) {
        this._createActionByOption('onFieldDataChanged')(args);
    },

    _triggerOnFieldDataChangedByDataSet: function(data) {
        const that = this;
        if(data && isObject(data)) {
            each(data, function(dataField, value) {
                that._triggerOnFieldDataChanged({ dataField: dataField, value: value });
            });
        }
    },

    _updateFieldValue: function(dataField, value) {
        if(isDefined(this.option('formData'))) {
            const editor = this.getEditor(dataField);

            this.option('formData.' + dataField, value);

            if(editor) {
                const editorValue = editor.option('value');

                if(editorValue !== value) {
                    editor.option('value', value);
                }
            }
        }
    },

    _generateItemsFromData: function(items) {
        const formData = this.option('formData');
        const result = [];

        if(!items && isDefined(formData)) {
            each(formData, function(dataField) {
                result.push({
                    dataField: dataField
                });
            });
        }

        if(items) {
            each(items, function(index, item) {
                if(isObject(item)) {
                    result.push(item);
                } else {
                    result.push({
                        dataField: item
                    });
                }
            });
        }

        return result;
    },

    _getItemByField: function(field, items) {
        const that = this;
        const fieldParts = isObject(field) ? field : that._getFieldParts(field);
        const fieldName = fieldParts.fieldName;
        const fieldPath = fieldParts.fieldPath;
        let resultItem;

        if(items.length) {
            each(items, function(index, item) {
                const itemType = item.itemType;

                if(fieldPath.length) {
                    const path = fieldPath.slice();

                    item = that._getItemByFieldPath(path, fieldName, item);
                } else if(itemType === 'group' && !(item.caption || item.name) || itemType === 'tabbed' && !item.name) {
                    const subItemsField = that._getSubItemField(itemType);

                    item.items = that._generateItemsFromData(item.items);

                    item = that._getItemByField({ fieldName: fieldName, fieldPath: fieldPath }, item[subItemsField]);
                }

                if(isEqualToDataFieldOrNameOrTitleOrCaption(item, fieldName)) {
                    resultItem = item;
                    return false;
                }
            });
        }

        return resultItem;
    },

    _getFieldParts: function(field) {
        const fieldSeparator = '.';
        let fieldName = field;
        let separatorIndex = fieldName.indexOf(fieldSeparator);
        const resultPath = [];


        while(separatorIndex !== -1) {
            resultPath.push(fieldName.substr(0, separatorIndex));
            fieldName = fieldName.substr(separatorIndex + 1);
            separatorIndex = fieldName.indexOf(fieldSeparator);
        }

        return {
            fieldName: fieldName,
            fieldPath: resultPath.reverse()
        };
    },

    _getItemByFieldPath: function(path, fieldName, item) {
        const that = this;
        const itemType = item.itemType;
        const subItemsField = that._getSubItemField(itemType);
        const isItemWithSubItems = itemType === 'group' || itemType === 'tabbed' || item.title;
        let result;

        do {
            if(isItemWithSubItems) {
                const name = item.name || item.caption || item.title;
                const isGroupWithName = isDefined(name);
                const nameWithoutSpaces = getTextWithoutSpaces(name);
                let pathNode;

                item[subItemsField] = that._generateItemsFromData(item[subItemsField]);

                if(isGroupWithName) {
                    pathNode = path.pop();
                }

                if(!path.length) {
                    result = that._getItemByField(fieldName, item[subItemsField]);

                    if(result) {
                        break;
                    }
                }

                if(!isGroupWithName || isGroupWithName && nameWithoutSpaces === pathNode) {
                    if(path.length) {
                        result = that._searchItemInEverySubItem(path, fieldName, item[subItemsField]);
                    }
                }
            } else {
                break;
            }
        } while(path.length && !isDefined(result));

        return result;
    },

    _getSubItemField: function(itemType) {
        return itemType === 'tabbed' ? 'tabs' : 'items';
    },

    _searchItemInEverySubItem: function(path, fieldName, items) {
        const that = this;
        let result;

        each(items, function(index, groupItem) {
            result = that._getItemByFieldPath(path.slice(), fieldName, groupItem);
            if(result) {
                return false;
            }
        });

        if(!result) {
            result = false;
        }

        return result;
    },

    _changeItemOption: function(item, option, value) {
        if(isObject(item)) {
            item[option] = value;
        }
    },

    _dimensionChanged: function() {
        const currentScreenFactor = this._getCurrentScreenFactor();

        if(this._lastMarkupScreenFactor !== currentScreenFactor) {
            if(this._isColCountChanged(this._lastMarkupScreenFactor, currentScreenFactor)) {
                this._targetScreenFactor = currentScreenFactor;
                this._refresh();
                this._targetScreenFactor = undefined;
            }

            this._lastMarkupScreenFactor = currentScreenFactor;
        }
    },

    _isColCountChanged: function(oldScreenSize, newScreenSize) {
        let isChanged = false;

        each(this._cachedColCountOptions, function(index, item) {
            if(item.colCountByScreen[oldScreenSize] !== item.colCountByScreen[newScreenSize]) {
                isChanged = true;
                return false;
            }
        });

        return isChanged;
    },

    _refresh: function() {
        const editorSelector = '.' + FOCUSED_STATE_CLASS + ' input, .' + FOCUSED_STATE_CLASS + ' textarea';

        eventsEngine.trigger(this.$element().find(editorSelector), 'change');

        this.callBase();
    },

    _resetValues: function() {
        this._itemsRunTimeInfo.each(function(_, itemRunTimeInfo) {
            if(isDefined(itemRunTimeInfo.widgetInstance) && Editor.isEditor(itemRunTimeInfo.widgetInstance)) {
                itemRunTimeInfo.widgetInstance.reset();
                itemRunTimeInfo.widgetInstance.option('isValid', true);
            }
        });

        ValidationEngine.resetGroup(this._getValidationGroup());
    },

    _updateData: function(data, value, isComplexData) {
        const that = this;
        const _data = isComplexData ? value : data;

        if(isObject(_data)) {
            each(_data, function(dataField, fieldValue) {
                that._updateData(isComplexData ? data + '.' + dataField : dataField, fieldValue, isObject(fieldValue));
            });
        } else if(isString(data)) {
            that._updateFieldValue(data, value);
        }
    },

    registerKeyHandler: function(key, handler) {
        this.callBase(key, handler);
        this._itemsRunTimeInfo.each(function(_, itemRunTimeInfo) {
            if(isDefined(itemRunTimeInfo.widgetInstance)) {
                itemRunTimeInfo.widgetInstance.registerKeyHandler(key, handler);
            }
        });
    },

    _focusTarget: function() {
        return this.$element().find('.' + FIELD_ITEM_CONTENT_CLASS + ' [tabindex]').first();
    },

    _visibilityChanged: function() {},

    _clearAutoColCountChangedTimeout: function() {
        if(this.autoColCountChangedTimeoutId) {
            clearTimeout(this.autoColCountChangedTimeoutId);
            this.autoColCountChangedTimeoutId = undefined;
        }
    },

    _dispose: function() {
        this._clearAutoColCountChangedTimeout();
        ValidationEngine.removeGroup(this._getValidationGroup());
        this.callBase();
    },

    resetValues: function() {
        this._resetValues();
    },

    updateData: function(data, value) {
        this._updateData(data, value);
    },

    getEditor: function(dataField) {
        return this._itemsRunTimeInfo.findWidgetInstanceByDataField(dataField) || this._itemsRunTimeInfo.findWidgetInstanceByName(dataField);
    },

    getButton: function(name) {
        return this._itemsRunTimeInfo.findWidgetInstanceByName(name);
    },

    updateDimensions: function() {
        const that = this;
        const deferred = new Deferred();

        if(that._scrollable) {
            that._scrollable.update().done(function() {
                deferred.resolveWith(that);
            });
        } else {
            deferred.resolveWith(that);
        }

        return deferred.promise();
    },

    itemOption: function(id, option, value) {
        const items = this._generateItemsFromData(this.option('items'));
        const item = this._getItemByField(id, items);
        const path = getItemPath(items, item);

        if(!item) {
            return;
        }

        switch(arguments.length) {
            case 1:
                return item;
            case 3: {
                const itemAction = this._tryCreateItemOptionAction(option, item, value, item[option], path);
                this._changeItemOption(item, option, value);
                const fullName = getFullOptionName(path, option);
                if(!this._tryExecuteItemOptionAction(itemAction) && !this._tryChangeLayoutManagerItemOption(fullName, value)) {
                    this.option('items', items);
                }
                break;
            }
            default: {
                if(isObject(option)) {
                    if(!this._tryChangeLayoutManagerItemOptions(path, option)) {
                        let allowUpdateItems;
                        each(option, (optionName, optionValue) => {
                            const itemAction = this._tryCreateItemOptionAction(optionName, item, optionValue, item[optionName], path);
                            this._changeItemOption(item, optionName, optionValue);
                            if(!allowUpdateItems && !this._tryExecuteItemOptionAction(itemAction)) {
                                allowUpdateItems = true;
                            }
                        });
                        allowUpdateItems && this.option('items', items);
                    }
                }
                break;
            }
        }
    },

    validate: function() {
        return ValidationEngine.validateGroup(this._getValidationGroup());
    },

    getItemID: function(name) {
        return 'dx_' + this.option('formID') + '_' + (name || new Guid());
    },

    getTargetScreenFactor: function() {
        return this._targetScreenFactor;
    }
});

registerComponent('dxForm', Form);

export default Form;
