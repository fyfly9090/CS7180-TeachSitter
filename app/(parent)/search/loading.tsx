export default function SearchLoading() {
  return (
    <div className="pt-24 pb-32 px-4 max-w-5xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-12 space-y-3 animate-pulse">
        <div className="h-14 bg-surface-container rounded-xl w-2/3" />
        <div className="h-5 bg-surface-container rounded-lg w-1/2" />
      </div>

      {/* Filter bar skeleton */}
      <div className="bg-surface-container-low rounded-xl p-4 md:p-6 mb-12 grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-surface-container rounded-xl" />
        ))}
      </div>

      {/* Card skeletons */}
      <div className="space-y-12 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col md:flex-row bg-surface-container-lowest rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(28,28,25,0.06)" }}
          >
            <div className="md:w-72 h-64 md:min-h-[20rem] bg-surface-container flex-shrink-0" />
            <div className="flex-1 p-6 md:p-8 space-y-4">
              <div className="h-8 bg-surface-container rounded-lg w-1/2" />
              <div className="h-4 bg-surface-container rounded-lg w-1/3" />
              <div className="h-20 bg-surface-container rounded-xl w-full" />
              <div className="flex gap-4 mt-auto pt-4">
                <div className="h-11 bg-surface-container rounded-xl flex-1" />
                <div className="h-11 bg-surface-container rounded-xl w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
