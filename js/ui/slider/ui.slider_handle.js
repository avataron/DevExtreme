"use strict";

var $ = require("../../core/renderer"),
    Widget = require("../widget/ui.widget"),
    Tooltip = require("../tooltip"),
    translator = require("../../animation/translator"),
    positionUtils = require("../../animation/position"),
    mathUtils = require("../../core/utils/math"),
    commonUtils = require("../../core/utils/common"),
    extend = require("../../core/utils/extend").extend,
    numberLocalization = require("../../localization/number");

var SLIDER_CLASS = "dx-slider",
    SLIDER_HANDLE_CLASS = "dx-slider-handle";

var POSITION_ALIASES = {
    "top": { my: "bottom center", at: "top center", collision: "none" },
    "bottom": { my: "top center", at: "bottom center", collision: "none" },
    "right": { my: "left center", at: "right center", collision: "none" },
    "left": { my: "right center", at: "left center", collision: "none" }
};

var SliderHandle = Widget.inherit({
    _getDefaultOptions: function() {
        return extend(this.callBase(), {
            hoverStateEnabled: false,
            value: 0,
            tooltipEnabled: false,
            tooltipFormat: function(v) { return v; },
            tooltipPosition: "top",
            tooltipShowMode: "onHover",
            tooltipFitIn: null
        });
    },

    _render: function() {
        this.callBase();
        this.element().addClass(SLIDER_HANDLE_CLASS);
        this._renderTooltip();

        this.setAria({
            "role": "slider",
            "valuenow": this.option("value")
        });
    },

    _renderTooltip: function() {
        if(this.option("tooltipEnabled")) {
            if(!this._$tooltip) {
                this._$tooltip = $("<div>").appendTo(this.element());
            }
            this._$slider = this.element().closest("." + SLIDER_CLASS);

            this._updateTooltip();
        } else {
            this._removeTooltip();
        }
    },

    _createTooltip: function() {
        if(this._tooltip) {
            return false;
        }

        this._tooltip = this._createComponent(this._$tooltip, Tooltip, {
            visible: true,
            target: this.element(),
            closeOnOutsideClick: false,
            container: this.element(),
            closeOnBackButton: false,
            closeOnTargetScroll: false,
            onPositioned: (function(args) {
                this._saveTooltipElements(args.component);
                this._saveTooltipLocation();
                this._centeredTooltipPosition();
            }).bind(this),
            animation: null,
            arrowPosition: null,
            templatesRenderAsynchronously: false
        });

        return true;
    },

    _removeTooltip: function() {
        if(!this._$tooltip) {
            return;
        }

        this._$tooltip.remove();
        delete this._$tooltip;
        delete this._tooltip;
    },

    _renderTooltipPosition: function() {
        if(!this._tooltip) {
            return;
        }

        var position = this.option("tooltipPosition");

        this._saveTooltipElements();
        this._resetTooltipPosition();

        if(commonUtils.type(position) === "string") {
            position = extend({
                boundary: this._$slider,
                boundaryOffset: { h: 1, v: 1 }
            }, POSITION_ALIASES[position]);
        }

        this._tooltip.option("position", position);

        this._saveTooltipLocation();
    },

    _saveTooltipElements: function(tooltip) {
        tooltip = this._tooltip || tooltip;
        this._$tooltipContent = tooltip.content().parent();
        this._$tooltipArrow = this._$tooltipContent.find(".dx-popover-arrow");
    },

    _resetTooltipPosition: function() {
        translator.resetPosition(this._$tooltipContent);
        translator.resetPosition(this._$tooltipArrow);
    },

    _saveTooltipLocation: function() {
        this._contentLocate = translator.locate(this._$tooltipContent);
    },

    _centeredTooltipPosition: function() {
        if(!this._tooltip) {
            return;
        }

        this._$tooltipContent.outerWidth("auto");

        var outerWidthWithoutRounding = this._$tooltipContent.get(0).getBoundingClientRect().width;
        var tooltipOuterWidth = Math.ceil(outerWidthWithoutRounding);
        var roundedTooltipOuterWidth = tooltipOuterWidth % 2 + tooltipOuterWidth;

        this._$tooltipContent
            .outerWidth(roundedTooltipOuterWidth);

        var tooltipCenter = (roundedTooltipOuterWidth - this.element().width()) / 2;

        this._contentLocate.left = -tooltipCenter;
        this._$tooltipArrow.css({
            marginLeft: -this._$tooltipArrow.outerWidth() / 2,
            left: "50%"
        });

        this._fitTooltip();
    },

    _fitTooltip: function() {
        if(!this._tooltip) {
            return;
        }

        var position = this.option("tooltipPosition");

        if(commonUtils.type(position) === "string") {
            position = extend({
                of: this.element(),
                boundary: this._$slider,
                boundaryOffset: { h: 2, v: 1 }
            }, POSITION_ALIASES[position], { collision: 'fit none' });
        }

        var calculatePosition = positionUtils.calculate(this._$tooltipContent, position);
        var isLeftSide = calculatePosition.h.collisionSide === "left";

        var arrowLeft = (isLeftSide ? -1 : 1) * calculatePosition.h.oversize,
            arrowMinLeft = this._contentLocate.left,
            arrowMaxRight = this._contentLocate.left + this._$tooltipContent.outerWidth() - this._$tooltipArrow.outerWidth();

        translator.move(this._$tooltipContent, { left: this._contentLocate.left + (isLeftSide ? 1 : -1) * calculatePosition.h.oversize });
        translator.move(this._$tooltipArrow, { left: mathUtils.fitIntoRange(arrowLeft, arrowMinLeft, arrowMaxRight) });
    },

    _renderValue: function() {
        if(!this._tooltip) {
            return;
        }

        var formattedValue = numberLocalization.format(this.option("value"), this.option("tooltipFormat"));

        this._tooltip.content().html(formattedValue);
        this._fitTooltip();
    },

    _updateTooltip: function() {
        var hoverMode = /^onhover$/i.test(this.option("tooltipShowMode"));
        if(!hoverMode) {
            this._createTooltip();
        }
        this.element().toggleClass("dx-slider-tooltip-on-hover", hoverMode);

        this._renderTooltipPosition();
        this._renderValue();
        this._centeredTooltipPosition();
    },

    _clean: function() {
        this.callBase();
        delete this._$tooltip;
        delete this._tooltip;
    },

    _ensureTooltipIsCentered: function(value, previousValue) {
        if(commonUtils.isDefined(value) && commonUtils.isDefined(previousValue) && value.toString().length !== previousValue.toString().length) {
            this._centeredTooltipPosition();
        }
    },

    _optionChanged: function(args) {
        switch(args.name) {
            case "tooltipFormat":
                this._renderValue();
                break;
            case "value":
                this._renderValue();

                this._ensureTooltipIsCentered(args.value, args.previousValue);

                this.setAria("valuenow", args.value);
                break;
            case "tooltipEnabled":
                this._renderTooltip();
                break;
            case "tooltipPosition":
                this._renderTooltipPosition();
                this._centeredTooltipPosition();
                break;
            case "tooltipShowMode":
                this._updateTooltip();
                break;
            case "tooltipFitIn":
                this._fitTooltip();
                break;
            default:
                this.callBase(args);
        }
    },

    fitTooltipPosition: function() {
        this._fitTooltip();
    },

    updateTooltip: function() {
        if(!this._createTooltip()) {
            return;
        }

        this._renderTooltipPosition();
        this._renderValue();
        this._centeredTooltipPosition();
    },

    repaint: function() {
        this._renderTooltipPosition();
        this._centeredTooltipPosition();

        if(this._tooltip) {
            this._tooltip._visibilityChanged(true);
        }
    }
});

module.exports = SliderHandle;
