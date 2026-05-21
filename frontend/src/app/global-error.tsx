"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app runtime error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F2] p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-border" style={{
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500 text-3xl mb-6">
            🚨
          </div>
          
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            System Error
          </h2>
          
          <p className="text-sm text-gray-500 mb-6 font-medium">
            A critical system error occurred. Please try reloading the workspace application.
          </p>

          {error.message && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3.5 mb-6 text-[12px] font-mono text-red-600 text-left overflow-x-auto max-h-[120px]">
              {error.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 py-3 px-4 rounded-xl text-[14px] font-bold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #2F7D5C, #245F46)',
                boxShadow: '0 4px 12px rgba(47,125,92,0.2)',
              }}
            >
              🔄 Try again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 px-4 rounded-xl text-[14px] font-bold border border-border text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              🏠 Reload page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
