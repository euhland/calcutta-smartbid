import { requireAuthenticatedMemberForSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSessionRepository } from "@/lib/repository";
import { saveCsvAnalysisPortfolioSchema } from "@/lib/types";

interface RouteProps {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { sessionId } = await params;
    const auth = await requireAuthenticatedMemberForSession(sessionId, "viewer");
    if (!auth.memberId) {
      return jsonError("Session access requires a member identity.", 401);
    }

    const portfolio = await getSessionRepository().getCsvAnalysisPortfolio(
      sessionId,
      auth.memberId
    );
    return jsonOk(portfolio);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load CSV analysis portfolio.";
    const status =
      message === "You do not have permission to perform this action." ? 403 : 401;
    return jsonError(message, status);
  }
}

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const { sessionId } = await params;
    const auth = await requireAuthenticatedMemberForSession(sessionId, "viewer");
    if (!auth.memberId) {
      return jsonError("Session access requires a member identity.", 401);
    }

    const payload = saveCsvAnalysisPortfolioSchema.parse(await request.json());
    const portfolio = await getSessionRepository().saveCsvAnalysisPortfolio(
      sessionId,
      auth.memberId,
      payload.entries
    );
    return jsonOk(portfolio);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save CSV analysis portfolio.";
    const status =
      message === "You do not have permission to perform this action." ? 403 : 400;
    return jsonError(message, status);
  }
}
