import { onRequestPost as __api_auth_check_email_ts_onRequestPost } from "D:\\ProjectAI\\Idea_to_gold\\idea-to-gold\\functions\\api\\auth\\check-email.ts"
import { onRequestPost as __api_auth_check_phone_ts_onRequestPost } from "D:\\ProjectAI\\Idea_to_gold\\idea-to-gold\\functions\\api\\auth\\check-phone.ts"
import { onRequestPost as __api_auth_login_ts_onRequestPost } from "D:\\ProjectAI\\Idea_to_gold\\idea-to-gold\\functions\\api\\auth\\login.ts"
import { onRequestPost as __api_auth_signup_ts_onRequestPost } from "D:\\ProjectAI\\Idea_to_gold\\idea-to-gold\\functions\\api\\auth\\signup.ts"
import { onRequestGet as __api_creatives__id__index_ts_onRequestGet } from "D:\\ProjectAI\\Idea_to_gold\\idea-to-gold\\functions\\api\\creatives\\[id]\\index.ts"
import { onRequestGet as __api_creatives_index_ts_onRequestGet } from "D:\\ProjectAI\\Idea_to_gold\\idea-to-gold\\functions\\api\\creatives\\index.ts"
import { onRequestPost as __api_creatives_index_ts_onRequestPost } from "D:\\ProjectAI\\Idea_to_gold\\idea-to-gold\\functions\\api\\creatives\\index.ts"

export const routes = [
    {
      routePath: "/api/auth/check-email",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_check_email_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/check-phone",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_check_phone_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/signup",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_signup_ts_onRequestPost],
    },
  {
      routePath: "/api/creatives/:id",
      mountPath: "/api/creatives/:id",
      method: "GET",
      middlewares: [],
      modules: [__api_creatives__id__index_ts_onRequestGet],
    },
  {
      routePath: "/api/creatives",
      mountPath: "/api/creatives",
      method: "GET",
      middlewares: [],
      modules: [__api_creatives_index_ts_onRequestGet],
    },
  {
      routePath: "/api/creatives",
      mountPath: "/api/creatives",
      method: "POST",
      middlewares: [],
      modules: [__api_creatives_index_ts_onRequestPost],
    },
  ]