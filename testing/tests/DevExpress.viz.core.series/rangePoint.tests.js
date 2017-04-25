"use strict";

var $ = require("jquery"),
    vizMocks = require("../../helpers/vizMocks.js"),
    labelModule = require("viz/series/points/label"),
    pointModule = require("viz/series/points/base_point"),
    tooltipModule = require("viz/core/tooltip"),
    originalLabel = labelModule.Label;

/* global MockTranslator */
require("../../helpers/chartMocks.js");

require("viz/chart");

var createPoint = function(series, data, options) {
    options = options || {};
    options.type = options.type || "rangearea";
    var point = new pointModule.Point(series, data, options);
    point._getLabelCoordOfPosition = sinon.spy(point._getLabelCoordOfPosition);//check internal behavior
    return point;
};

var environment = {
    beforeEach: function() {
        var that = this;
        this.renderer = new vizMocks.Renderer();
        this.renderer.bBoxTemplate = { x: 40, y: 40, height: 10, width: 20 };
        this.group = this.renderer.g();

        var translateYData = { 1: 0, 2: 80, 3: 200, 4: 300, 5: 400, 6: 480, 7: 600, "canvas_position_default": 100 },
            translateXData = { 1: 350, 2: 325, 3: 290, 4: 250, 5: 225, 6: 150, "canvas_position_default": 300 };

        this.translators = {
            x: new MockTranslator({
                translate: translateXData,
                failOnWrongData: true
            }),
            y: new MockTranslator({
                translate: translateYData,
                failOnWrongData: true,
                getCanvasVisibleArea: { min: 0, max: 210 }
            })
        };
        this.data = {
            value: 15,
            minValue: 10,
            argument: 25
        };
        this.options = {
            widgetType: "chart",
            type: "rangearea",
            styles: {
                normal: {
                    r: 6
                }
            },
            label: {
                visible: true,
                horizontalOffset: 0,
                verticalOffset: 0,
                background: {
                    fill: "none"
                },
                attributes: {}
            }
        };
        this.labelFactory = labelModule.Label = sinon.spy(function() {
            var label = sinon.createStubInstance(originalLabel);
            label.getLayoutOptions.returns(that.options.label);
            label.getBoundingRect.returns({ height: 10, width: 20 });
            return label;
        });
        this.series = {
            name: "series",
            _labelsGroup: {},
            isFullStackedSeries: function() { return false; },
            _options: {},
            getLabelVisibility: function() { return true; },
            _visibleArea: { minX: 0, maxX: 100, minY: 0, maxY: 210 }
        };
    },
    afterEach: function() {
        labelModule.Label = originalLabel;
    }
};

QUnit.module("Translation. Rangearea", {
    beforeEach: function() {
        this.opt = {
            widgetType: "chart",
            styles: {},
            label: { visible: false }
        };
        this.series = {
            name: "series",
            isFullStackedSeries: function() {
                return false;
            },
            getLabelVisibility: function() {
                return false;
            }
        };
        var translateXData = { 1: 110, 2: 220, 3: 330, 4: 440, 5: 550, "default": 70 },
            translateYData = { 1: 111, 2: 222, 3: 333, 4: 444, 5: 555, "default": 600 };

        this.continuousTranslators = {
            x: new MockTranslator({
                translate: translateXData,
                getCanvasVisibleArea: { min: 0, max: 100 }
            }),
            y: new MockTranslator({
                translate: translateYData,
                getCanvasVisibleArea: { min: 0, max: 210 }
            })
        };
    }
});

QUnit.test("Width and height, not rotated", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 5, minValue: "default" }, this.opt);

    pt.translate(this.continuousTranslators);

    assert.equal(pt.x, 110);
    assert.equal(pt.y, 555);

    assert.equal(pt.height, 45);
    assert.equal(pt.width, 0);

    assert.equal(pt.minY, 600);
});

QUnit.test("getCrosshair data", function(assert) {
    this.series.axis = "valueAxisName";
    var pt = createPoint(this.series, { argument: 1, value: 5, minValue: "default" }, this.opt);

    pt.translate(this.continuousTranslators);

    assert.equal(pt.x, 110);
    assert.equal(pt.y, 555);
    assert.equal(pt.minY, 600);

    assert.deepEqual(pt.getCrosshairData(80, 550), {
        x: 110,
        y: 555,
        xValue: 1,
        yValue: 5,
        axis: "valueAxisName"
    });

    assert.deepEqual(pt.getCrosshairData(80, 570), {
        x: 110,
        y: 555,
        xValue: 1,
        yValue: 5,
        axis: "valueAxisName"
    });

    assert.deepEqual(pt.getCrosshairData(80, 590), {
        x: 110,
        y: 600,
        xValue: 1,
        yValue: "default",
        axis: "valueAxisName"
    });
    assert.deepEqual(pt.getCrosshairData(80, 800), {
        x: 110,
        y: 600,
        xValue: 1,
        yValue: "default",
        axis: "valueAxisName"
    });

});

QUnit.test("Width and height, not rotated", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 5, minValue: 1 }, this.opt);
    pt.initialValue = pt.value = null;

    pt.translate(this.continuousTranslators);

    assert.ok(!pt.x);
    assert.ok(!pt.y);
});

QUnit.test("Width and height, rotated", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 5, minValue: "default" }, this.opt);

    pt._options.rotated = true;
    pt.translate(this.continuousTranslators);

    assert.equal(pt.x, 550);
    assert.equal(pt.y, 111);

    assert.equal(pt.height, 0);
    assert.equal(pt.width, 480);

    assert.equal(pt.minX, 70);
});

QUnit.test("getCrosshair data. rotated", function(assert) {
    this.opt.rotated = true;
    this.series.axis = "valueAxisName";
    var pt = createPoint(this.series, { argument: 1, value: 5, minValue: "default" }, this.opt);

    pt.translate(this.continuousTranslators);

    assert.equal(pt.x, 550);
    assert.equal(pt.y, 111);

    assert.equal(pt.height, 0);
    assert.equal(pt.width, 480);

    assert.equal(pt.minX, 70);

    assert.deepEqual(pt.getCrosshairData(80, 100), {
        x: 70,
        y: 111,
        xValue: "default",
        yValue: 1,
        axis: "valueAxisName"
    });

    assert.deepEqual(pt.getCrosshairData(300, 100), {
        x: 70,
        y: 111,
        xValue: "default",
        yValue: 1,
        axis: "valueAxisName"
    });

    assert.deepEqual(pt.getCrosshairData(400, 100), {
        x: 550,
        y: 111,
        xValue: 5,
        yValue: 1,
        axis: "valueAxisName"
    });
    assert.deepEqual(pt.getCrosshairData(600, 100), {
        x: 550,
        y: 111,
        xValue: 5,
        yValue: 1,
        axis: "valueAxisName"
    });

});

QUnit.module("Draw Point", {
    beforeEach: function() {
        this.renderer = new vizMocks.Renderer();
        this.group = this.renderer.g();
        this.options = {
            widgetType: "chart",
            visible: true,
            styles: { normal: { r: 6 }, hover: { r: 6 }, selection: { r: 6 } },
            label: { visible: false }
        };
        this.series = {
            name: "series",
            _options: {},
            isFullStackedSeries: function() {
                return false;
            },
            getLabelVisibility: function() {
                return false;
            }
        };
        this.translators = {
            x: new MockTranslator({
                translate: { 1: 11, 2: 33 },
                getCanvasVisibleArea: { min: 0, max: 600 }
            }),
            y: new MockTranslator({
                translate: { 1: 22, 2: 44 },
                getCanvasVisibleArea: { min: 0, max: 800 }
            })
        };
        this.groups = {
            markers: this.group
        };
    }
});

QUnit.test("Marker (symbol is circle), not rotated", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.translate(this.translators);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 44);

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.deepEqual(this.renderer.stub("circle").getCall(1).args, []);

    assert.equal(point.graphic.topMarker, this.renderer.stub("circle").getCall(0).returnValue);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("circle").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 22 });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 44 });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is circle), not rotated, animation Enabled", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.translate(this.translators);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;

    point.draw(this.renderer, this.groups, true, true);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 44);

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.deepEqual(this.renderer.stub("circle").getCall(1).args, []);

    assert.equal(point.graphic.topMarker, this.renderer.stub("circle").getCall(0).returnValue);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("circle").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 22 });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 44 });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker is not visible", function(assert) {
    this.options.symbol = "circle";
    this.options.visible = false;
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = false;
    point.visibleBottomMarker = false;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(!point.graphic);
});

