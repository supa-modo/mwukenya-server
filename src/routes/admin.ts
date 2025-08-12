import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// TODO: Add admin middleware to check if user has admin privileges
// router.use(isAdmin);

// User management routes
router.get("/users", AdminController.getAllUsers);
router.get("/users/stats", AdminController.getUserStats);
router.post("/users", AdminController.createUser);
router.put("/users/:id", AdminController.updateUser);
router.delete("/users/:id", AdminController.deleteUser);

export default router;
