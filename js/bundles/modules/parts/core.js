"use strict";

/// BUNDLER_PARTS

/* Core (dx.module-core.js) */

var DevExpress = require("../../../bundles/modules/core");

/* Framework (dx.module-framework.js) */

DevExpress.framework = require("../../../bundles/modules/framework");

/* Integrations (dx.module-core.js) */

require("../../../integration/angular");
require("../../../integration/knockout");

require("../../../localization/globalize/core");
require("../../../localization/globalize/message");
require("../../../localization/globalize/number");
require("../../../localization/globalize/date");
require("../../../localization/globalize/currency");

/* Events (dx.module-core.js) */

require("../../../events/click");
require("../../../events/contextmenu");
require("../../../events/double_click");
require("../../../events/drag");
require("../../../events/hold");
require("../../../events/hover");
require("../../../events/pointer");
require("../../../events/swipe");
require("../../../events/transform");
/// BUNDLER_PARTS_END

module.exports = DevExpress;
