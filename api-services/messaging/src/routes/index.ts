import { Router } from "express";
import { conversationRoutes } from "../modules/conversations/conversation.routes.js";
import { messageRoutes } from "../modules/messages/message.routes.js";

export const apiRouter = Router();

apiRouter.use("/conversations", conversationRoutes);
apiRouter.use("/messages", messageRoutes);