QUnit.test("Marker (symbol is square), not rotated", function(assert) {
    this.options.symbol = "square";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);
    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 44, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is polygon), not rotated", function(assert) {
    this.options.symbol = "polygon";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, 0, 0, -6, 6, 0, 0, 6, -6, 0] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 44, points: [-6, 0, 0, -6, 6, 0, 0, 6, -6, 0] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is triangle), not rotated", function(assert) {
    this.options.symbol = "triangle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -6, 6, -6, 0, 6, -6, -6] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 44, points: [-6, -6, 6, -6, 0, 6, -6, -6] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is cross), not rotated", function(assert) {
    this.options.symbol = "cross";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);
    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -3, -3, -6, 0, -3, 3, -6, 6, -3, 3, 0, 6, 3, 3, 6, 0, 3, -3, 6, -6, 3, -3, 0] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], { r: 6, translateX: 11, translateY: 44, points: [-6, -3, -3, -6, 0, -3, 3, -6, 6, -3, 3, 0, 6, 3, 3, 6, 0, 3, -3, 6, -6, 3, -3, 0] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, not rotated. Top marker", function(assert) {
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMaxPoint: "test-url"
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("image").callCount, 1);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.topMarker, this.renderer.stub("image").getCall(0).returnValue);

    assert.equal(this.renderer.stub("circle").callCount, 1);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("circle").getCall(0).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { translateX: 11, translateY: 22, visibility: undefined });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 44 });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, not rotated. Bottom marker", function(assert) {
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMinPoint: "test-url"
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("circle").callCount, 1);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.equal(point.graphic.topMarker, this.renderer.stub("circle").getCall(0).returnValue);

    assert.equal(this.renderer.stub("image").callCount, 1);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("image").getCall(0).returnValue);

    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { translateX: 11, translateY: 44, visibility: undefined });
    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22 });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, not rotated. Both markers", function(assert) {
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMaxPoint: "test-url",
            rangeMinPoint: "test-url-2"
        },
        width: {
            rangeMaxPoint: 10,
            rangeMinPoint: 30
        },
        height: {
            rangeMaxPoint: 20,
            rangeMinPoint: 40
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("image").callCount, 2);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-5, -10, 10, 20, "test-url", "center"]);
    assert.equal(point.graphic.topMarker, this.renderer.stub("image").getCall(0).returnValue);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);

    assert.deepEqual(this.renderer.stub("image").getCall(1).args, [-15, -20, 30, 40, "test-url-2", "center"]);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("image").getCall(1).returnValue);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 44);

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, not rotated. Image is url", function(assert) {
    this.options.symbol = "circle";
    this.options.image = "test-url";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("image").callCount, 2);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.topMarker, this.renderer.stub("image").getCall(0).returnValue);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);

    assert.deepEqual(this.renderer.stub("image").getCall(1).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("image").getCall(1).returnValue);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 44);

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is circle), rotated", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.deepEqual(this.renderer.stub("circle").getCall(1).args, []);

    assert.equal(point.graphic.topMarker, this.renderer.stub("circle").getCall(0).returnValue);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("circle").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 33, translateY: 22 });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22 });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is square), rotated", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "square";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 33, translateY: 22, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is polygon), rotated", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "polygon";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 33, translateY: 22, points: [-6, 0, 0, -6, 6, 0, 0, 6, -6, 0] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, 0, 0, -6, 6, 0, 0, 6, -6, 0] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is triangle), rotated", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "triangle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);
    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 33, translateY: 22, points: [-6, -6, 6, -6, 0, 6, -6, -6] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -6, 6, -6, 0, 6, -6, -6] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker (symbol is cross), rotated", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "cross";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 33, translateY: 22, points: [-6, -3, -3, -6, 0, -3, 3, -6, 6, -3, 3, 0, 6, 3, 3, 6, 0, 3, -3, 6, -6, 3, -3, 0] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -3, -3, -6, 0, -3, 3, -6, 6, -3, 3, 0, 6, 3, 3, 6, 0, 3, -3, 6, -6, 3, -3, 0] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, rotated. Top marker", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMaxPoint: "test-url"
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("image").callCount, 1);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.topMarker, this.renderer.stub("image").getCall(0).returnValue);

    assert.equal(this.renderer.stub("circle").callCount, 1);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("circle").getCall(0).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { translateX: 33, translateY: 22, visibility: undefined });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22 });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, rotated. Bottom marker", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMinPoint: "test-url"
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("circle").callCount, 1);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.equal(point.graphic.topMarker, this.renderer.stub("circle").getCall(0).returnValue);

    assert.equal(this.renderer.stub("image").callCount, 1);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("image").getCall(0).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 33, translateY: 22 });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { translateX: 11, translateY: 22, visibility: undefined });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, rotated. Both markers", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMaxPoint: "test-url",
            rangeMinPoint: "test-url-2"
        },
        width: {
            rangeMaxPoint: 10,
            rangeMinPoint: 30
        },
        height: {
            rangeMaxPoint: 20,
            rangeMinPoint: 40
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("image").callCount, 2);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-5, -10, 10, 20, "test-url", "center"]);
    assert.equal(point.graphic.topMarker, this.renderer.stub("image").getCall(0).returnValue);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 33);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);

    assert.deepEqual(this.renderer.stub("image").getCall(1).args, [-15, -20, 30, 40, "test-url-2", "center"]);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("image").getCall(1).returnValue);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 22);

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Marker with image, rotated. Image is url", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "circle";
    this.options.image = "test-url";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);

    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("image").callCount, 2);
    assert.deepEqual(this.renderer.stub("image").getCall(0).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.topMarker, this.renderer.stub("image").getCall(0).returnValue);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 33);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);

    assert.deepEqual(this.renderer.stub("image").getCall(1).args, [-10, -10, 20, 20, "test-url", "center"]);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("image").getCall(1).returnValue);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 22);

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("get bounding rect, rangearea", function(assert) {
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.strictEqual(point.getBoundingRect(), undefined);
});

QUnit.test("get bounding rect, rangebar", function(assert) {
    this.options.type = "rangebar";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.strictEqual(point.getBoundingRect(), undefined);
});

QUnit.module("Update Point", {
    beforeEach: function() {
        this.renderer = new vizMocks.Renderer();
        this.group = this.renderer.g();
        this.options = {
            widgetType: "chart",
            visible: true,
            styles: { normal: { r: 6 }, hover: { r: 6 }, selection: { r: 6 } },
            label: { visible: false }
        };
        this.series = {
            name: "series",
            _options: {},
            isFullStackedSeries: function() {
                return false;
            },
            getLabelVisibility: function() {
                return false;
            }
        };
        this.translators = {
            x: new MockTranslator({
                translate: { 1: 11, 2: 33 },
                getCanvasVisibleArea: { min: 0, max: 600 }
            }),
            y: new MockTranslator({
                translate: { 1: 22, 2: 44 },
                getCanvasVisibleArea: { min: 0, max: 800 }
            })
        };
        this.groups = {
            markers: this.group
        };
    }
});

QUnit.test("Circle to non-circle", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options, { symbol: "square" });
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "path");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "path");

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.deepEqual(this.renderer.stub("circle").getCall(1).args, []);
    assert.notEqual(point.graphic.topMarker, this.renderer.stub("circle").getCall(0).returnValue);
    assert.notEqual(point.graphic.bottomMarker, this.renderer.stub("circle").getCall(1).returnValue, 'ddd');

    assert.deepEqual(this.renderer.stub("circle").getCall(0).returnValue.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22 });
    assert.deepEqual(this.renderer.stub("circle").getCall(1).returnValue.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 44 });

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);
    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 44, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Non-circle to circle", function(assert) {
    this.options.symbol = "square";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options, { symbol: "circle" });
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.ok(point.graphic.bottomMarker);
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.notEqual(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.notEqual(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);

    assert.deepEqual(this.renderer.stub("path").getCall(0).returnValue.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });
    assert.deepEqual(this.renderer.stub("path").getCall(1).returnValue.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 44, points: [-6, -6, 6, -6, 6, 6, -6, 6, -6, -6] });

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.deepEqual(this.renderer.stub("circle").getCall(0).args, []);
    assert.deepEqual(this.renderer.stub("circle").getCall(1).args, []);
    assert.equal(point.graphic.topMarker, this.renderer.stub("circle").getCall(0).returnValue);
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("circle").getCall(1).returnValue);
    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 22 });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], { r: 6, translateX: 11, translateY: 44 });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Update radius", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "square";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    this.options.styles.normal.r = 10;
    point.updateOptions(this.options);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.equal(point.graphic.topMarker._stored_settings.r, 10);
    assert.ok(point.graphic.bottomMarker);
    assert.equal(point.graphic.bottomMarker._stored_settings.r, 10);

    assert.equal(point.graphic.topMarker._stored_settings.translateX, 33);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 22);

    assert.equal(this.renderer.stub("path").callCount, 2);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(0).args[1], "area");
    assert.equal(point.graphic.topMarker, this.renderer.stub("path").getCall(0).returnValue);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[0], []);
    assert.deepEqual(this.renderer.stub("path").getCall(1).args[1], "area");
    assert.equal(point.graphic.bottomMarker, this.renderer.stub("path").getCall(1).returnValue);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], { r: 10, translateX: 33, translateY: 22, points: [-10, -10, 10, -10, 10, 10, -10, 10, -10, -10] });
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], { r: 10, translateX: 11, translateY: 22, points: [-10, -10, 10, -10, 10, 10, -10, 10, -10, -10] });

    assert.equal(point.graphic.topMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(point.graphic.bottomMarker.stub("append").lastCall.args[0], this.group.children[0]);
    assert.equal(this.group.children[0].children.length, 2);
});

QUnit.test("Update fill", function(assert) {
    this.options.rotated = true;
    this.options.symbol = "square";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options, { styles: { normal: { fill: "red" } } });
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);

    assert.equal(point.graphic.topMarker._stored_settings.translateX, 33);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 22);
});

QUnit.test("Update location", function(assert) {
    this.options.symbol = "square";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point.x = 10;
    point.minY = 20;
    point.y = 30;
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 10);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 20);
    assert.ok(point.graphic.bottomMarker);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 10);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 42);
});

QUnit.test("Update location when one of marker is invisible", function(assert) {
    this.options.symbol = "square";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = false;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point.x = 10;
    point.minY = 20;
    point.y = 30;
    point.draw(this.renderer, this.groups);

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 10);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 20);

    assert.equal(this.group.children.length, 1);
    assert.equal(point.graphic.children.length, 1);
});

QUnit.test("Non-image to image. Top marker", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options, { image: { url: { rangeMaxPoint: "test" } } });
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("circle").callCount, 3);
    assert.equal(this.renderer.stub("image").callCount, 1);
});

QUnit.test("Non-image to image. Bottom marker", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options, { image: { url: { rangeMinPoint: "test" } } });
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("circle").callCount, 3);
    assert.equal(this.renderer.stub("image").callCount, 1);
});

QUnit.test("Non-image to image. Both markers (image is object)", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options, { image: { url: { rangeMinPoint: "test", rangeMaxPoint: "test" } } });
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.equal(this.renderer.stub("image").callCount, 2);
});

QUnit.test("Non-image to image. Both markers (image is url)", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options, { image: "test" });
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.equal(this.renderer.stub("image").callCount, 2);
});

QUnit.test("Image to non-image. Top marker", function(assert) {
    this.options.symbol = "circle";
    this.options.image = { url: { rangeMaxPoint: "test" } };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options);
    newOptions.image = {};
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("circle").callCount, 3);
    assert.equal(this.renderer.stub("image").callCount, 1);
});

QUnit.test("Image to non-image. Bottom marker", function(assert) {
    this.options.symbol = "circle";
    this.options.image = { url: { rangeMinPoint: "test" } };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options);
    newOptions.image = {};
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("circle").callCount, 3);
    assert.equal(this.renderer.stub("image").callCount, 1);
});

QUnit.test("Image to non-image. Both markers (image is object)", function(assert) {
    this.options.symbol = "circle";
    this.options.image = { url: { rangeMinPoint: "test", rangeMaxPoint: "test" } };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options);
    newOptions.image = {};
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.equal(this.renderer.stub("image").callCount, 2);
});

QUnit.test("Image to non-image. Both markers (image is url)", function(assert) {
    this.options.symbol = "circle";
    this.options.image = "test";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options);
    newOptions.image = {};
    point.updateOptions(newOptions);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(this.renderer.stub("circle").callCount, 2);
    assert.equal(this.renderer.stub("image").callCount, 2);
});

QUnit.test("Update size and url of image. Top marker", function(assert) {
    this.options.symbol = "circle";
    this.options.image = { url: { rangeMaxPoint: "test" } };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    this.options.image = { url: { rangeMaxPoint: "new-test" }, width: 30, height: 40 };
    point.updateOptions(this.options);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "circle");

    assert.equal(point.graphic.topMarker._stored_settings.href, "new-test");
    assert.equal(point.graphic.topMarker._stored_settings.width, 30);
    assert.equal(point.graphic.topMarker._stored_settings.height, 40);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);
});

QUnit.test("Update size and url of image. Bottom marker", function(assert) {
    this.options.symbol = "circle";
    this.options.image = { url: { rangeMinPoint: "test" } };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    this.options.image = { url: { rangeMinPoint: "new-test" }, width: 30, height: 40 };
    point.updateOptions(this.options);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "circle");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(point.graphic.bottomMarker._stored_settings.href, "new-test");
    assert.equal(point.graphic.bottomMarker._stored_settings.width, 30);
    assert.equal(point.graphic.bottomMarker._stored_settings.height, 40);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 44);
});

