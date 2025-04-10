'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Stage1Props {
  onSubmit: (stake: number) => void;
}

export default function Stage1({ onSubmit }: Stage1Props) {
  const [stakeStr, setStakeStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stakeNum = parseFloat(stakeStr);
    if (isNaN(stakeNum) || stakeNum <= 0) {
      setError('Please enter a valid stake amount greater than 0.');
      return;
    }
    setError(null);
    onSubmit(stakeNum);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Stage 1: Enter Stake</CardTitle>
        <CardDescription>How much do you want to bet?</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="stake">Stake Amount ($)</Label>
              <Input
                id="stake"
                type="number"
                placeholder="e.g., 10"
                value={stakeStr}
                onChange={(e) => setStakeStr(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button onClick={handleSubmit} className="w-full">Next: Set Win Amount</Button>
      </CardFooter>
    </Card>
  );
} 