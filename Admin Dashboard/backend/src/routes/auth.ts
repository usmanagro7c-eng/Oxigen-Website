import { Router, type IRouter } from "express";
import { authController } from "../controllers/auth.controller.js";
import { createRateLimiter } from "../middlewares/rate-limit.js";
import { validate, signupSchema, loginSchema, setPasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../lib/validation.js";

const router: IRouter = Router();
const signupLimiter = createRateLimiter("signup");
const loginLimiter = createRateLimiter("login");
const setPasswordLimiter = createRateLimiter("setPassword");
const forgotPasswordLimiter = createRateLimiter("forgotPassword");
const resetPasswordLimiter = createRateLimiter("resetPassword");

router.post("/auth/signup", signupLimiter, validate(signupSchema), authController.signup);
router.post("/auth/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", authController.me);

router.post("/auth/set-password", setPasswordLimiter, validate(setPasswordSchema), authController.setPassword);
router.post("/auth/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/auth/reset-password", resetPasswordLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;