QUnit.test("Update size and url of image. Both markers (image is object)", function(assert) {
    this.options.symbol = "circle";
    this.options.image = { url: { rangeMinPoint: "test-2", rangeMaxPoint: "test" } };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    this.options.image = {
        url: {
            rangeMinPoint: "new-test-2",
            rangeMaxPoint: "new-test"
        },
        width: {
            rangeMinPoint: 50,
            rangeMaxPoint: 30
        },
        height: {
            rangeMinPoint: 60,
            rangeMaxPoint: 40
        }
    };
    point.updateOptions(this.options);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(point.graphic.topMarker._stored_settings.href, "new-test");
    assert.equal(point.graphic.topMarker._stored_settings.width, 30);
    assert.equal(point.graphic.topMarker._stored_settings.height, 40);
    assert.equal(point.graphic.topMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.topMarker._stored_settings.translateY, 22);

    assert.equal(point.graphic.bottomMarker._stored_settings.href, "new-test-2");
    assert.equal(point.graphic.bottomMarker._stored_settings.width, 50);
    assert.equal(point.graphic.bottomMarker._stored_settings.height, 60);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateX, 11);
    assert.equal(point.graphic.bottomMarker._stored_settings.translateY, 44);
});

QUnit.test("Update size and url of image. Both markers (image is url)", function(assert) {
    this.options.symbol = "circle";
    this.options.image = "test";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    this.options.image = "new-test";
    point.updateOptions(this.options);
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    assert.equal(point.graphic.topMarker.typeOfNode, "image");
    assert.equal(point.graphic.bottomMarker.typeOfNode, "image");

    assert.equal(point.graphic.topMarker._stored_settings.href, "new-test");
    assert.equal(point.graphic.bottomMarker._stored_settings.href, "new-test");
});

QUnit.test("Update markers style", function(assert) {
    this.options.symbol = "circle";
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 1 }, this.options),
        style = {
            fill: 'hover-style',
            stroke: 'hover-stroke',
            'stroke-width': 'hover-strokeWidth',
            r: 'hover-radius'
        };

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point._updateMarker(undefined, style);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], $.extend(style, { translateX: 11, translateY: 22 }));
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], $.extend(style, { translateX: 11, translateY: 22 }));
});

QUnit.test("Update markers style when top marker is image", function(assert) {
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMaxPoint: 'test'
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 1 }, this.options),
        style = {
            fill: 'hover-style',
            stroke: 'hover-stroke',
            'stroke-width': 'hover-strokeWidth',
            r: 'hover-radius'
        };

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point._updateMarker(undefined, style);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], {
        "height": 20,
        "href": "test",
        "translateX": 11,
        "translateY": 22,
        "width": 20
    });

    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], $.extend(style, { translateX: 11, translateY: 22 }));
});

QUnit.test("Update markers style when bottom marker is image", function(assert) {
    this.options.symbol = "circle";
    this.options.image = {
        url: {
            rangeMinPoint: 'test'
        }
    };
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 1 }, this.options),
        style = {
            fill: 'hover-style',
            stroke: 'hover-stroke',
            'stroke-width': 'hover-strokeWidth',
            r: 'hover-radius'
        };

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point._updateMarker(undefined, style);

    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0], $.extend(style, { translateX: 11, translateY: 22 }));
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0], {
        "height": 20,
        "href": "test",
        "translateX": 11,
        "translateY": 22,
        "width": 20
    });
});

QUnit.module("Point visibility", {
    beforeEach: function() {
        environment.beforeEach.apply(this, arguments);
        this.data = {
            argument: 1,
            value: 1,
            minValue: 1
        };
        this.translators = {
            x: new MockTranslator({
                translate: { "null": 0, 1: 11 },
                getCanvasVisibleArea: { min: 0, max: 600 }
            }),
            y: new MockTranslator({
                translate: { "null": 0, 1: 22 },
                getCanvasVisibleArea: { min: 0, max: 800 }
            })
        };
        this.groups = {
            markers: this.group,
        };
        this.options = {
            widgetType: "chart",
            visible: true,
            symbol: "circle",
            styles: { normal: { r: 6, style: { fill: "red", stroke: "yellow", 'stroke-width': 2 } } },
            label: { visible: false }
        };
    },
    afterEach: environment.afterEach
});

QUnit.test("Clear marker", function(assert) {
    var point = createPoint(this.series, this.data, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point.clearMarker();

    assert.strictEqual(point.graphic.topMarker._stored_settings.fill, null);
    assert.strictEqual(point.graphic.topMarker._stored_settings.stroke, null);

    assert.strictEqual(point.graphic.topMarker._stored_settings.visibility, undefined);
    assert.strictEqual(point.graphic.topMarker._stored_settings['stroke-width'], undefined);
    assert.strictEqual(point.graphic.topMarker._stored_settings.opacity, undefined);

    assert.strictEqual(point.graphic.bottomMarker._stored_settings.fill, null);
    assert.strictEqual(point.graphic.bottomMarker._stored_settings.stroke, null);

    assert.strictEqual(point.graphic.bottomMarker._stored_settings.visibility, undefined);
    assert.strictEqual(point.graphic.bottomMarker._stored_settings['stroke-width'], undefined);
    assert.strictEqual(point.graphic.bottomMarker._stored_settings.opacity, undefined);
});

QUnit.test("Check clearing marker on customize point", function(assert) {
    this.options.styles.usePointCustomOptions = true;
    var point = createPoint(this.series, this.data, this.options);

    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    var newOptions = $.extend(true, {}, this.options);
    newOptions.styles.usePointCustomOptions = false;
    var spy = sinon.spy(point, "clearMarker");
    point.updateOptions(newOptions);
    point.draw(this.renderer, this.groups);

    assert.ok(spy.calledOnce);
});

QUnit.test("Clear visibility", function(assert) {
    this.options.styles.normal.visibility = "visible";
    this.options.styles.useLabelCustomOptions = true;
    var point = createPoint(this.series, this.data, this.options);

    point.translate(this.translators);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.draw(this.renderer, this.groups);

    point.clearVisibility();

    assert.strictEqual(point.graphic.topMarker._stored_settings.visibility, null);
    assert.ok(point._topLabel.clearVisibility.called);
    assert.strictEqual(point.graphic.bottomMarker._stored_settings.visibility, null);
    assert.ok(point._bottomLabel.clearVisibility.called);
});

QUnit.test("Hide marker when marker is visible", function(assert) {
    this.options.styles.normal.visibility = "visible";
    var point = createPoint(this.series, this.data, this.options);

    point.translate(this.translators);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.draw(this.renderer, this.groups);

    point.graphic.topMarker.stub("attr").reset();
    point.graphic.bottomMarker.stub("attr").reset();

    point.setInvisibility();

    assert.equal(point.graphic.topMarker.stub("attr").callCount, 2);
    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], "visibility");
    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0].visibility, "hidden");
    assert.ok(point._topLabel.hide.calledOnce);

    assert.equal(point.graphic.bottomMarker.stub("attr").callCount, 2);
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], "visibility");
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0].visibility, "hidden");
    assert.ok(point._bottomLabel.hide.calledOnce);
});

QUnit.test("Hide marker when marker has no visibility setting", function(assert) {
    var point = createPoint(this.series, this.data, this.options);

    point.translate(this.translators);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.draw(this.renderer, this.groups);

    point.graphic.topMarker.stub("attr").reset();
    point.graphic.bottomMarker.stub("attr").reset();

    point.setInvisibility();

    assert.equal(point.graphic.topMarker.stub("attr").callCount, 2);
    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], "visibility");
    assert.deepEqual(point.graphic.topMarker.stub("attr").lastCall.args[0].visibility, "hidden");
    assert.ok(point._topLabel.hide.calledOnce);

    assert.equal(point.graphic.bottomMarker.stub("attr").callCount, 2);
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], "visibility");
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").lastCall.args[0].visibility, "hidden");
    assert.ok(point._bottomLabel.hide.calledOnce);
});

QUnit.test("Hide marker when marker is hidden", function(assert) {
    this.options.styles.normal.visibility = "hidden";
    this.options.styles.useLabelCustomOptions = true;
    this.options.label.visible = false;
    var point = createPoint(this.series, this.data, this.options);

    point.translate(this.translators);
    point.visibleTopMarker = true;
    point.visibleBottomMarker = true;
    point.draw(this.renderer, this.groups);

    point.graphic.topMarker.stub("attr").reset();
    point.graphic.bottomMarker.stub("attr").reset();

    point.setInvisibility();

    assert.strictEqual(point.graphic.topMarker._stored_settings.visibility, "hidden");
    assert.equal(point.graphic.topMarker.stub("attr").callCount, 1);
    assert.deepEqual(point.graphic.topMarker.stub("attr").firstCall.args[0], "visibility");
    assert.ok(point._topLabel.hide.called);

    assert.strictEqual(point.graphic.bottomMarker._stored_settings.visibility, "hidden");
    assert.equal(point.graphic.bottomMarker.stub("attr").callCount, 1);
    assert.deepEqual(point.graphic.bottomMarker.stub("attr").firstCall.args[0], "visibility");
    assert.ok(point._bottomLabel.hide.called);
});

QUnit.test("Apply style when top marker is invisible", function(assert) {
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = false;
    point.visibleBottomMarker = true;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point.applyStyle();

    assert.ok(point.graphic);
    assert.ok(!point.graphic.topMarker);
    assert.ok(point.graphic.bottomMarker);
});

QUnit.test("Apply style when bottom marker is invisible", function(assert) {
    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 2 }, this.options);

    point.visibleTopMarker = true;
    point.visibleBottomMarker = false;
    point.translate(this.translators);
    point.draw(this.renderer, this.groups);

    point.applyStyle();

    assert.ok(point.graphic);
    assert.ok(point.graphic.topMarker);
    assert.ok(!point.graphic.bottomMarker);
});

QUnit.module("Tooltip", {
    beforeEach: function() {
        this.translators = {
            x: new MockTranslator({
                translate: { 1: 11, 2: 33 },
                getCanvasVisibleArea: { min: 10, max: 600 }
            }),
            y: new MockTranslator({
                translate: { 1: 22, 2: 44 },
                getCanvasVisibleArea: { min: 5, max: 810 }
            })
        };
        this.data = {
            value: 10,
            argument: 1,
            minValue: 4
        };
        this.options = {
            widgetType: "chart",
            styles: {},
            label: { visible: false }
        };
        this.series = {
            name: "Series1",
            isFullStackedSeries: function() { return false; },
            getLabelVisibility: function() { return false; }
        };
        var StubTooltip = vizMocks.stubClass(tooltipModule.Tooltip, {
            formatValue: function(value, specialFormat) {
                return value || value === 0 ? value + ':' + specialFormat : value || '';
            }
        });
        this.tooltip = new StubTooltip();
    }
});

QUnit.test("Get tooltip coordinates, not rotated", function(assert) {
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = 430;
    point.y = 250;
    point.minY = 200;
    point.height = 50;

    var cc = point.getTooltipParams();

    assert.equal(cc.x, 430);
    assert.equal(cc.y, 225);
    assert.equal(cc.offset, 0);
});

