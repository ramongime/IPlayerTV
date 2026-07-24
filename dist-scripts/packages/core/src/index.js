"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resources = exports.TmdbClient = exports.XtreamProvider = exports.decodeBase64 = void 0;
// Domain types and validation schemas
__exportStar(require("./domain"), exports);
__exportStar(require("./domain/schemas"), exports);
// Utilities
__exportStar(require("./utils/parseM3uUrl"), exports);
var base64_1 = require("./utils/base64");
Object.defineProperty(exports, "decodeBase64", { enumerable: true, get: function () { return base64_1.decodeBase64; } });
// Providers (platform-agnostic; inject platform specifics via constructor)
var XtreamProvider_1 = require("./providers/XtreamProvider");
Object.defineProperty(exports, "XtreamProvider", { enumerable: true, get: function () { return XtreamProvider_1.XtreamProvider; } });
var TmdbClient_1 = require("./providers/TmdbClient");
Object.defineProperty(exports, "TmdbClient", { enumerable: true, get: function () { return TmdbClient_1.TmdbClient; } });
// Shared i18n resources
var resources_1 = require("./i18n/resources");
Object.defineProperty(exports, "resources", { enumerable: true, get: function () { return resources_1.resources; } });
