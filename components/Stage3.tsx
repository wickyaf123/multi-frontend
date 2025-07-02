'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Terminal, ChevronDown, ChevronUp, Share2, Info } from "lucide-react"; 
import html2canvas from 'html2canvas';
import ShareModal from "@/components/ui/ShareModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the structure of a single leg
interface Leg {
    gameId: string;
    gameDescription: string;
    playerId: string;
    playerName: string;
    market: 'ATS' | '2+' | '2GS' | 'AGS'; // Updated to include all market types
    odds: number;
    team?: string; // Optional team name
    sport?: string; // Optional sport type
    position?: string; // Player position
    positionStats?: {
        tries_scored_per_game: number;
        tries_conceded_per_game: number;
        scoring_rate: number;
        defensive_vulnerability: number;
        league_ranking_scored?: number;
        league_ranking_conceded?: number;
        total_tries_scored?: number;
        total_tries_conceded?: number;
    };
}

// Define the structure of an alternative player
interface PlayerAlternative extends Leg {
    newMultiOdds: number;
    newPotentialWin: number;
    playerScore?: number; // Position-based player score
    performanceTags?: string[]; // Performance indicators and tags
    recommendationRank?: number; // Recommendation rank (1-5, where 1 is best)
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
    sportType?: string; // Added sportType for consistency with API response
    
    // Changed to an array of combinations
    combinations?: Combination[]; 
    playerAlternatives?: Record<string, PlayerAlternative[]>;
    fingerprintScore?: number; // Added for fingerprint score
    
