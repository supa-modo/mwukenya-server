"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MedicalSchemeController_1 = require("../controllers/MedicalSchemeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const medicalSchemeController = new MedicalSchemeController_1.MedicalSchemeController();
router.get("/", medicalSchemeController.getAllSchemes);
router.get("/active", medicalSchemeController.getActiveSchemes);
router.get("/:id", medicalSchemeController.getSchemeById);
router.post("/", auth_1.authenticate, auth_1.requireAdmin, medicalSchemeController.createScheme);
router.put("/:id", auth_1.authenticate, auth_1.requireAdmin, medicalSchemeController.updateScheme);
router.delete("/:id", auth_1.authenticate, auth_1.requireAdmin, medicalSchemeController.deleteScheme);
router.get("/:id/subscribers", auth_1.authenticate, auth_1.requireAdmin, medicalSchemeController.getSchemeSubscribers);
exports.default = router;
//# sourceMappingURL=medicalSchemes.js.map