QUnit.test("Get tooltip coordinates, not rotated. Rangebar. Location is edge", function(assert) {
    this.options.type = 'rangebar';
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = 400;
    point.y = 200;
    point.width = 50;
    point.height = 100;

    var cc = point.getTooltipParams('edge');

    assert.deepEqual(cc, { x: 425, y: 200, offset: 0 });
});

QUnit.test("Get tooltip coordinates. Rangebar. Rotated. Location is edge", function(assert) {
    this.options.type = 'rangebar';
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = 400;
    point.y = 200;
    point.width = 50;
    point.height = 100;

    var cc = point.getTooltipParams('edge');

    assert.deepEqual(cc, { x: 450, y: 250, offset: 0 });
});

QUnit.test("Get tooltip coordinates. Rangebar. Not rotated. Location is center", function(assert) {
    this.options.type = 'rangebar';
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = 400;
    point.y = 200;
    point.width = 50;
    point.height = 100;

    var cc = point.getTooltipParams('center');

    assert.deepEqual(cc, { x: 425, y: 250, offset: 0 });
});

QUnit.test("Get tooltip coordinates. Rangebar. Rotated. Location is center", function(assert) {
    this.options.type = 'rangebar';
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = 400;
    point.y = 200;
    point.width = 50;
    point.height = 100;

    var cc = point.getTooltipParams('center');

    assert.deepEqual(cc, { x: 425, y: 250, offset: 0 });
});

QUnit.test("Get tooltip coordinates, not rotated, point is abroad on the top", function(assert) {
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = 430;
    point.y = 250;
    point.minY = -5;
    point.height = 255;

    var cc = point.getTooltipParams();

    assert.equal(cc.x, 430);
    assert.equal(cc.y, 127.5);
    assert.equal(cc.offset, 0);
});

QUnit.test("Get tooltip coordinates, not rotated, point is abroad on the bottom", function(assert) {
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = 430;
    point.y = 850;
    point.minY = 200;
    point.height = 650;

    var cc = point.getTooltipParams();

    assert.equal(cc.x, 430);
    assert.equal(cc.y, 505);
    assert.equal(cc.offset, 0);
});

QUnit.test("Get tooltip coordinates,rotated", function(assert) {
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options);
    point.translators = this.translators;
    point.x = 430;
    point.y = 250;
    point.minX = 200;
    point.width = 230;

    var cc = point.getTooltipParams();

    assert.equal(cc.x, 315);
    assert.equal(cc.y, 250);
    assert.equal(cc.offset, 0);
});

QUnit.test("Get tooltip coordinates,rotated, point is abroad on the left", function(assert) {
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options);
    point.translators = this.translators;
    point.x = 430;
    point.y = 250;
    point.minX = 5;
    point.width = 425;

    var cc = point.getTooltipParams();

    assert.equal(cc.x, 220);
    assert.equal(cc.y, 250);
    assert.equal(cc.offset, 0);
});

QUnit.test("Get tooltip coordinates,rotated, point is abroad on the right", function(assert) {
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options);
    point.translators = this.translators;
    point.x = 650;
    point.y = 250;
    point.minX = 200;
    point.width = 450;

    var cc = point.getTooltipParams();

    assert.equal(cc.x, 400);
    assert.equal(cc.y, 250);
    assert.equal(cc.offset, 0);
});

QUnit.test("Get tooltip Format Object. Range area", function(assert) {
    var point = createPoint(this.series, this.data, this.options),
        cc = point.getTooltipFormatObject(this.tooltip);

    assert.equal(cc.argument, 1);
    assert.equal(cc.argumentText, "1:argument");
    assert.equal(cc.valueText, "4:undefined - 10:undefined");
    assert.equal(cc.rangeValue1Text, "4:undefined");
    assert.equal(cc.rangeValue2Text, "10:undefined");
    assert.equal(cc.rangeValue1, 4);
    assert.equal(cc.rangeValue2, 10);
    assert.equal(cc.seriesName, "Series1");
    assert.equal(cc.point, point);
    assert.equal(cc.originalArgument, 1);
    assert.equal(cc.originalMinValue, 4);
    assert.equal(cc.originalValue, 10);
});

QUnit.test("Get tooltip Format Object. Range bar", function(assert) {
    this.options.type = "rangebar";
    var point = createPoint(this.series, this.data, this.options);
    var cc = point.getTooltipFormatObject(this.tooltip);

    assert.equal(cc.argument, 1);
    assert.equal(cc.argumentText, "1:argument");
    assert.equal(cc.valueText, "4:undefined - 10:undefined");
    assert.equal(cc.rangeValue1Text, "4:undefined");
    assert.equal(cc.rangeValue2Text, "10:undefined");
    assert.equal(cc.rangeValue1, 4);
    assert.equal(cc.rangeValue2, 10);
    assert.equal(cc.seriesName, "Series1");
    assert.equal(cc.point, point);
    assert.equal(cc.originalArgument, 1);
    assert.equal(cc.originalMinValue, 4);
    assert.equal(cc.originalValue, 10);
});

QUnit.module("API", {
    beforeEach: function() {
        this.opt = {
            widgetType: "chart",
            label: { visible: false },
            styles: {}
        };
        this.series = {
            name: "series",
            isFullStackedSeries: function() { return false; },
            getLabelVisibility: function() { return false; }
        };
        sinon.spy(labelModule, "Label");

        this.translators = {
            x: new MockTranslator({
                translate: { "null": 0, 1: 11, 10: 111 },
                getCanvasVisibleArea: { min: 0, max: 300 }
            }),
            y: new MockTranslator({
                translate: { "null": 0, 1: 22, 10: 222 },
                getCanvasVisibleArea: { min: 0, max: 300 }
            })
        };
    },
    afterEach: function() {
        labelModule.Label.restore();
    }
});

QUnit.test("HasValue. Positive value", function(assert) {
    var pt = createPoint(this.series, { argument: 12, value: 5, minValue: 4 }, this.opt);

    assert.strictEqual(pt.hasValue(), true);
});

QUnit.test("HasValue. Negative value", function(assert) {
    var pt = createPoint(this.series, { argument: 12, value: null, minValue: 4 }, this.opt);

    assert.strictEqual(pt.hasValue(), false);
});

QUnit.test("getLabel. Rangearea", function(assert) {
    this.opt.type = "rangearea";
    var pt = createPoint(this.series, { argument: 12, value: null, minValue: 4 }, this.opt),
        labels = pt.getLabel();

    assert.equal(labels.length, 2);
    assert.equal(labels[0], labelModule.Label.returnValues[0]);
    assert.equal(labels[1], labelModule.Label.returnValues[1]);
});

QUnit.test("getLabel. Rangebar", function(assert) {
    this.opt.type = "rangebar";
    var pt = createPoint(this.series, { argument: 12, value: null, minValue: 4 }, this.opt),
        labels = pt.getLabel();

    assert.equal(labels.length, 2);
    assert.equal(labels[0], labelModule.Label.returnValues[0]);
    assert.equal(labels[1], labelModule.Label.returnValues[1]);
});

QUnit.test("CoordsIn. RangeArea", function(assert) {
    this.opt.type = "rangearea";

    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 10 }, this.opt);
    point.translate(this.translators); //point.x = 11, point.y = 22; point.minY = 220

    point._storeTrackerR = function() {
        return 20;
    };
    //value marker
    assert.ok(point.coordsIn(11, 22), "center");
    assert.ok(point.coordsIn(21, 22), "right inside");
    assert.ok(point.coordsIn(31, 22), "right side");
    assert.ok(!point.coordsIn(32, 22), "right side out");

    assert.ok(point.coordsIn(10, 22), "left inside");
    assert.ok(point.coordsIn(-8, 22), "left side");
    assert.ok(!point.coordsIn(-11, 22), "left side out");

    assert.ok(point.coordsIn(11, 32), "bottom inside");
    assert.ok(point.coordsIn(11, 41), "bottom side");
    assert.ok(!point.coordsIn(11, 43), "bottom side out");

    assert.ok(point.coordsIn(11, 10), "top inside");
    assert.ok(point.coordsIn(11, 3), "top side");
    assert.ok(!point.coordsIn(11, 1), "top side out");
    //minValue marker
    assert.ok(point.coordsIn(11, 222), "center");
    assert.ok(point.coordsIn(21, 222), "right inside");
    assert.ok(point.coordsIn(31, 222), "right side");
    assert.ok(!point.coordsIn(32, 222), "right side out");

    assert.ok(point.coordsIn(10, 222), "left inside");
    assert.ok(point.coordsIn(-8, 222), "left side");
    assert.ok(!point.coordsIn(-11, 222), "left side out");

    assert.ok(point.coordsIn(11, 232), "bottom inside");
    assert.ok(point.coordsIn(11, 241), "bottom side");
    assert.ok(!point.coordsIn(11, 243), "bottom side out");

    assert.ok(point.coordsIn(11, 210), "top inside");
    assert.ok(point.coordsIn(11, 203), "top side");
    assert.ok(!point.coordsIn(11, 201), "top side out");
});

QUnit.test("CoordsIn. RangeArea. Rotated", function(assert) {
    this.opt.type = "rangearea";
    this.opt.rotated = true;

    var point = createPoint(this.series, { argument: 1, value: 1, minValue: 10 }, this.opt);
    point.translate(this.translators); //point.x = 11, point.y = 22; point.minX = 220

    point._storeTrackerR = function() {
        return 20;
    };
    //marker
    assert.ok(point.coordsIn(11, 22), "center");
    assert.ok(point.coordsIn(21, 22), "right inside");
    assert.ok(point.coordsIn(31, 22), "right side");
    assert.ok(!point.coordsIn(32, 22), "right side out");

    assert.ok(point.coordsIn(10, 22), "left inside");
    assert.ok(point.coordsIn(-8, 22), "left side");
    assert.ok(!point.coordsIn(-11, 22), "left side out");

    assert.ok(point.coordsIn(11, 32), "bottom inside");
    assert.ok(point.coordsIn(11, 41), "bottom side");
    assert.ok(!point.coordsIn(11, 43), "bottom side out");

    assert.ok(point.coordsIn(11, 10), "top inside");
    assert.ok(point.coordsIn(11, 3), "top side");
    assert.ok(!point.coordsIn(11, 1), "top side out");
    //min value marker
    assert.ok(point.coordsIn(111, 22), "center");
    assert.ok(point.coordsIn(121, 22), "right inside");
    assert.ok(point.coordsIn(131, 22), "right side");
    assert.ok(!point.coordsIn(132, 22), "right side out");

    assert.ok(point.coordsIn(110, 22), "left inside");
    assert.ok(point.coordsIn(98, 22), "left side");
    assert.ok(!point.coordsIn(-111, 22), "left side out");

    assert.ok(point.coordsIn(111, 32), "bottom inside");
    assert.ok(point.coordsIn(111, 41), "bottom side");
    assert.ok(!point.coordsIn(111, 43), "bottom side out");

    assert.ok(point.coordsIn(111, 10), "top inside");
    assert.ok(point.coordsIn(111, 3), "top side");
    assert.ok(!point.coordsIn(111, 1), "top side out");
});

