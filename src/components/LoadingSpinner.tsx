export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" data-testid="loading-spinner">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
