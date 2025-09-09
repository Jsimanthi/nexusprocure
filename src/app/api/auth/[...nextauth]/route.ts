// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth-server";
export const { GET, POST } = handlers;