QUnit.module("Check points in visible area", {
    beforeEach: function() {
        this.options = {
            widgetType: "chart",
            label: { visible: false },
            styles: {}
        };
        this.series = {
            name: "series",
            isFullStackedSeries: function() { return false; },
            getLabelVisibility: function() { return false; }
        };
        this.data = { argument: 1, value: 1, minValue: 1 };

        this.translators = {
            x: new MockTranslator({
                translate: { 1: 11, 2: 33 },
                getCanvasVisibleArea: { min: 0, max: 100 }
            }),
            y: new MockTranslator({
                translate: { 1: 22, 2: 44 },
                getCanvasVisibleArea: { min: 0, max: 210 }
            })
        };
    }
});

QUnit.test("Two points are in visible area, not rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt.x = 85;
    pt.y = 43;
    pt.minY = pt.minX = 99;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(pt.visibleTopMarker);
    assert.ok(pt.visibleBottomMarker);
});

QUnit.test("Two points are not in visible area on left, not rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt.x = -30;
    pt.y = 43;
    pt.minY = pt.minX = 99;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(!isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("Two points are not in visible area on right, not rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt.x = 130;
    pt.y = 43;
    pt.minY = pt.minX = 99;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(!isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("One of the points are not in visible area on top, not rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt.x = 30;
    pt.y = -45;
    pt.minY = pt.minX = 30;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(pt.visibleBottomMarker);
});

QUnit.test("One of the points are not in visible area on bottom, not rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt.x = 30;
    pt.y = 30;
    pt.minY = pt.minX = 330;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("Points are not in visible area, but area is visible, not rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt.x = 30;
    pt.y = -30;
    pt.minY = pt.minX = 330;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("Two points are in visible area, rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt._options.rotated = true;
    pt.y = 66;
    pt.x = 85;
    pt.minX = pt.minY = 45;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(pt.visibleTopMarker);
    assert.ok(pt.visibleBottomMarker);
});

QUnit.test("Two points are not in visible area on top, rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt._options.rotated = true;
    pt.y = -40;
    pt.x = 85;
    pt.minX = pt.minY = 45;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(!isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("Two points are not in visible area on bottom, rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt._options.rotated = true;
    pt.y = 230;
    pt.x = 85;
    pt.minX = pt.minY = 45;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(!isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("One of the points are not in visible area on left, rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt._options.rotated = true;
    pt.y = 50;
    pt.x = -33;
    pt.minX = pt.minY = 50;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("One of the points are not in visible area on right, rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt._options.rotated = true;
    pt.y = 50;
    pt.x = 50;
    pt.minX = pt.minY = 443;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(pt.visibleBottomMarker);
});

QUnit.test("Points are not in visible area, but area is visible, rotated", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt._options.rotated = true;
    pt.y = 50;
    pt.x = -50;
    pt.minX = pt.minY = 443;
    pt.translators = this.translators;

    var isInVisibleArea = pt.isInVisibleArea();

    assert.ok(isInVisibleArea);
    assert.ok(!pt.visibleTopMarker);
    assert.ok(!pt.visibleBottomMarker);
});

QUnit.test("Points are at the end of value axis", function(assert) {
    var pt = createPoint(this.series, this.data, this.options);
    pt.y = 0;
    pt.minY = 210;
    pt.minX = pt.x = 50;
    pt.translators = this.translators;

    pt.isInVisibleArea();

    assert.ok(pt.visibleTopMarker);
    assert.ok(pt.visibleBottomMarker);
});

QUnit.module("Point translators. Rangebar", {
    beforeEach: function() {
        this.opt = {
            widgetType: "chart",
            type: "rangebar",
            label: { visible: false },
            styles: {}
        };
        this.series = {
            name: "series",
            isFullStackedSeries: function() { return false; },
            getLabelVisibility: function() { return false; }
        };
        var translateXData = { 1: 110, 2: 220, 3: 330, 4: 440, 5: 550, "default": 70 },
            translateYData = { 1: 111, 2: 222, 3: 333, 4: 444, 5: 555, "default": 600 };


        this.continuousTranslators = {
            x: new MockTranslator({
                translate: translateXData,
                getCanvasVisibleArea: { min: 0, max: 800 }
            }),
            y: new MockTranslator({
                translate: translateYData,
                getCanvasVisibleArea: { min: 0, max: 800 }
            })
        };
    }
});

QUnit.test("Translate when value = minValue", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 5 }, this.opt);

    pt.minValue = 5;
    pt.translate(this.continuousTranslators);

    assert.equal(pt.x, 110);
    assert.equal(pt.y, 555);

    assert.equal(pt.height, 1);
    assert.equal(pt.width, undefined);

    assert.equal(pt.minY, 555);
});

QUnit.test("Translate when minValue = null", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 5 }, this.opt);

    pt.initialMinValue = pt.minValue = null;
    pt.translate(this.continuousTranslators);

    assert.ok(!pt.x);
    assert.ok(!pt.y);
});

QUnit.test("Translate when value = minValue. Rotated", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 5 }, this.opt);

    pt.minValue = 5;
    pt._options.rotated = true;
    pt.translate(this.continuousTranslators);

    assert.equal(pt.x, 550);
    assert.equal(pt.y, 111);

    assert.equal(pt.height, undefined);
    assert.equal(pt.width, 1);

    assert.equal(pt.minX, 550);
});

QUnit.module("Point coordinates translation with correction on canvas visible area.", {
    beforeEach: function() {
        this.opt = {
            widgetType: "chart",
            type: "rangebar",
            styles: {},
            label: { visible: false }
        };
        this.series = {
            name: "series",
            isFullStackedSeries: function() { return false; },
            getLabelVisibility: function() { return false; }
        };
        var translateXData = { 1: 0, 2: 80, 3: 200, 4: 300, 5: 400, 6: 480, 7: 600, "canvas_position_default": 100 },
            translateYData = { 1: 350, 2: 325, 3: 290, 4: 250, 5: 225, 6: 150, "canvas_position_default": 300 };

        this.continuousTranslators = {
            x: new MockTranslator({
                translate: translateXData,
                failOnWrongData: true,
                getCanvasVisibleArea: { min: 100, max: 500 }
            }),
            y: new MockTranslator({
                translate: translateYData,
                failOnWrongData: true,
                getCanvasVisibleArea: { min: 200, max: 300 }
            })
        };
    }
});

QUnit.test("Point is out of boundaries on the left", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 4, minValue: 3 }, this.opt);

    pt.width = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, false, "inVisibleArea");
    assert.strictEqual(pt.y, 250, "y");
    assert.strictEqual(pt.minY, 290, "minY");
    assert.strictEqual(pt.height, 40, "height");
    assert.strictEqual(pt.x, 0, "x");
    assert.strictEqual(pt.minX, 0, "minX");
    assert.strictEqual(pt.width, 50, "width");
});

QUnit.test("Point is partially out of boundaries on the left and bottom", function(assert) {
    var pt = createPoint(this.series, { argument: 2, value: 5, minValue: 2 }, this.opt);

    pt.width = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 225, "y");
    assert.strictEqual(pt.minY, 300, "minY");
    assert.strictEqual(pt.height, 75, "height");
    assert.strictEqual(pt.x, 100, "x");
    assert.strictEqual(pt.minX, 100, "minX");
    assert.strictEqual(pt.width, 30, "width");
});

QUnit.test("Point is partially out of boundaries at the top and bottom", function(assert) {
    var pt = createPoint(this.series, { argument: 3, value: 6, minValue: 1 }, this.opt);

    pt.width = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 200, "y");
    assert.strictEqual(pt.minY, 300, "minY");
    assert.strictEqual(pt.height, 100, "height");
    assert.strictEqual(pt.x, 200, "x");
    assert.strictEqual(pt.minX, 200, "minX");
    assert.strictEqual(pt.width, 50, "width");
});

QUnit.test("Point is partially out of boundaries at the bottom", function(assert) {
    var pt = createPoint(this.series, { argument: 4, value: 4, minValue: 1 }, this.opt);

    pt.width = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 250, "y");
    assert.strictEqual(pt.minY, 300, "minY");
    assert.strictEqual(pt.height, 50, "height");
    assert.strictEqual(pt.x, 300, "x");
    assert.strictEqual(pt.minX, 300, "minX");
    assert.strictEqual(pt.width, 50, "width");
});

QUnit.test("Point is partially out of boundaries at the top", function(assert) {
    var pt = createPoint(this.series, { argument: 5, value: 6, minValue: 4 }, this.opt);

    pt.width = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 200, "y");
    assert.strictEqual(pt.minY, 250, "minY");
    assert.strictEqual(pt.height, 50, "height");
    assert.strictEqual(pt.x, 400, "x");
    assert.strictEqual(pt.minX, 400, "minX");
    assert.strictEqual(pt.width, 50, "width");
});

QUnit.test("Point is partially out of boundaries on the right", function(assert) {
    var pt = createPoint(this.series, { argument: 6, value: 5, minValue: 3 }, this.opt);

    pt.width = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 225, "y");
    assert.strictEqual(pt.minY, 290, "minY");
    assert.strictEqual(pt.height, 65, "height");
    assert.strictEqual(pt.x, 480, "x");
    assert.strictEqual(pt.minX, 480, "minX");
    assert.strictEqual(pt.width, 20, "width");
});

QUnit.test("Point is out of boundaries on the right", function(assert) {
    var pt = createPoint(this.series, { argument: 7, value: 5, minValue: 2 }, this.opt);

    pt.width = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, false, "inVisibleArea");
    assert.strictEqual(pt.y, 225, "y");
    assert.strictEqual(pt.minY, 300, "minY");
    assert.strictEqual(pt.height, 75, "height");
    assert.strictEqual(pt.x, 600, "x");
    assert.strictEqual(pt.minX, 600, "minX");
    assert.strictEqual(pt.width, 50, "width");
});

QUnit.module("Point coordinates translation with correction on canvas visible area. Rotated.", {
    beforeEach: function() {
        this.opt = {
            widgetType: "chart",
            type: "rangebar",
            styles: {},
            rotated: true,
            label: { visible: false }
        };
        this.series = {
            name: "series",
            isFullStackedSeries: function() { return false; },
            getLabelVisibility: function() { return false; }
        };
        var translateYData = { 1: 0, 2: 80, 3: 200, 4: 300, 5: 400, 6: 480, 7: 600, "canvas_position_default": 100 },
            translateXData = { 1: 350, 2: 325, 3: 290, 4: 250, 5: 225, 6: 150, "canvas_position_default": 300 };

        this.continuousTranslators = {
            x: new MockTranslator({
                translate: translateXData,
                failOnWrongData: true,
                getCanvasVisibleArea: { min: 200, max: 300 }
            }),
            y: new MockTranslator({
                translate: translateYData,
                failOnWrongData: true,
                getCanvasVisibleArea: { min: 100, max: 500 }
            })
        };
    }
});

QUnit.test("Point is out of boundaries on the left", function(assert) {
    var pt = createPoint(this.series, { argument: 1, value: 4, minValue: 3 }, this.opt);

    pt.height = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, false, "inVisibleArea");
    assert.strictEqual(pt.y, 0, "y");
    assert.strictEqual(pt.minY, 0, "minY");
    assert.strictEqual(pt.height, 50, "height");
    assert.strictEqual(pt.x, 250, "x");
    assert.strictEqual(pt.minX, 290, "minX");
    assert.strictEqual(pt.width, 40, "width");
});

