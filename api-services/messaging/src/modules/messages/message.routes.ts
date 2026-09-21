import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../common/utils/async-handler.js";
import { messageController } from "./message.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/send", asyncHandler(messageController.send));
router.get("/:conversationId", asyncHandler(messageController.list));

export const messageRoutes = router;
