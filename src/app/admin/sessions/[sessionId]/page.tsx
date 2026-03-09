import Link from "next/link";
import { SessionAdminCenter } from "@/components/session-admin-center";
import { requirePlatformAdminPage } from "@/lib/auth";
import { getSessionRepository } from "@/lib/repository";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionAdminPage({ params }: PageProps) {
  await requirePlatformAdminPage();
  const { sessionId } = await params;
  const config = await getSessionRepository().getSessionAdminConfig(sessionId);

  return (
    <main className="landing-page">
      <div className="panel-actions" style={{ marginBottom: "1rem" }}>
        <Link href="/admin" className="action-link">
          Back to admin center
        </Link>
        <Link href={`/session/${sessionId}`} className="action-link">
          Open live board
        </Link>
      </div>
      <SessionAdminCenter initialConfig={config} />
    </main>
  );
}
