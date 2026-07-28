import { SessionAppHeader } from "@/components/layout/SessionAppHeader";
import { LoadingMessage } from "@/components/LoadingMessage";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SessionAppHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <LoadingMessage />
      </main>
    </div>
  );
}
