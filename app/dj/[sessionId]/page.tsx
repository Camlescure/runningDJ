import { notFound } from "next/navigation";

import { getDjSession } from "@/lib/db";
import { DjInterface } from "@/components/dj-interface";

type DjPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function DjPage({
  params,
}: DjPageProps) {
  const { sessionId } = await params;

  const session = getDjSession(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#07140f] px-5 py-6 text-[#f4f8f4]">
      <div className="mx-auto max-w-2xl">
        <header className="pt-6">
          <p className="font-bold tracking-[.18em] text-[#1ed760]">
            RUN<span className="text-white">DJ</span>
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight">
            You&apos;re the DJ 🎧
          </h1>

          <p className="mt-3 text-[#b6c7bb]">
            Your friend is running. You choose
            what they hear.
          </p>
        </header>

        <DjInterface sessionId={sessionId} />
      </div>
    </main>
  );
}