QUnit.test("Point is partially out of boundaries on the left and bottom", function(assert) {
    var pt = createPoint(this.series, { argument: 2, value: 5, minValue: 2 }, this.opt);

    pt.height = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 100, "y");
    assert.strictEqual(pt.minY, 100, "minY");
    assert.strictEqual(pt.height, 30, "height");
    assert.strictEqual(pt.x, 225, "x");
    assert.strictEqual(pt.minX, 300, "minX");
    assert.strictEqual(pt.width, 75, "width");
});

QUnit.test("Point is partially out of boundaries at the top and bottom", function(assert) {
    var pt = createPoint(this.series, { argument: 3, value: 6, minValue: 1 }, this.opt);

    pt.height = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 200, "y");
    assert.strictEqual(pt.minY, 200, "minY");
    assert.strictEqual(pt.height, 50, "height");
    assert.strictEqual(pt.x, 200, "x");
    assert.strictEqual(pt.minX, 300, "minX");
    assert.strictEqual(pt.width, 100, "width");
});

QUnit.test("Point is partially out of boundaries at the bottom", function(assert) {
    var pt = createPoint(this.series, { argument: 4, value: 4, minValue: 1 }, this.opt);

    pt.height = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 300, "y");
    assert.strictEqual(pt.minY, 300, "minY");
    assert.strictEqual(pt.height, 50, "height");
    assert.strictEqual(pt.x, 250, "x");
    assert.strictEqual(pt.minX, 300, "minX");
    assert.strictEqual(pt.width, 50, "width");
});

QUnit.test("Point is partially out of boundaries at the top", function(assert) {
    var pt = createPoint(this.series, { argument: 5, value: 6, minValue: 4 }, this.opt);

    pt.height = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 400, "y");
    assert.strictEqual(pt.minY, 400, "minY");
    assert.strictEqual(pt.height, 50, "height");
    assert.strictEqual(pt.x, 200, "x");
    assert.strictEqual(pt.minX, 250, "minX");
    assert.strictEqual(pt.width, 50, "width");
});

QUnit.test("Point is partially out of boundaries on the right", function(assert) {
    var pt = createPoint(this.series, { argument: 6, value: 5, minValue: 3 }, this.opt);

    pt.height = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, true, "inVisibleArea");
    assert.strictEqual(pt.y, 480, "y");
    assert.strictEqual(pt.minY, 480, "minY");
    assert.strictEqual(pt.height, 20, "height");
    assert.strictEqual(pt.x, 225, "x");
    assert.strictEqual(pt.minX, 290, "minX");
    assert.strictEqual(pt.width, 65, "width");
});

QUnit.test("Point is out of boundaries on the right", function(assert) {
    var pt = createPoint(this.series, { argument: 7, value: 5, minValue: 2 }, this.opt);

    pt.height = 50;
    pt.translate(this.continuousTranslators);

    assert.strictEqual(pt.inVisibleArea, false, "inVisibleArea");
    assert.strictEqual(pt.y, 600, "y");
    assert.strictEqual(pt.minY, 600, "minY");
    assert.strictEqual(pt.height, 50, "height");
    assert.strictEqual(pt.x, 225, "x");
    assert.strictEqual(pt.minX, 300, "minX");
    assert.strictEqual(pt.width, 75, "width");
});

QUnit.module("HasValue method. RangeBar", {
    beforeEach: function() {
        this.opt = {
            widgetType: "chart",
            type: "rangebar",
            label: {},
            styles: {}
        };
        this.series = {
            name: "series1",
            isFullStackedSeries: function() { return false; },
            getLabelVisibility: function() { return false; }
        };
    }
});

QUnit.test("Positive", function(assert) {
    var pt = createPoint(this.series, { argument: 12, value: 5, minValue: 4 }, this.opt),
        result = pt.hasValue();

    assert.strictEqual(result, true);
});

QUnit.test("Negative. value", function(assert) {
    var pt = createPoint(this.series, { argument: 12, value: null, minValue: 4 }, this.opt),
        result = pt.hasValue();

    assert.strictEqual(result, false);
});

QUnit.module("Draw label", environment);

//helper
function createLabels(x, y, minY) {
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = x;
    point.y = y;
    point.minY = minY;

    point._drawLabel(this.renderer, this.group);
    return { tl: point._topLabel, bl: point._bottomLabel };
}

QUnit.test("Create label", function(assert) {
    var point = createPoint(this.series, this.data, this.options);
    assert.ok(this.labelFactory.calledTwice);
    assert.equal(this.labelFactory.args[0][0].renderer, point.series._renderer);
    assert.equal(this.labelFactory.args[0][0].labelsGroup, point.series._labelsGroup);
    assert.equal(this.labelFactory.args[0][0].point, point);

    assert.equal(this.labelFactory.args[1][0].renderer, point.series._renderer);
    assert.equal(this.labelFactory.args[1][0].labelsGroup, point.series._labelsGroup);
    assert.equal(this.labelFactory.args[1][0].point, point);
});

QUnit.test("Get label format object", function(assert) {
    var point = createPoint(this.series, this.data, this.options),
        formatObject = point._getLabelFormatObject(),
        minFormatObject = point._getLabelMinFormatObject();

    assert.equal(formatObject.value, 15);
    assert.equal(formatObject.argument, 25);
    assert.equal(formatObject.originalValue, 15);
    assert.equal(formatObject.originalArgument, 25);
    assert.equal(formatObject.seriesName, "series");
    assert.deepEqual(formatObject.point, point);

    assert.equal(minFormatObject.value, 10);
    assert.equal(minFormatObject.argument, 25);
    assert.equal(minFormatObject.originalValue, 10);
    assert.equal(minFormatObject.originalArgument, 25);
    assert.equal(minFormatObject.seriesName, "series");
    assert.deepEqual(minFormatObject.point, point);
});

QUnit.test("Check customize text object", function(assert) {
    this.series.seriesName = "series";
    var pt = createPoint(this.series, this.data, this.options);

    assert.equal(pt._topLabel.setData.callCount, 1);
    assert.equal(pt._topLabel.setData.args[0][0].index, 1);
    assert.equal(pt._topLabel.setData.args[0][0].argument, 25);
    assert.equal(pt._topLabel.setData.args[0][0].value, 15);
    assert.equal(pt._topLabel.setData.args[0][0].originalArgument, 25);
    assert.equal(pt._topLabel.setData.args[0][0].originalValue, 15);
    assert.equal(pt._topLabel.setData.args[0][0].seriesName, "series");
    assert.equal(pt._topLabel.setData.args[0][0].point, pt);

    assert.equal(pt._bottomLabel.setData.callCount, 1);
    assert.equal(pt._bottomLabel.setData.args[0][0].index, 0);
    assert.equal(pt._bottomLabel.setData.args[0][0].argument, 25);
    assert.equal(pt._bottomLabel.setData.args[0][0].value, 10);
    assert.equal(pt._bottomLabel.setData.args[0][0].originalArgument, 25);
    assert.equal(pt._bottomLabel.setData.args[0][0].originalValue, 10);
    assert.equal(pt._bottomLabel.setData.args[0][0].seriesName, "series");
    assert.equal(pt._bottomLabel.setData.args[0][0].point, pt);
});

QUnit.test("Visible", function(assert) {
    var labels = createLabels.call(this, 33, 32, 22);

    assert.ok(labels.tl);
    assert.ok(labels.bl);
    assert.equal(labels.tl.show.callCount, 1);
    assert.equal(labels.bl.show.callCount, 1);
});

QUnit.test("Null value and minValue", function(assert) {
    this.data.value = null;
    this.data.minValue = null;
    var labels = createLabels.call(this, 33, 32, 22);

    assert.ok(labels.tl);
    assert.ok(labels.bl);
    assert.equal(labels.tl.show.callCount, 0);
    assert.equal(labels.bl.show.callCount, 0);
});

QUnit.test("Null value", function(assert) {
    this.data.value = null;
    var labels = createLabels.call(this, 33, 32, 22);

    assert.ok(labels.tl);
    assert.ok(labels.bl);
    assert.equal(labels.tl.show.callCount, 0);
    assert.equal(labels.bl.show.callCount, 0);
});

QUnit.test("Null minValue", function(assert) {
    this.data.minValue = null;
    var labels = createLabels.call(this, 33, 32, 22);

    assert.ok(labels.tl);
    assert.ok(labels.bl);
    assert.equal(labels.tl.show.callCount, 0);
    assert.equal(labels.bl.show.callCount, 0);
});

QUnit.test("hide label on draw if it invisible", function(assert) {
    var point = createPoint(this.series, this.data, this.options);
    point.x = 33;
    point.y = 32;
    point.minY = 22;
    point.translators = this.translators;

    point._drawLabel(this.renderer, this.group);

    this.series.getLabelVisibility = function() {
        return false;
    };

    point.updateOptions(this.options);

    point._drawLabel(this.renderer, this.group);

    assert.equal(point._topLabel.hide.callCount, 1);
    assert.equal(point._bottomLabel.hide.callCount, 1);
});

QUnit.test("CustomizeLabel visibility is true, series labels are not visible", function(assert) {
    this.series.getLabelVisibility = function() {
        return false;
    };
    this.options.styles.useLabelCustomOptions = true;
    this.options.label.visible = true;

    var point = createPoint(this.series, this.data, this.options);
    point.translators = this.translators;

    point._drawLabel(this.renderer, this.group);

    assert.ok(point.getLabels()[0].show.called);
    assert.ok(point.getLabels()[1].show.called);
});

QUnit.test("CustomizeLabel visibility is false, series labels are visible", function(assert) {
    this.options.styles.useLabelCustomOptions = true;
    this.options.label.visible = false;

    var point = createPoint(this.series, this.data, this.options);
    point.translators = this.translators;

    point._drawLabel(this.renderer, this.group);

    assert.ok(!point.getLabels()[0].show.called);
    assert.ok(!point.getLabels()[1].show.called);
});

QUnit.test("Value < minValue, not rotated", function(assert) {
    var labels = createLabels.call(this, 33, 54, 35);

    assert.equal(labels.tl.show.callCount, 1);
    assert.equal(labels.bl.show.callCount, 1);
    assert.equal(labels.tl.pointPosition, "bottom");
    assert.equal(labels.bl.pointPosition, "top");
});

QUnit.test("Value > minValue, not rotated", function(assert) {
    var labels = createLabels.call(this, 33, 35, 54);

    assert.equal(labels.tl.show.callCount, 1);
    assert.equal(labels.bl.show.callCount, 1);
    assert.equal(labels.tl.pointPosition, "top");
    assert.equal(labels.bl.pointPosition, "bottom");
});

QUnit.test("Value < minValue, rotated", function(assert) {
    this.options.rotated = true;
    var labels = createLabels.call(this, 33, 54, 35);

    assert.equal(labels.tl.show.callCount, 1);
    assert.equal(labels.bl.show.callCount, 1);
    assert.equal(labels.tl.pointPosition, "bottom");
    assert.equal(labels.bl.pointPosition, "top");
});

