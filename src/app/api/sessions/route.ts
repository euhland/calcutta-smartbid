import { getSessionRepository } from "@/lib/repository";
import { jsonError, jsonOk } from "@/lib/http";
import { createSessionSchema } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = createSessionSchema.parse(await request.json());
    const repository = getSessionRepository();
    const session = await repository.createSession(payload);
    return jsonOk(
      {
        sessionId: session.id
      },
      201
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create session.");
  }
}
