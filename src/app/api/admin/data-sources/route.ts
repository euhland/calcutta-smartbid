import { buildPlatformAdminErrorResponse } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSessionRepository } from "@/lib/repository";
import { createDataSourceSchema } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const authError = await buildPlatformAdminErrorResponse();
    if (authError) {
      return authError;
    }

    const payload = createDataSourceSchema.parse(await request.json());
    const source = await getSessionRepository().createDataSource(payload);
    return jsonOk(source, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create data source.");
  }
}
