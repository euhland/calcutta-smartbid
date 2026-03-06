import { getSessionRepository } from "@/lib/repository";
import { jsonError, jsonOk } from "@/lib/http";

interface RouteProps {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { sessionId } = await params;
    const dashboard = await getSessionRepository().getDashboard(sessionId);
    return jsonOk(dashboard);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load dashboard.", 404);
  }
}
