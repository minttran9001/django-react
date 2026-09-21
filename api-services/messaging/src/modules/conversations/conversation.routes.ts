import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { conversationController } from "./conversation.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(conversationController.list));
router.get("/dm", asyncHandler(conversationController.getDirect));
router.post(
  "/:conversationId/seen",
  asyncHandler(conversationController.markSeen),
);

export const conversationRoutes = router;
