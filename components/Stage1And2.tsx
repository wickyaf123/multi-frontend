'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type SportType = 'nrl' | 'afl' | 'combined';

interface Stage1And2Props {
  onSubmit: (stake: number, winAmount: number, sportType: SportType, maxOddsPerLeg?: number) => void;
  isLoading: boolean;
}

export default function Stage1And2({ onSubmit, isLoading }: Stage1And2Props) {
  const [stakeStr, setStakeStr] = useState('');
  const [winAmountStr, setWinAmountStr] = useState('');
  const [sportType, setSportType] = useState<SportType>('nrl');
  const [maxOddsPerLegStr, setMaxOddsPerLegStr] = useState('');
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
    
    // Validate max odds per leg (optional)
    let maxOddsPerLegNum: number | undefined = undefined;
    if (maxOddsPerLegStr.trim() !== '') {
      maxOddsPerLegNum = parseFloat(maxOddsPerLegStr);
      if (isNaN(maxOddsPerLegNum) || maxOddsPerLegNum <= 0) {
        setError('Please enter a valid max odds per leg greater than 0, or leave it empty.');
        return;
      }
    }
    
    setError(null);
    onSubmit(stakeNum, winAmountNum, sportType, maxOddsPerLegNum);
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
    <Card className="bg-card border-primary/20 shadow-lg w-full max-w-md">
      <CardHeader className="bg-card border-b border-primary/10 py-1 px-4">
        <CardTitle className="text-foreground text-lg">Build Your Multi</CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Enter your stake and desired win amount
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1 pb-3 px-4 space-y-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Sport Selection - inline layout */}
          <div className="mt-0">
            <Label htmlFor="sportType" className="text-foreground text-sm mb-1 block">Select Sport</Label>
            <div className="flex flex-row space-x-4">
              <RadioGroup
                defaultValue="nrl"
                value={sportType}
                onValueChange={(value) => setSportType(value as SportType)}
                className="flex flex-row gap-3"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="nrl" id="nrl" />
                  <Label htmlFor="nrl" className="font-normal cursor-pointer">NRL</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="afl" id="afl" />
                  <Label htmlFor="afl" className="font-normal cursor-pointer">AFL</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="combined" id="combined" />
                  <Label htmlFor="combined" className="font-normal cursor-pointer">Combined</Label>
                </div>
              </RadioGroup>
            </div>
            {sportType === 'combined' && (
              <p className="text-xs text-muted-foreground mt-1">
                Combined mode allows up to 17 players from both sports
              </p>
            )}
          </div>
          
          {/* Stake and Win Amount side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Stake Input */}
            <div>
              <Label htmlFor="stake" className="text-foreground text-sm mb-1 block">Stake Amount ($)</Label>
              <Input
                id="stake"
                type="number"
                placeholder="10"
                value={stakeStr}
                onChange={(e) => setStakeStr(e.target.value)}
                min="0.01"
                step="0.01"
                required
                className="bg-input border-border text-foreground focus:border-primary h-9"
              />
            </div>
            
            {/* Win Amount Input */}
            <div>
              <Label htmlFor="winAmount" className="text-foreground text-sm mb-1 block">Desired Win Amount ($)</Label>
              <Input
                id="winAmount"
                type="number"
                placeholder="100"
                value={winAmountStr}
                onChange={(e) => setWinAmountStr(e.target.value)}
                min={parseFloat(stakeStr) > 0 ? parseFloat(stakeStr) + 0.01 : undefined}
                step="0.01"
                required
                className="bg-input border-border text-foreground focus:border-primary h-9"
              />
            </div>
          </div>
          
          {/* Max Odds Per Leg Input */}
          <div>
            <Label htmlFor="maxOddsPerLeg" className="text-foreground text-sm mb-1 block">Max Odds Per Leg (Optional)</Label>
            <Input
              id="maxOddsPerLeg"
              type="number"
              placeholder="e.g. 4.0"
              value={maxOddsPerLegStr}
              onChange={(e) => setMaxOddsPerLegStr(e.target.value)}
              min="0.01"
              step="0.01"
              className="bg-input border-border text-foreground focus:border-primary h-9"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Limit the maximum odds for any single player in your multi
            </p>
          </div>
          
          {/* Display implied odds */}
          <div className="bg-secondary/10 p-2 rounded-md">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Target Odds:</p>
              <p className="text-xl font-mono text-primary">{calculateImpliedOdds()}x</p>
            </div>
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
      <CardFooter className="py-2 px-4">
        <Button 
          onClick={handleSubmit} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-9"
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Multi"}
        </Button>
      </CardFooter>
    </Card>
  );
} 