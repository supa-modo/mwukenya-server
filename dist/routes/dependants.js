"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DependantController_1 = require("../controllers/DependantController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post("/", DependantController_1.DependantController.createDependant);
router.get("/", DependantController_1.DependantController.getUserDependants);
router.get("/stats", DependantController_1.DependantController.getDependantStats);
router.get("/:dependantId", DependantController_1.DependantController.getDependantById);
router.put("/:dependantId", DependantController_1.DependantController.updateDependant);
router.delete("/:dependantId", DependantController_1.DependantController.deleteDependant);
router.get("/admin/pending-verification", DependantController_1.DependantController.getPendingVerificationDependants);
router.post("/admin/:dependantId/verify", DependantController_1.DependantController.verifyDependant);
exports.default = router;
//# sourceMappingURL=dependants.js.map