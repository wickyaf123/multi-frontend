'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type SportType = 'nrl' | 'afl' | 'combined';

interface Stage1And2Props {
  onSubmit: (stake: number, winAmount: number, sportType: SportType) => void;
  isLoading: boolean;
}

export default function Stage1And2({ onSubmit, isLoading }: Stage1And2Props) {
  const [stakeStr, setStakeStr] = useState('');
  const [winAmountStr, setWinAmountStr] = useState('');
  const [sportType, setSportType] = useState<SportType>('nrl');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate stake
    const stakeNum = parseFloat(stakeStr);
    if (isNaN(stakeNum) || stakeNum <= 0) {
      setError('Please enter a valid stake amount greater than 0.');
      return;
    }
    
    // Validate win amount
    const winAmountNum = parseFloat(winAmountStr);
    if (isNaN(winAmountNum) || winAmountNum <= stakeNum) {
      setError(`Please enter a win amount greater than your stake ($${stakeNum.toFixed(2)}).`);
      return;
    }
    
    setError(null);
    onSubmit(stakeNum, winAmountNum, sportType);
  };

  // Calculate implied odds (if both fields are valid)
  const calculateImpliedOdds = (): string => {
    const stake = parseFloat(stakeStr);
    const winAmount = parseFloat(winAmountStr);
    
    if (!isNaN(stake) && !isNaN(winAmount) && stake > 0 && winAmount > stake) {
      const odds = winAmount / stake;
      return odds.toFixed(2);
    }
    return "-";
  };

  return (
    <Card className="flex flex-col bg-card border-primary/20 shadow-lg h-full">
      <CardHeader className="bg-card border-b border-primary/10">
        <CardTitle className="text-foreground">Build Your Multi</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your stake and desired win amount
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-6">
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-6">
            {/* Sport Selection */}
            <div className="flex flex-col space-y-3">
              <Label htmlFor="sportType" className="text-foreground">Select Sport</Label>
              <RadioGroup
                defaultValue="nrl"
                value={sportType}
                onValueChange={(value) => setSportType(value as SportType)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nrl" id="nrl" />
                  <Label htmlFor="nrl" className="font-normal cursor-pointer">NRL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="afl" id="afl" />
                  <Label htmlFor="afl" className="font-normal cursor-pointer">AFL</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="combined" id="combined" />
                  <Label htmlFor="combined" className="font-normal cursor-pointer">Combined (NRL + AFL)</Label>
                </div>
              </RadioGroup>
              {sportType === 'combined' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Combined mode allows up to 17 players from both sports
                </p>
              )}
            </div>
            
            {/* Stake Input */}
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
            </div>
            
            {/* Win Amount Input */}
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="winAmount" className="text-foreground">Desired Win Amount ($)</Label>
              <Input
                id="winAmount"
                type="number"
                placeholder="e.g., 100"
                value={winAmountStr}
                onChange={(e) => setWinAmountStr(e.target.value)}
                min={parseFloat(stakeStr) > 0 ? parseFloat(stakeStr) + 0.01 : undefined}
                step="0.01"
                required
                className="bg-input border-border text-foreground focus:border-primary"
              />
            </div>
            
            {/* Display implied odds */}
            <div className="bg-secondary/10 p-3 rounded-md mt-2">
              <p className="text-sm text-muted-foreground mb-1">Target Odds:</p>
              <p className="text-xl font-mono text-primary">{calculateImpliedOdds()}x</p>
            </div>
            
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </form>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button 
          onClick={handleSubmit} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Multi"}
        </Button>
      </CardFooter>
    </Card>
  );
} 