import DashboardHeader from "./DashboardHeader";

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function PageLayout({ children, title }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 py-4">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}