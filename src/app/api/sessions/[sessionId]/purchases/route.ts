import { getSessionRepository } from "@/lib/repository";
import { jsonError, jsonOk } from "@/lib/http";
import { createPurchaseSchema } from "@/lib/types";

interface RouteProps {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { sessionId } = await params;
    const payload = createPurchaseSchema.parse(await request.json());
    const dashboard = await getSessionRepository().recordPurchase(sessionId, payload);
    return jsonOk(dashboard, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to record purchase.");
  }
}
