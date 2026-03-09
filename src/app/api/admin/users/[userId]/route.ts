import { buildPlatformAdminErrorResponse } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSessionRepository } from "@/lib/repository";
import { updatePlatformUserSchema } from "@/lib/types";

interface RouteProps {
  params: Promise<{ userId: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const authError = await buildPlatformAdminErrorResponse();
    if (authError) {
      return authError;
    }

    const { userId } = await params;
    const payload = updatePlatformUserSchema.parse(await request.json());
    const user = await getSessionRepository().updatePlatformUser(userId, payload);
    return jsonOk(user);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update user.");
  }
}
