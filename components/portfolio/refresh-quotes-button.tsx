"use client";

/**
 * Refresh Quotes button component.
 *
 * Client component that triggers live quote refresh for portfolio holdings.
 * Shows loading state during fetch and displays stale/error indicators.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshQuotes } from "@/lib/actions/quotes";

export interface RefreshQuotesButtonProps {
  symbols: string[];
}

export function RefreshQuotesButton({ symbols }: RefreshQuotesButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    if (symbols.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await refreshQuotes(symbols);
      if (result.success) {
        if (result.data.errors.length > 0) {
          setError(`${result.data.errors.length} symbol(s) failed to refresh`);
        }
        // Refresh the server component to re-render with new data
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(`Refresh failed: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2" data-testid="refresh-quotes">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={loading || symbols.length === 0}
        data-testid="refresh-quotes-button"
      >
        {loading ? "Refreshing…" : "Refresh Quotes"}
      </Button>
      {error && (
        <span
          className="text-sm text-amber-600"
          data-testid="refresh-quotes-error"
        >
          ⚠ {error}
        </span>
      )}
    </div>
  );
}
