'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Stage2Props {
  stake: number;
  onSubmit: (winAmount: number) => void;
  onBack: () => void;
}

export default function Stage2({ stake, onSubmit, onBack }: Stage2Props) {
  const [winAmountStr, setWinAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const winAmountNum = parseFloat(winAmountStr);
    if (isNaN(winAmountNum) || winAmountNum <= stake) {
      setError(`Please enter a win amount greater than your stake ($${stake.toFixed(2)}).`);
      return;
    }
    setError(null);
    onSubmit(winAmountNum);
  };

  return (
    <Card className="flex flex-col bg-card border-primary/20 shadow-lg">
      <CardHeader className="bg-card border-b border-primary/10">
        <CardTitle className="text-foreground">Stage 2: Desired Win</CardTitle>
        <CardDescription className="text-muted-foreground">
          How much do you want to win with your ${stake.toFixed(2)} stake?
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-6">
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="winAmount" className="text-foreground">Desired Win Amount ($)</Label>
              <Input
                id="winAmount"
                type="number"
                placeholder="e.g., 100"
                value={winAmountStr}
                onChange={(e) => setWinAmountStr(e.target.value)}
                min={stake + 0.01} // Minimum win is stake + smallest currency unit
                step="0.01"
                required
                className="bg-input border-border text-foreground focus:border-primary"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="mt-auto flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="border-primary/30 hover:bg-primary/10 text-foreground"
        >
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Generate Multi
        </Button>
      </CardFooter>
    </Card>
  );
} 