import { buildPlatformAdminErrorResponse } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSessionRepository } from "@/lib/repository";

export async function GET() {
  try {
    const authError = await buildPlatformAdminErrorResponse();
    if (authError) {
      return authError;
    }

    return jsonOk(await getSessionRepository().getAdminCenterData());
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load admin center."
    );
  }
}
