import { buildPlatformAdminErrorResponse } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSessionRepository } from "@/lib/repository";
import { updateDataSourceSchema } from "@/lib/types";

interface RouteProps {
  params: Promise<{ sourceId: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const authError = await buildPlatformAdminErrorResponse();
    if (authError) {
      return authError;
    }

    const { sourceId } = await params;
    const payload = updateDataSourceSchema.parse(await request.json());
    const source = await getSessionRepository().updateDataSource(sourceId, payload);
    return jsonOk(source);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update data source.");
  }
}
