import { AppHeader } from "@/components/layout/AppHeader";
import { LoadingMessage } from "@/components/LoadingMessage";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <LoadingMessage />
      </main>
    </div>
  );
}
