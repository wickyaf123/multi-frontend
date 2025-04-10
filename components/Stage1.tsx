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
    <Card className="flex flex-col bg-card border-primary/20 shadow-lg">
      <CardHeader className="bg-card border-b border-primary/10">
        <CardTitle className="text-foreground">Stage 1: Enter Stake</CardTitle>
        <CardDescription className="text-muted-foreground">How much do you want to bet?</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-6">
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="stake" className="text-foreground">Stake Amount ($)</Label>
              <Input
                id="stake"
                type="number"
                placeholder="e.g., 10"
                value={stakeStr}
                onChange={(e) => setStakeStr(e.target.value)}
                min="0.01"
                step="0.01"
                required
                className="bg-input border-border text-foreground focus:border-primary"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button 
          onClick={handleSubmit} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Next: Set Win Amount
        </Button>
      </CardFooter>
    </Card>
  );
} 