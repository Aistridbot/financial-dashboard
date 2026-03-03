'use client';

/**
 * Generate Signals button component.
 *
 * Triggers signal generation for a given portfolio and shows results.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { generateAndStoreSignals } from '@/lib/actions/generate-signals';

interface GenerateSignalsButtonProps {
  portfolioId: string;
}

export function GenerateSignalsButton({ portfolioId }: GenerateSignalsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    setIsGenerating(true);
    setResultMessage(null);

    try {
      const result = await generateAndStoreSignals(portfolioId);
      if (result.success) {
        const { generated, skippedDuplicates, errors } = result.data;
        const parts: string[] = [];
        if (generated > 0) parts.push(`${generated} signal${generated !== 1 ? 's' : ''} generated`);
        if (skippedDuplicates > 0) parts.push(`${skippedDuplicates} duplicate${skippedDuplicates !== 1 ? 's' : ''} skipped`);
        if (generated === 0 && skippedDuplicates === 0) parts.push('No new signals');
        if (errors.length > 0) parts.push(`${errors.length} warning${errors.length !== 1 ? 's' : ''}`);
        setResultMessage(parts.join(', '));
        router.refresh();
      } else {
        setResultMessage(`Error: ${result.error}`);
      }
    } catch {
      setResultMessage('Failed to generate signals');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex items-center gap-3" data-testid="generate-signals-section">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        data-testid="generate-signals-button"
      >
        {isGenerating ? 'Generating...' : 'Generate Signals'}
      </Button>
      {resultMessage && (
        <span className="text-sm text-muted-foreground" data-testid="generate-signals-result">
          {resultMessage}
        </span>
      )}
    </div>
  );
}