QUnit.test("Value > minValue, rotated", function(assert) {
    this.options.rotated = true;
    var labels = createLabels.call(this, 33, 35, 54);

    assert.equal(labels.tl.show.callCount, 1);
    assert.equal(labels.bl.show.callCount, 1);
    assert.equal(labels.tl.pointPosition, "bottom");
    assert.equal(labels.bl.pointPosition, "top");
});

QUnit.test("Value axis contains categories", function(assert) {
    this.series._options.valueAxisType = "discrete";
    this.data.value = "25";
    this.data.minValue = "7";
    var labels = createLabels.call(this, 46, 90, 100);

    assert.equal(labels.tl.show.callCount, 1);
    assert.equal(labels.bl.show.callCount, 1);
    assert.equal(labels.tl.pointPosition, "top");
    assert.equal(labels.bl.pointPosition, "bottom");
});

QUnit.module("Draw Label. Range area", {
    beforeEach: function() {
        environment.beforeEach.apply(this, arguments);
        this.renderer.bBoxTemplate = { x: 0, y: 40, height: 10, width: 20 };
        this.translators.x = new MockTranslator({
            translate: { 1: 350, 2: 325, 3: 290, 4: 250, 5: 225, 6: 150, "canvas_position_default": 300 },
            failOnWrongData: true,
            getCanvasVisibleArea: { min: 0, max: 200 }
        });
        this.options.visible = true;
        this.options.styles = { normal: { r: 0 }, hover: {} };
        this.options.label.position = "outside";
    },
    afterEach: environment.afterEach
});

//helpers
var createCorrectionLabels = function(pos1, pos2, x, y, minY, minX) {
    var point = createPoint(this.series, this.data, this.options),
        topLabel = point._topLabel,
        bottomLabel = point._bottomLabel;

    point.translators = this.translators;
    point.x = x;
    point.y = y;
    minY && (point.minY = minY);
    minX && (point.minX = minX);
    topLabel.pointPosition = pos1;
    bottomLabel.pointPosition = pos2;

    point.correctLabelPosition(topLabel);
    point.correctLabelPosition(bottomLabel);
    return { topLabel: topLabel, bottomLabel: bottomLabel };
};

QUnit.test("Get graphic bbox. Not rotated. Not image", function(assert) {
    this.options.styles.normal.r = 5;
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point.x = 33;
    point.y = 54;
    point.minY = 100;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 28);
    assert.equal(topLabelGraphicBBox.y, 49);
    assert.equal(topLabelGraphicBBox.width, 10);
    assert.equal(topLabelGraphicBBox.height, 10);

    assert.equal(bottomLabelGraphicBBox.x, 28);
    assert.equal(bottomLabelGraphicBBox.y, 95);
    assert.equal(bottomLabelGraphicBBox.width, 10);
    assert.equal(bottomLabelGraphicBBox.height, 10);
});

QUnit.test("Get graphic bbox. Not rotated. Not image. Point is invisible", function(assert) {
    this.options.styles.normal.r = 5;
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point._options.visible = false;
    point.x = 33;
    point.y = 54;
    point.minY = 100;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 33);
    assert.equal(topLabelGraphicBBox.y, 54);
    assert.equal(topLabelGraphicBBox.width, 0);
    assert.equal(topLabelGraphicBBox.height, 0);

    assert.equal(bottomLabelGraphicBBox.x, 33);
    assert.equal(bottomLabelGraphicBBox.y, 100);
    assert.equal(bottomLabelGraphicBBox.width, 0);
    assert.equal(bottomLabelGraphicBBox.height, 0);
});

QUnit.test("Get graphic bbox. Rotated. Not image", function(assert) {
    this.options.styles.normal.r = 5;
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point.x = 33;
    point.y = 54;
    point.minX = 20;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 28);
    assert.equal(topLabelGraphicBBox.y, 49);
    assert.equal(topLabelGraphicBBox.width, 10);
    assert.equal(topLabelGraphicBBox.height, 10);

    assert.equal(bottomLabelGraphicBBox.x, 15);
    assert.equal(bottomLabelGraphicBBox.y, 49);
    assert.equal(bottomLabelGraphicBBox.width, 10);
    assert.equal(bottomLabelGraphicBBox.height, 10);
});

QUnit.test("Get graphic bbox. Rotated. Not image. Point is invisible", function(assert) {
    this.options.styles.normal.r = 5;
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point._options.visible = false;
    point.x = 33;
    point.y = 54;
    point.minX = 20;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 33);
    assert.equal(topLabelGraphicBBox.y, 54);
    assert.equal(topLabelGraphicBBox.width, 0);
    assert.equal(topLabelGraphicBBox.height, 0);

    assert.equal(bottomLabelGraphicBBox.x, 20);
    assert.equal(bottomLabelGraphicBBox.y, 54);
    assert.equal(bottomLabelGraphicBBox.width, 0);
    assert.equal(bottomLabelGraphicBBox.height, 0);
});

QUnit.test("Get graphic bbox. Not rotated. Image", function(assert) {
    this.options.styles.normal.r = 5;
    this.options.image = "test";
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point.x = 33;
    point.y = 54;
    point.minY = 100;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 23);
    assert.equal(topLabelGraphicBBox.y, 44);
    assert.equal(topLabelGraphicBBox.width, 20);
    assert.equal(topLabelGraphicBBox.height, 20);

    assert.equal(bottomLabelGraphicBBox.x, 23);
    assert.equal(bottomLabelGraphicBBox.y, 90);
    assert.equal(bottomLabelGraphicBBox.width, 20);
    assert.equal(bottomLabelGraphicBBox.height, 20);
});

QUnit.test("Get graphic bbox. Rotated. Image", function(assert) {
    this.options.styles.normal.r = 5;
    this.options.image = "test";
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point.x = 33;
    point.y = 54;
    point.minX = 20;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 23);
    assert.equal(topLabelGraphicBBox.y, 44);
    assert.equal(topLabelGraphicBBox.width, 20);
    assert.equal(topLabelGraphicBBox.height, 20);

    assert.equal(bottomLabelGraphicBBox.x, 10);
    assert.equal(bottomLabelGraphicBBox.y, 44);
    assert.equal(bottomLabelGraphicBBox.width, 20);
    assert.equal(bottomLabelGraphicBBox.height, 20);
});

QUnit.test("Get graphic bbox. Not rotated. Image. Point is invisible", function(assert) {
    this.options.styles.normal.r = 5;
    this.options.image = "test";
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point._options.visible = false;
    point.x = 33;
    point.y = 54;
    point.minY = 100;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 33);
    assert.equal(topLabelGraphicBBox.y, 54);
    assert.equal(topLabelGraphicBBox.width, 0);
    assert.equal(topLabelGraphicBBox.height, 0);

    assert.equal(bottomLabelGraphicBBox.x, 33);
    assert.equal(bottomLabelGraphicBBox.y, 100);
    assert.equal(bottomLabelGraphicBBox.width, 0);
    assert.equal(bottomLabelGraphicBBox.height, 0);
});

QUnit.test("Get graphic bbox. Rotated. Image. Point is invisible", function(assert) {
    this.options.styles.normal.r = 5;
    this.options.image = "test";
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options),
        bottomLabelGraphicBBox,
        topLabelGraphicBBox;

    point.translators = this.translators;
    point._options.visible = false;
    point.x = 33;
    point.y = 54;
    point.minX = 20;

    topLabelGraphicBBox = point._getGraphicBBox("top");
    bottomLabelGraphicBBox = point._getGraphicBBox("bottom");

    assert.equal(topLabelGraphicBBox.x, 33);
    assert.equal(topLabelGraphicBBox.y, 54);
    assert.equal(topLabelGraphicBBox.width, 0);
    assert.equal(topLabelGraphicBBox.height, 0);

    assert.equal(bottomLabelGraphicBBox.x, 20);
    assert.equal(bottomLabelGraphicBBox.y, 54);
    assert.equal(bottomLabelGraphicBBox.width, 0);
    assert.equal(bottomLabelGraphicBBox.height, 0);
});

QUnit.test("Point with radius", function(assert) {
    this.options.styles.normal.r = 8;
    this.options.symbol = "circle";
    var l = createCorrectionLabels.call(this, "top", "bottom", 33, 54, 100);

    assert.ok(l.topLabel.setFigureToDrawConnector.calledOnce);
    assert.deepEqual(l.topLabel.setFigureToDrawConnector.firstCall.args[0], { x: 33, y: 54, r: 8 });
    assert.ok(l.topLabel.setFigureToDrawConnector.calledBefore(l.topLabel.shift));

    assert.ok(l.topLabel.shift.calledOnce);
    assert.equal(l.topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 54 - 10 - 10 - 8);

    assert.ok(l.bottomLabel.setFigureToDrawConnector.calledOnce);
    assert.deepEqual(l.bottomLabel.setFigureToDrawConnector.firstCall.args[0], { x: 33, y: 100, r: 8 });
    assert.ok(l.bottomLabel.setFigureToDrawConnector.calledBefore(l.bottomLabel.shift));

    assert.ok(l.bottomLabel.shift.calledOnce);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 100 + 8 + 10);
});

QUnit.test("Min point with image", function(assert) {
    this.options.image = { url: { rangeMinPoint: "test" } };
    var l = createCorrectionLabels.call(this, "top", "bottom", 33, 54, 100);

    assert.equal(l.topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 54 - 10 - 10);

    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 100 + 10 + 10);
});

QUnit.test("Max point with image", function(assert) {
    this.options.image = { url: { rangeMaxPoint: "test" } };
    var l = createCorrectionLabels.call(this, "top", "bottom", 33, 54, 100);

    assert.equal(l.topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 54 - 10 - 20);

    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 100 + 10);
});

QUnit.test("Default, not rotated", function(assert) {
    var l = createCorrectionLabels.call(this, "top", "bottom", 33, 54, 100);

    assert.equal(l.topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 54 - 10 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 100 + 10);
});

QUnit.test("Default, rotated", function(assert) {
    this.options.rotated = true;
    var l = createCorrectionLabels.call(this, "top", "bottom", 53, 12, null, 35);

    assert.equal(l.topLabel.shift.firstCall.args[0], 53 + 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 7);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 35 - 20 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 7);
});

QUnit.test("Value < minValue", function(assert) {
    var l = createCorrectionLabels.call(this, "bottom", "top", 33, 54, 35);

    assert.equal(l.topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 64);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 15);
});

QUnit.test("Default, inside, not rotated", function(assert) {
    this.options.label.position = "inside";
    var l = createCorrectionLabels.call(this, "top", "bottom", 33, 54, 100);

    assert.equal(l.topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 54 + 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 100 - 20);
});

QUnit.test("Default, inside, rotated", function(assert) {
    this.options.label.position = "inside";
    this.options.rotated = true;
    var l = createCorrectionLabels.call(this, "top", "bottom", 77, 12, null, 10);

    assert.equal(l.topLabel.shift.firstCall.args[0], 77 - 10 - 20);
    assert.equal(l.topLabel.shift.firstCall.args[1], 12 - 5);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 10 + 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 12 - 5);
});

