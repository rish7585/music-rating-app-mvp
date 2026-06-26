import type { SubscriptionPlan } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionPlan?: SubscriptionPlan;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    subscriptionPlan?: SubscriptionPlan;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    subscriptionPlan?: SubscriptionPlan;
  }
}
