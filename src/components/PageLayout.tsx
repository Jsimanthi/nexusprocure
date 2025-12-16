import { NexusChatbot } from "./NexusChatbot";
import { PageTransition } from "./PageTransition";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PageLayout({ children, title }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <Sidebar className="hidden md:flex h-screen bg-sidebar sticky top-0" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto bg-muted/20 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
            {title && (
              <div className="flex items-center justify-between pb-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
              </div>
            )}

            {/* Content Container */}
            <div className="relative">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </div>
        </main>
      </div>
      <NexusChatbot />
    </div>
  );
}