QUnit.test("Value < minValue, inside, rotated", function(assert) {
    this.options.label.position = "inside";
    this.options.rotated = true;
    var l = createCorrectionLabels.call(this, "bottom", "top", 53, 12, null, 130);

    assert.equal(l.topLabel.shift.firstCall.args[0], 53 + 10);
    assert.equal(l.topLabel.shift.firstCall.args[1], 12 - 5);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 130 - 10 - 20);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 12 - 5);
});

QUnit.test("Default, inside, not rotated. Overlay corrections", function(assert) {
    this.options.label.position = "inside";
    var point = createPoint(this.series, this.data, this.options),
        topLabel = point._topLabel,
        bottomLabel = point._bottomLabel;

    topLabel.getBoundingRect.returns({ width: 20, height: 10, x: 23, y: 64 });
    bottomLabel.getBoundingRect.returns({ width: 20, height: 10, x: 23, y: 34 });

    point.translators = this.translators;
    point.x = 33;
    point.y = 54;
    point.minY = 55;

    point._drawLabel(this.renderer, this.group);

    assert.ok(topLabel.shift.calledOnce);
    assert.ok(bottomLabel.shift.calledOnce);

    assert.equal(topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(topLabel.shift.firstCall.args[1], 44);
    assert.equal(bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(bottomLabel.shift.firstCall.args[1], 54);
});

QUnit.test("Default, inside, rotated. Overlay corrections", function(assert) {
    this.options.label.position = "inside";
    this.options.rotated = true;
    var point = createPoint(this.series, this.data, this.options),
        topLabel = point._topLabel,
        bottomLabel = point._bottomLabel;

    point.translators = this.translators;
    point.x = 77;
    point.y = 12;
    point.minX = 65;

    topLabel.getBoundingRect.returns({ width: 20, height: 10, x: 47, y: 7 });
    bottomLabel.getBoundingRect.returns({ width: 20, height: 10, x: 75, y: 7 });

    point._drawLabel(this.renderer, this.group);

    assert.ok(topLabel.shift.calledOnce);
    assert.ok(bottomLabel.shift.calledOnce);

    assert.equal(topLabel.shift.firstCall.args[0], 71);
    assert.equal(topLabel.shift.firstCall.args[1], 12 - 5);
    assert.equal(bottomLabel.shift.firstCall.args[0], 51);
    assert.equal(bottomLabel.shift.firstCall.args[1], 12 - 5);
});

QUnit.test("Value < minValue, inside. Overlay corrections", function(assert) {
    this.options.label.position = "inside";
    this.data.value = 1;
    this.data.minValue = 15;
    var point = createPoint(this.series, this.data, this.options),
        topLabel = point._topLabel,
        bottomLabel = point._bottomLabel;

    topLabel.getBoundingRect.returns({ width: 20, height: 10, x: 23, y: 34 });
    bottomLabel.getBoundingRect.returns({ width: 20, height: 10, x: 23, y: 64 });

    point.translators = this.translators;
    point.x = 33;
    point.y = 55;
    point.minY = 54;

    point._drawLabel(this.renderer, this.group);

    assert.ok(topLabel.shift.calledOnce);
    assert.ok(bottomLabel.shift.calledOnce);

    assert.equal(bottomLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(bottomLabel.shift.firstCall.args[1], 44);
    assert.equal(topLabel.shift.firstCall.args[0], 33 - 10);
    assert.equal(topLabel.shift.firstCall.args[1], 54);
});

QUnit.test("Value < minValue, inside, rotated. Overlay corrections", function(assert) {
    this.options.label.position = "inside";
    this.options.rotated = true;
    this.data.value = 1;
    this.data.minValue = 15;
    var point = createPoint(this.series, this.data, this.options),
        topLabel = point._topLabel,
        bottomLabel = point._bottomLabel;

    topLabel.getBoundingRect.returns({ width: 20, height: 10, x: 63, y: 7 });
    bottomLabel.getBoundingRect.returns({ width: 20, height: 10, x: 25, y: 7 });

    point.translators = this.translators;
    point.x = 53;
    point.y = 12;
    point.minX = 55;

    point._drawLabel(this.renderer, this.group);

    assert.ok(topLabel.shift.calledOnce);
    assert.ok(bottomLabel.shift.calledOnce);

    assert.equal(topLabel.shift.firstCall.args[0], 34);
    assert.equal(topLabel.shift.firstCall.args[1], 12 - 5);
    assert.equal(bottomLabel.shift.firstCall.args[0], 54);
    assert.equal(bottomLabel.shift.firstCall.args[1], 12 - 5);
});

QUnit.test("Default, not rotated. Left alignment", function(assert) {
    this.options.label.alignment = "left";
    var l = createCorrectionLabels.call(this, "top", "bottom", 33, 54, 100);

    assert.equal(l.topLabel.shift.firstCall.args[0], 33);
    assert.equal(l.topLabel.shift.firstCall.args[1], 54 - 10 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 100 + 10);
});

QUnit.test("Default, not rotated. Right alignment", function(assert) {
    this.options.label.alignment = "right";
    var l = createCorrectionLabels.call(this, "top", "bottom", 33, 54, 100);

    assert.equal(l.topLabel.shift.firstCall.args[0], 33 - 20);
    assert.equal(l.topLabel.shift.firstCall.args[1], 54 - 10 - 10);
    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33 - 20);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 100 + 10);
});

QUnit.module("Draw Label. Range bar", {
    beforeEach: function() {
        environment.beforeEach.apply(this, arguments);
        this.renderer.bBoxTemplate = { x: 55, y: 40, height: 10, width: 20 };
        this.translators.x = new MockTranslator({
            translate: { 1: 350, 2: 325, 3: 290, 4: 250, 5: 225, 6: 150, "canvas_position_default": 300 },
            failOnWrongData: true,
            getCanvasVisibleArea: { min: 0, max: 110 }
        });
        this.series._visibleArea = { minX: 0, maxX: 110, minY: 0, maxY: 210 };
        this.options.type = "rangebar";
        this.options.styles = { normal: { r: 0 }, hover: {} };
        this.options.label.position = "outside";
    },
    afterEach: environment.afterEach
});

//helpers
var createCorrectionBarLabels = function(bBox, x, y, width, height, pos1, pos2) {
    this.renderer.bBoxTemplate = bBox;
    var point = createPoint(this.series, this.data, this.options);

    point.translators = this.translators;
    point.x = x;
    point.y = y;
    point.width = width;
    point.height = height;

    point._topLabel.pointPosition = pos1;
    point._bottomLabel.pointPosition = pos2;
    point.correctLabelPosition(point._topLabel);
    point.correctLabelPosition(point._bottomLabel);

    return { topLabel: point._topLabel, bottomLabel: point._bottomLabel };
};

QUnit.test("Default, not rotated", function(assert) {
    var l = createCorrectionBarLabels.call(this, { x: 33, y: 54, height: 10, width: 20 }, 33, 54, 20, 10, "top", "bottom");

    assert.equal(l.topLabel.shift.firstCall.args[0], 33);
    assert.equal(l.topLabel.shift.firstCall.args[1], 34);

    assert.deepEqual(l.topLabel.setFigureToDrawConnector.firstCall.args[0], { x: 33, y: 54, width: 20, height: 0 });
    assert.ok(l.topLabel.setFigureToDrawConnector.calledBefore(l.topLabel.shift));

    assert.equal(l.bottomLabel.shift.firstCall.args[0], 33);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 74);

    assert.deepEqual(l.bottomLabel.setFigureToDrawConnector.firstCall.args[0], { x: 33, y: 64, width: 20, height: 0 });
    assert.ok(l.bottomLabel.setFigureToDrawConnector.calledBefore(l.bottomLabel.shift));
});

QUnit.test("Default, rotated", function(assert) {
    this.options.rotated = true;
    var l = createCorrectionBarLabels.call(this, { x: 53, y: 12, height: 10, width: 20 }, 53, 12, 20, 10, "top", "bottom");

    assert.equal(l.topLabel.shift.firstCall.args[0], 83);
    assert.equal(l.topLabel.shift.firstCall.args[1], 12);

    assert.deepEqual(l.topLabel.setFigureToDrawConnector.firstCall.args[0], { x: 73, y: 12, width: 0, height: 10 });
    assert.ok(l.topLabel.setFigureToDrawConnector.calledBefore(l.topLabel.shift));

    assert.equal(l.bottomLabel.shift.firstCall.args[0], 23);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 12);

    assert.deepEqual(l.bottomLabel.setFigureToDrawConnector.firstCall.args[0], { x: 53, y: 12, width: 0, height: 10 });
    assert.ok(l.bottomLabel.setFigureToDrawConnector.calledBefore(l.bottomLabel.shift));
});

QUnit.test("Default, not rotated. Null value", function(assert) {
    this.data.minValue = null;
    var l = createCorrectionBarLabels.call(this, { x: 33, y: 54, height: 10, width: 20 }, 33, 54, 20, 10, "bottom", "top");

    assert.ok(l.topLabel.hide.called);
    assert.ok(l.bottomLabel.hide.called);
});

QUnit.test("Default, inside, not rotated", function(assert) {
    this.options.label.position = "inside";
    var l = createCorrectionBarLabels.call(this, { x: 0, y: 40, height: 10, width: 20 }, 55, 40, 20, 10, "bottom", "top");

    assert.equal(l.topLabel.shift.firstCall.args[0], 55);
    assert.equal(l.topLabel.shift.firstCall.args[1], 30);

    assert.equal(l.bottomLabel.shift.firstCall.args[0], 55);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 50);
});

QUnit.test("Default, inside, rotated", function(assert) {
    this.options.label.position = "inside";
    this.options.rotated = true;
    var l = createCorrectionBarLabels.call(this, { x: 53, y: 12, height: 10, width: 20 }, 53, 12, 20, 10, "bottom", "top");

    assert.equal(l.topLabel.shift.firstCall.args[0], 63);
    assert.equal(l.topLabel.shift.firstCall.args[1], 12);

    assert.equal(l.bottomLabel.shift.firstCall.args[0], 43);
    assert.equal(l.bottomLabel.shift.firstCall.args[1], 12);
});

QUnit.module("Update label", {
    beforeEach: function() {
        environment.beforeEach.apply(this, arguments);
        this.options.label.background.fill = "red";
    },
    afterEach: environment.afterEach
});

QUnit.test("Update label options", function(assert) {
    var point = createPoint(this.series, this.data, this.options),
        newOptions = $.extend(true, {}, this.options);
    newOptions.label.background.fill = "green";
    point.x = 30;
    point.y = 150;
    point.minY = 160;
    point.translators = this.translators;

    point.updateOptions(newOptions);

    assert.ok(point._topLabel.setOptions.calledTwice);
    assert.equal(point._topLabel.setOptions.firstCall.args[0].background.fill, "red");
    assert.equal(point._topLabel.setOptions.secondCall.args[0].background.fill, "green");
    assert.ok(point._bottomLabel.setOptions.calledTwice);
    assert.equal(point._bottomLabel.setOptions.firstCall.args[0].background.fill, "red");
    assert.equal(point._bottomLabel.setOptions.secondCall.args[0].background.fill, "green");
});
