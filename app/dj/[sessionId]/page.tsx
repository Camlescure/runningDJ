import { notFound } from "next/navigation";

import { getDjSession } from "@/lib/db";

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
    <main className="min-h-screen bg-[#07140f] px-6 py-8 text-[#f4f8f4]">
      <div className="mx-auto max-w-2xl">
        <header className="pt-8">
          <p className="font-bold tracking-[.18em] text-[#1ed760]">
            RUN<span className="text-white">DJ</span>
          </p>

          <h1 className="mt-4 text-4xl font-black">
            You&apos;re the DJ 🎧
          </h1>

          <p className="mt-3 text-[#b6c7bb]">
            Your friend is running. You&apos;ll soon be able to
            choose the music they listen to.
          </p>
        </header>

        <section className="mt-10 rounded-3xl bg-white/5 p-6">
          <p className="text-xs font-bold tracking-widest text-[#8da393]">
            SESSION ACTIVE
          </p>

          <p className="mt-4 text-lg font-bold">
            The runner is ready.
          </p>

          <p className="mt-2 text-sm text-[#b6c7bb]">
            Music controls will appear here in the next step.
          </p>
        </section>
      </div>
    </main>
  );
}