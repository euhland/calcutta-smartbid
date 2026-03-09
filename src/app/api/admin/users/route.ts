import { buildPlatformAdminErrorResponse } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSessionRepository } from "@/lib/repository";
import { createPlatformUserSchema } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const authError = await buildPlatformAdminErrorResponse();
    if (authError) {
      return authError;
    }

    const payload = createPlatformUserSchema.parse(await request.json());
    const user = await getSessionRepository().createPlatformUser(payload);
    return jsonOk(user, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create user.");
  }
}
