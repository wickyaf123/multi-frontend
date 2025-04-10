'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react"; 

// Define the structure of a single leg
interface Leg {
    gameId: string;
    gameDescription: string;
    playerId: string;
    playerName: string;
    market: 'ATS' | '2+'; // Use specific market types
    odds: number;
    team?: string; // Optional team name
}

// Define the structure of an alternative player
interface PlayerAlternative extends Leg {
    newMultiOdds: number;
    newPotentialWin: number;
}

// Define the structure of a combination
interface Combination {
    legs: Leg[];
    achievedOdds: number;
    potentialWin: number;
}

// Define the structure of the API response data
export interface MultiResult {
    message: string;
    targetOdds: number;
    stake?: number;
    
    // New API format with player alternatives
    combination?: Combination;
    playerAlternatives?: Record<string, PlayerAlternative[]>;
    
    // Backward compatibility with previous versions
    mainCombination?: Combination;
    alternatives?: Combination[];
    legs?: Leg[];
    achievedOdds?: number;
    potentialWin?: number;
}

interface Stage3Props {
  isLoading: boolean;
  error: string | null;
  result: MultiResult | null;
  onBack: () => void;
  onRestart: () => void;
  onSwap: (updatedResult: MultiResult) => void;
}

export default function Stage3({ isLoading, error, result, onBack, onRestart, onSwap }: Stage3Props) {
  // State for managing alternatives
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);

  // Get the main combination legs
  const getMainLegs = (): Leg[] => {
    if (!result) return [];
    
    // Handle the new API format
    if (result.combination) {
      return result.combination.legs;
    }
    
    // Handle the previous format with mainCombination
    if (result.mainCombination) {
      return result.mainCombination.legs;
    }
    
    // Backward compatibility with old format
    return result.legs || [];
  };
  
  // Get main combination odds
  const getMainOdds = (): number => {
    if (!result) return 0;
    
    // Handle the new API format
    if (result.combination) {
      return result.combination.achievedOdds;
    }
    
    // Handle the previous format with mainCombination
    if (result.mainCombination) {
      return result.mainCombination.achievedOdds;
    }
    
    // Backward compatibility with old format
    return result.achievedOdds || 0;
  };
  
  // Get main combination potential win
  const getMainPotentialWin = (): number => {
    if (!result) return 0;
    
    // Handle the new API format
    if (result.combination) {
      return result.combination.potentialWin;
    }
    
    // Handle the previous format with mainCombination
    if (result.mainCombination) {
      return result.mainCombination.potentialWin;
    }
    
    // Backward compatibility with old format
    return result.potentialWin || 0;
  };
  
  // Get player alternatives
  const getPlayerAlternatives = (position: number): PlayerAlternative[] => {
    if (!result || !result.playerAlternatives) return [];
    return result.playerAlternatives[position.toString()] || [];
  };
  
  // Handle toggling player alternatives for a position
  const togglePositionAlternatives = (position: number) => {
    if (expandedPosition === position) {
      setExpandedPosition(null);
    } else {
      setExpandedPosition(position);
    }
  };
  
  // Handle swapping a player in the multi
  const handleSwapPlayer = (position: number, alternative: PlayerAlternative) => {
    // Only proceed if we have a valid result and position
    if (!result || !result.combination) return;
    
    // Create a copy of the legs
    const newLegs = [...result.combination.legs];
    
    // Replace the player at the specified position
    newLegs[position] = {
      gameId: alternative.gameId,
      gameDescription: alternative.gameDescription,
      playerId: alternative.playerId,
      playerName: alternative.playerName,
      market: alternative.market,
      odds: alternative.odds,
      team: alternative.team
    };
    
    // Create updated result object
    const updatedResult: MultiResult = {
      ...result,
      combination: {
        legs: newLegs,
        achievedOdds: alternative.newMultiOdds,
        potentialWin: alternative.newPotentialWin
      }
    };
    
    // Update alternatives - remove the selected one from the position
    if (updatedResult.playerAlternatives) {
      const positionKey = position.toString();
      const currentAlts = updatedResult.playerAlternatives[positionKey] || [];
      
      // Filter out the selected alternative
      updatedResult.playerAlternatives[positionKey] = currentAlts.filter(
        alt => alt.playerId !== alternative.playerId || alt.market !== alternative.market
      );
      
      // If the position has no more alternatives, remove it
      if (updatedResult.playerAlternatives[positionKey].length === 0) {
        delete updatedResult.playerAlternatives[positionKey];
      }
    }
    
    // Call the onSwap callback with the updated result
    onSwap(updatedResult);
    
    // Close the expanded position
    setExpandedPosition(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='flex flex-col items-center space-y-2'>
            <p className="text-foreground">Generating your multi...</p>
            <Progress className="w-[60%] bg-secondary/30" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="bg-destructive/20 border-destructive/30">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="text-destructive">Error</AlertTitle>
          <AlertDescription className="text-foreground">{error}</AlertDescription>
        </Alert>
      );
    }

    if (result && getMainLegs().length > 0) {
      const mainLegs = getMainLegs();
      
      return (
        <div>
            <p className="mb-2 text-sm text-muted-foreground">
                Target Odds: {result.targetOdds.toFixed(2)} /
                Achieved Odds: {getMainOdds().toFixed(2)} /
                Potential Win: ${getMainPotentialWin().toFixed(2)} (from ${result.stake?.toFixed(2)} stake)
            </p>
            <ul className="space-y-2 border border-primary/20 rounded-md p-3 bg-card/70 max-h-[350px] overflow-y-auto">
                {mainLegs.map((leg, index) => {
                    const hasAlternatives = getPlayerAlternatives(index).length > 0;
                    const isExpanded = expandedPosition === index;
                    
                    return (
                      <React.Fragment key={`${leg.gameId}-${leg.playerId}-${leg.market}`}>
                        <li className="text-sm">
                          <div className="flex justify-between items-center">
                            <span>
                                <span className="font-semibold text-foreground">{leg.playerName}</span> 
                                <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                    {leg.market === 'ATS' ? 'Anytime Try' : '2+ Tries'}
                                </span>
                                <br/>
                                <span className='text-xs text-muted-foreground'>
                                    {leg.team ? `${leg.team} - ` : ''}{leg.gameDescription}
                                </span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">
                                  @{leg.odds.toFixed(2)}
                              </span>
                              {hasAlternatives && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 hover:bg-primary/10 text-foreground"
                                  onClick={() => togglePositionAlternatives(index)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Alternative players for this position */}
                          {isExpanded && (
                            <div className="mt-2 ml-4 border-l-2 pl-3 border-primary/30">
                              <p className="text-xs text-primary mb-1">Alternative Players:</p>
                              <ul className="space-y-1.5">
                                {getPlayerAlternatives(index).map((alt, altIndex) => (
                                  <li key={`alt-${index}-${altIndex}`} className="text-xs">
                                    <div className="flex justify-between items-center hover:bg-primary/10 p-1 rounded cursor-pointer" onClick={() => handleSwapPlayer(index, alt)}>
                                      <span>
                                        <span className="font-medium text-foreground">{alt.playerName}</span>
                                        <span className="ml-1 px-1 py-0.5 rounded bg-primary/10 text-primary text-[10px]">
                                          {alt.market === 'ATS' ? 'Anytime Try' : '2+ Tries'}
                                        </span>
                                      </span>
                                      <div className="flex flex-col items-end">
                                        <span className="font-mono bg-primary/20 text-primary px-1 rounded text-[10px]">
                                          @{alt.odds.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          New Multi: {alt.newMultiOdds.toFixed(2)} (${alt.newPotentialWin.toFixed(2)})
                                        </span>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </li>
                      </React.Fragment>
                    );
                })}
            </ul>
        </div>
      );
    }

    if (result && getMainLegs().length === 0) {
      return (
        <Alert className="bg-secondary/10 border-secondary/20">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="text-foreground">No Combination Found</AlertTitle>
          <AlertDescription className="text-muted-foreground">{result.message}</AlertDescription>
        </Alert>
      );
    }

    // Fallback for unexpected state
    return <p>Something went wrong. Please try again.</p>;
  };

  return (
    <Card className="flex flex-col bg-card border-primary/20 shadow-lg">
      <CardHeader className="bg-card border-b border-primary/10">
        <CardTitle className="text-foreground">Stage 3: Your Generated Multi</CardTitle>
        <CardDescription className="text-muted-foreground">
          {isLoading ? "Calculating..." : (error || (result && getMainLegs().length === 0)) ? "Result" : "Here's a multi matching your request:"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pt-6">
        {renderContent()}
      </CardContent>
      <CardFooter className="mt-auto flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack} 
          disabled={isLoading} 
          className="border-primary/30 hover:bg-primary/10 text-foreground disabled:opacity-50"
        >
          Back
        </Button>
        <Button 
          variant="secondary" 
          onClick={onRestart} 
          disabled={isLoading}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
        >
          Start Over
        </Button>
      </CardFooter>
    </Card>
  );
} 