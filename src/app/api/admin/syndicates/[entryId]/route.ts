import { buildPlatformAdminErrorResponse } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSessionRepository } from "@/lib/repository";
import { updateSyndicateCatalogSchema } from "@/lib/types";

interface RouteProps {
  params: Promise<{ entryId: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const authError = await buildPlatformAdminErrorResponse();
    if (authError) {
      return authError;
    }

    const { entryId } = await params;
    const payload = updateSyndicateCatalogSchema.parse(await request.json());
    const entry = await getSessionRepository().updateSyndicateCatalogEntry(entryId, payload);
    return jsonOk(entry);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update syndicate.");
  }
}