    // Backward compatibility with previous versions (might need review based on new structure)
    // For now, we assume the new API will always send `combinations` if successful.
    // These could be removed if backend guarantees new format only.
    mainCombination?: Combination; // Keep for potential old data or direct single display
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
  const multiCardRef = useRef<HTMLDivElement>(null);
  const [selectedMultiIndex, setSelectedMultiIndex] = useState<number>(0); // To track which multi to display
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false); // State for share modal
  const [swapHistory, setSwapHistory] = useState<Array<{from: string, to: string, position: number}>>([]);
  const [swappingPosition, setSwappingPosition] = useState<number | null>(null); // Track which position is being swapped
  const [isSwapping, setIsSwapping] = useState<boolean>(false); // Global swap state

  useEffect(() => {
    // Reset selected multi index if the result is cleared or combinations change structure
    if (!result || !result.combinations || result.combinations.length === 0) {
      setSelectedMultiIndex(0);
    }
    // Also reset if the number of combinations changes and current index is out of bounds
    if (result && result.combinations && selectedMultiIndex >= result.combinations.length) {
      setSelectedMultiIndex(0);
    }
  }, [result, selectedMultiIndex]); // Depend on result object and its combinations

  // Get the current combination to display
  const getCurrentCombination = (): Combination | null => {
    if (!result || !result.combinations || result.combinations.length === 0) {
        // Fallback for older structure or if combinations is empty
        if (result?.mainCombination) return result.mainCombination;
        if (result?.legs && typeof result.achievedOdds === 'number' && typeof result.potentialWin === 'number') {
            return { legs: result.legs, achievedOdds: result.achievedOdds, potentialWin: result.potentialWin };
        }
        return null;
    }
    return result.combinations[selectedMultiIndex] || null;
  };

  // Get the main combination legs
  const getMainLegs = (): Leg[] => {
    const currentCombination = getCurrentCombination();
    return currentCombination?.legs || [];
  };
  
  // Get main combination odds
  const getMainOdds = (): number => {
    const currentCombination = getCurrentCombination();
    return currentCombination?.achievedOdds || 0;
  };
  
  // Get main combination potential win
  const getMainPotentialWin = (): number => {
    const currentCombination = getCurrentCombination();
    return currentCombination?.potentialWin || 0;
  };
  
  // Get player alternatives - These are associated with the first multi as per backend change
  // Or if we adapt onSwap, it should handle alternatives for the *currently selected* multi if API supports it.
  // For now, playerAlternatives in MultiResult are for the first multi from the backend.
  // The onSwap logic needs to be aware of this if it tries to apply alternatives to other multis.
  const getPlayerAlternatives = (position: number): PlayerAlternative[] => {
    // If we are viewing a multi other than the first, alternatives might not be applicable
    // unless the backend/onSwap is designed to handle this.
    // For now, let's assume alternatives always refer to the first multi, or the one they were fetched for.
    if (!result || !result.playerAlternatives) return [];
    // If selectedMultiIndex > 0, and alternatives are only for the first one, this might be misleading.
    // This needs careful handling if `onSwap` is to work for secondary multis.
    // Current backend sends alternatives only for the *first* of the distinct_multis.
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
  
  // Enhanced swap handler with history tracking and transitions
  const handleSwapPlayer = async (position: number, alternative: PlayerAlternative) => {
    const currentCombination = getCurrentCombination();
    if (!result || !currentCombination || !result.combinations || isSwapping) return;

    // Start swap animation
    setIsSwapping(true);
    setSwappingPosition(position);

    // Add a small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    // Track the swap
    const originalPlayer = currentCombination.legs[position];
    const swapRecord = {
      from: originalPlayer.playerName,
      to: alternative.playerName,
      position: position + 1
    };
    setSwapHistory(prev => [...prev, swapRecord]);

    // Create a copy of the legs for the *currently selected* multi
    const newLegs = [...currentCombination.legs];
    
    // Replace the player at the specified position
    newLegs[position] = {
      gameId: alternative.gameId,
      gameDescription: alternative.gameDescription,
      playerId: alternative.playerId,
      playerName: alternative.playerName,
      market: alternative.market,
      odds: alternative.odds,
      team: alternative.team,
      sport: alternative.sport,
      position: alternative.position,
      positionStats: alternative.positionStats
    };
    
    // Create an updated Combination object for the current multi
    const updatedSingleCombination: Combination = {
        legs: newLegs,
        achievedOdds: alternative.newMultiOdds,
        potentialWin: alternative.newPotentialWin
    };

    // Create a new list of combinations, replacing the one at selectedMultiIndex
    const updatedCombinations = [...result.combinations];
    updatedCombinations[selectedMultiIndex] = updatedSingleCombination;
    
    // Create updated result object
    const updatedResult: MultiResult = {
      ...result,
      combinations: updatedCombinations,
      playerAlternatives: result.playerAlternatives
    };

    if (updatedResult.playerAlternatives) {
      const positionKey = position.toString();
      const currentAlts = updatedResult.playerAlternatives[positionKey] || [];
      
      updatedResult.playerAlternatives[positionKey] = currentAlts.filter(
        alt => alt.playerId !== alternative.playerId || alt.market !== alternative.market
      );
      
      if (updatedResult.playerAlternatives[positionKey].length === 0) {
        delete updatedResult.playerAlternatives[positionKey];
      }
    }
    
    onSwap(updatedResult);
    setExpandedPosition(null);
    
    // End swap animation
    setTimeout(() => {
      setIsSwapping(false);
      setSwappingPosition(null);
    }, 200);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Helper function to format position name for display
  const formatPosition = (position: string): string => {
    const positionMap: Record<string, string> = {
      'FLB': 'Fullback',
      'LW': 'Left Wing',
      'RW': 'Right Wing',
      'LC': 'Left Centre',
      'RC': 'Right Centre',
      'LHLF': 'Left Half',
      'RHLF': 'Right Half',
      'HOK': 'Hooker',
      'L2RF': 'Left 2nd Row',
      'R2RF': 'Right 2nd Row',
      'MID': 'Middle Forward'
    };
    return positionMap[position] || position;
  };

  // Helper function to get position color for visual distinction
  const getPositionColor = (position: string): string => {
    const colorMap: Record<string, string> = {
      'FLB': 'bg-blue-100 text-blue-800',
      'LW': 'bg-green-100 text-green-800',
      'RW': 'bg-green-100 text-green-800',
      'LC': 'bg-purple-100 text-purple-800',
      'RC': 'bg-purple-100 text-purple-800',
      'LHLF': 'bg-yellow-100 text-yellow-800',
      'RHLF': 'bg-yellow-100 text-yellow-800',
      'HOK': 'bg-red-100 text-red-800',
      'L2RF': 'bg-orange-100 text-orange-800',
      'R2RF': 'bg-orange-100 text-orange-800',
      'MID': 'bg-gray-100 text-gray-800'
    };
    return colorMap[position] || 'bg-gray-100 text-gray-800';
  };

  // Helper function to render circular strength indicators
  const renderCircularStrengthBars = (positionStats: any, size: 'large' | 'small' = 'large') => {
    if (!positionStats) return null;

    const scoringPercentage = Math.min((positionStats.scoring_rate / 2.0) * 100, 100);
    const concededPercentage = Math.min((positionStats.defensive_vulnerability / 2.0) * 100, 100);
    
    const circleSize = size === 'large' ? 48 : 32;
    const strokeWidth = size === 'large' ? 4 : 3;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    const scoringOffset = circumference - (scoringPercentage / 100) * circumference;
    const concededOffset = circumference - (concededPercentage / 100) * circumference;

    return (
      <TooltipProvider>
        <div className={`flex ${size === 'large' ? 'flex-col gap-3' : 'flex-row gap-2'} items-center`}>
          {/* Scored Circle */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <svg width={circleSize} height={circleSize} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke="#e5e7eb"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Progress circle */}
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke="#10b981"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={scoringOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-in-out"
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center ${size === 'large' ? 'text-xs' : 'text-xs'} font-bold text-green-600`}>
                {positionStats.scoring_rate.toFixed(1)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`${size === 'large' ? 'text-xs' : 'text-xs'} text-muted-foreground mt-1 text-center`}>
                {size === 'large' ? 'Scored per game' : 'Scored'}
                <br />
                {size === 'large' && <span className="text-[10px]">by position</span>}
              </span>
              {size === 'large' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Tries scored per game by the player's position in the player's team this season</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Conceded Circle */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <svg width={circleSize} height={circleSize} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke="#e5e7eb"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Progress circle */}
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  stroke="#ef4444"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={concededOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-in-out"
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center ${size === 'large' ? 'text-xs' : 'text-xs'} font-bold text-red-600`}>
                {positionStats.defensive_vulnerability.toFixed(1)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`${size === 'large' ? 'text-xs' : 'text-xs'} text-muted-foreground mt-1 text-center`}>
                {size === 'large' ? 'Conceded per game' : 'Conceded'}
                <br />
                {size === 'large' && <span className="text-[10px]">by position</span>}
              </span>
              {size === 'large' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Tries conceded per game to the player's position by the opposing team this season</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  };

  // Helper function to render compact position stats with strength bars
  const renderCompactPositionStats = (leg: Leg) => {
    if (!leg.positionStats) return null;

    const stats = leg.positionStats;
    
    // Normalize values for bar display (assuming max values for scaling)
    const maxScoring = 2.0; // Adjust based on your data range
    const maxConceded = 2.0; // Adjust based on your data range
    
    const scoringPercentage = Math.min((stats.scoring_rate / maxScoring) * 100, 100);
    const concededPercentage = Math.min((stats.defensive_vulnerability / maxConceded) * 100, 100);

    return (
      <div className="text-xs bg-muted/30 rounded px-2 py-1.5 space-y-2">
        {/* Scored Bar */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16 text-right shrink-0">Scored:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-0">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${scoringPercentage}%` }}
            ></div>
          </div>
          <span className="font-medium text-green-600 w-8 text-xs shrink-0">
            {stats.scoring_rate.toFixed(1)}
          </span>
        </div>
        
        {/* Conceded Bar */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16 text-right shrink-0">Conceded:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-0">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${concededPercentage}%` }}
            ></div>
          </div>
          <span className="font-medium text-red-600 w-8 text-xs shrink-0">
            {stats.defensive_vulnerability.toFixed(1)}
          </span>
        </div>
      </div>
    );
  };

  // Helper function to render compact performance tags
  const renderCompactPerformanceTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {tags.slice(0, 2).map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
          >
            {tag}
          </span>
        ))}
        {tags.length > 2 && (
          <span className="text-xs text-muted-foreground">+{tags.length - 2} more</span>
        )}
      </div>
    );
  };

  // Rank styling removed as requested

  // Helper function to generate ranking explanation for position tooltips
  const generatePositionRankingExplanation = (leg: Leg): string => {
    if (!leg.positionStats || !leg.team || !leg.position) {
      return "No ranking data available";
    }
    
    const stats = leg.positionStats;
    const team = leg.team;
    const position = formatPosition(leg.position);
    const market = leg.market;
    
    // Determine which ranking to show based on market type
    if (market === 'ATS' || market === '2+') {
      // For scoring markets, show scoring ranking
      if (stats.league_ranking_scored && stats.total_tries_scored !== undefined) {
        const ordinalSuffix = (n: number) => {
          const s = ["th", "st", "nd", "rd"];
          const v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        
        return `${team} are ranked ${ordinalSuffix(stats.league_ranking_scored)} for tries scored by ${position.toLowerCase()}s this season with ${stats.total_tries_scored}`;
      }
    }
    
    // Fallback to general stats
    if (stats.scoring_rate) {
      return `${team} ${position.toLowerCase()}s average ${stats.scoring_rate.toFixed(1)} tries per game this season`;
    }
    
    return "Statistical data available";
  };

  // Helper function to generate a one-liner explanation for why a leg is good
  const generateLegExplanation = (leg: Leg): string => {
    if (!leg.positionStats) {
      return `Strong ${leg.market} pick with ${leg.odds.toFixed(2)} odds`;
    }

    const stats = leg.positionStats;
    const scoringRate = stats.scoring_rate;
    const defensiveVuln = stats.defensive_vulnerability;
    const market = leg.market;
    const position = leg.position ? formatPosition(leg.position) : 'player';

    // Generate explanation based on stats and market
    if (market === 'ATS') {
      if (scoringRate >= 1.0) {
        return `High-scoring ${position} averaging ${scoringRate.toFixed(1)} tries/game - strong ATS chance`;
      } else if (scoringRate >= 0.5) {
        return `Consistent ${position} with solid ${scoringRate.toFixed(1)} tries/game scoring rate`;
      } else {
        return `Value pick - ${position} with decent odds at ${leg.odds.toFixed(2)}`;
      }
    } else if (market === '2+' || market === '2GS') {
      if (scoringRate >= 1.2) {
        return `Prolific scorer averaging ${scoringRate.toFixed(1)} tries/game - excellent 2+ chance`;
      } else if (scoringRate >= 0.8) {
        return `Reliable ${position} with good ${scoringRate.toFixed(1)} tries/game average`;
      } else {
        return `Solid 2+ option with ${leg.odds.toFixed(2)} odds`;
      }
    } else if (market === 'AGS') {
      if (scoringRate >= 0.8) {
        return `Strong attacking ${position} - ${scoringRate.toFixed(1)} tries/game makes AGS likely`;
      } else {
        return `Good AGS prospect with ${leg.odds.toFixed(2)} odds`;
      }
    }

    // Fallback explanation
    return `Quality ${position} pick with ${leg.odds.toFixed(2)} odds`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Generating your multi...</p>
          <Progress value={66} className="w-48" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!result) {
      return (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Results</AlertTitle>
          <AlertDescription>No multi combinations were found. Please try different parameters.</AlertDescription>
        </Alert>
      );
    }

      const mainLegs = getMainLegs();
    const mainOdds = getMainOdds();
    const mainPotentialWin = getMainPotentialWin();
      
      return (
      <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Header Section - Fixed */}
        <div className="flex-shrink-0 space-y-3">
          {/* Multi Selection Tabs */}
          {result.combinations && result.combinations.length > 1 && (
            <div className="flex space-x-2">
              {result.combinations.map((_, index) => (
                <Button 
                  key={index}
                  variant={selectedMultiIndex === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMultiIndex(index)}
                >
                  Multi {index + 1}
                </Button>
              ))}
            </div>
          )}


          {/* Summary Stats - Compact */}
          <div className="grid grid-cols-3 gap-3 p-2 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-base font-bold text-primary">{result.targetOdds?.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Achieved</p>
              <p className="text-base font-bold text-accent">{mainOdds.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Win</p>
              <p className="text-base font-bold text-green-600">${mainPotentialWin.toFixed(2)}</p>
            </div>
          </div>

          {/* Swap History */}
          {swapHistory.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="text-xs font-medium text-blue-900 mb-1">
                🔄 Swaps Made ({swapHistory.length})
              </div>
              <div className="text-xs text-blue-700 space-y-1 max-h-16 overflow-y-auto">
                {swapHistory.slice(-3).map((swap, index) => (
                  <div key={index}>
                    Leg {swap.position}: {swap.from} → {swap.to}
                  </div>
                ))}
                {swapHistory.length > 3 && (
                  <div className="text-blue-600">... and {swapHistory.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Multi Legs Section */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold">Multi Legs</h3>
            <span className="text-sm text-muted-foreground">{mainLegs.length} legs</span>
          </div>
          
          {mainLegs.map((leg, index) => (
            <div key={`${leg.playerId}-${leg.market}-${index}`} className="flex items-start gap-3">
              {/* Main Leg Card */}
              <div 
                className={`flex-1 border rounded-lg bg-card hover:shadow-sm transition-all duration-500 ${
                  swappingPosition === index ? 'scale-105 shadow-lg ring-2 ring-primary/50 bg-primary/5' : ''
                }`}
              >
                {/* Compact Leg Header */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center transition-all duration-300 ${
                        swappingPosition === index ? 'animate-pulse' : ''
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold text-sm transition-all duration-300 ${
                            swappingPosition === index ? 'text-primary' : ''
                          }`}>
                            {leg.playerName}
                          </h4>
                          <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs font-medium">
                            {leg.market === 'ATS' ? 'Anytime Try Scorer' : leg.market === '2+' ? '2+ Tries' : leg.market === '2GS' ? '2+ Goals' : leg.market === 'AGS' ? 'Anytime Goal Scorer' : leg.market}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{leg.gameDescription}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold text-primary transition-all duration-300 ${
                        swappingPosition === index ? 'scale-110' : ''
                      }`}>
                        {leg.odds.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">odds</div>
                    </div>
                  </div>
                  
                  {/* Compact Info Row */}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="flex items-center gap-3">
                      {leg.position && (
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPositionColor(leg.position)}`}>
                            {formatPosition(leg.position)}
                                </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{generatePositionRankingExplanation(leg)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alternatives Section - Hidden in share mode */}
                {getPlayerAlternatives(index).length > 0 && (
                  <div className="border-t bg-muted/20">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => togglePositionAlternatives(index)}
                      className="w-full justify-between p-2 h-auto text-xs hover:bg-muted/50"
                    >
                      <span>See Alternatives</span>
                      {expandedPosition === index ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                    
                    {expandedPosition === index && (
                      <div className="p-2 space-y-2 max-h-48 overflow-y-auto">
                        {getPlayerAlternatives(index).map((alt, altIndex) => {
                          return (
                            <div key={altIndex} className="relative border rounded-lg bg-card p-3 hover:shadow-sm transition-all duration-200">
                              {/* Rank badges removed as requested */}
                              
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  {/* Player Info */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <h5 className="font-semibold text-sm">{alt.playerName}</h5>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>
                                          {alt.market === 'ATS' ? 'Anytime Try Scorer' : alt.market === '2+' ? '2+ Tries' : alt.market === '2GS' ? '2+ Goals' : alt.market === 'AGS' ? 'Anytime Goal Scorer' : alt.market} @ {alt.odds.toFixed(2)}
                                        </span>
                                        {alt.position && (
                                          <span className={`px-1 py-0.5 rounded text-xs ${getPositionColor(alt.position)}`}>
                                            {alt.position}
                                      </span>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSwapPlayer(index, alt)}
                                      disabled={isSwapping}
                                      className={`h-7 px-3 text-xs transition-all duration-200 ${
                                        isSwapping ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                                      }`}
                                    >
                                      {isSwapping && swappingPosition === index ? (
                                        <div className="flex items-center gap-1">
                                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                          Swapping...
                                        </div>
                                      ) : (
                                        'Swap'
                                      )}
                                    </Button>
                                  </div>
                                  
                                  {/* Impact */}
                                  <div className="space-y-1">
                                    <div className="text-xs bg-muted/50 rounded px-2 py-1">
                                      <span className="text-muted-foreground">New: </span>
                                      <span className="font-medium text-accent">{alt.newMultiOdds?.toFixed(2)} odds</span>
                                      <span className="text-muted-foreground"> → </span>
                                      <span className="font-medium text-green-600">${alt.newPotentialWin?.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Alternative Player Circular Strength Bars */}
                                <div className="flex-shrink-0">
                                  {renderCircularStrengthBars(alt.positionStats, 'small')}
                                </div>
                              </div>
                            </div>
                    );
                })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* External Circular Strength Bars - Right Side - Hidden in share mode */}
              {leg.positionStats && (
                <div className="flex-shrink-0 mt-2">
                  {renderCircularStrengthBars(leg.positionStats, 'large')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b bg-card p-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-primary">🎯 Build Your Own Bet by Wicky</h2>
            <p className="text-sm text-muted-foreground">
              {result?.message || `Your ${getMainLegs().length}-leg multi combination`}
            </p>
          </div>
        <Button
          variant="outline"
            size="default"
          onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share2 className="h-5 w-5" />
            Share
        </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden">
        <div ref={multiCardRef} className="h-full p-4">
          {renderContent()}
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t bg-card p-4">
        <div className="flex justify-start">
          <Button onClick={onRestart}>
            Generate New Multi
        </Button>
        </div>
      </div>

      {/* Share Modal */}
      {result && getCurrentCombination() && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          combination={getCurrentCombination()!}
          targetOdds={result.targetOdds}
          stake={result.stake || 10}
          multiIndex={selectedMultiIndex + 1}
          totalMultis={result.combinations?.length || 1}
        />
      )}
    </div>
  );
} 