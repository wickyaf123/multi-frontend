'use client';

import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Share2, Download } from "lucide-react";
import html2canvas from 'html2canvas';

// Define the structure of a single leg
interface Leg {
    gameId: string;
    gameDescription: string;
    playerId: string;
    playerName: string;
    market: 'ATS' | '2+' | '2GS' | 'AGS';
    odds: number;
    team?: string;
    sport?: string;
    position?: string;
}

interface Combination {
    legs: Leg[];
    achievedOdds: number;
    potentialWin: number;
}

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    combination: Combination;
    targetOdds: number;
    stake: number;
    multiIndex?: number;
    totalMultis?: number;
}

export default function ShareModal({ 
    isOpen, 
    onClose, 
    combination, 
    targetOdds, 
    stake, 
    multiIndex = 1, 
    totalMultis = 1 
}: ShareModalProps) {
    const shareContentRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);

    if (!isOpen) return null;

    const getMarketDisplayName = (market: string): string => {
        const marketNames = {
            'ATS': 'Anytime Try Scorer',
            '2+': '2+ Tries',
            '2GS': '2+ Goals', 
            'AGS': 'Anytime Goal Scorer'
        };
        return marketNames[market as keyof typeof marketNames] || market;
    };

    const getSportEmoji = (sport?: string): string => {
        if (sport?.toLowerCase() === 'afl') return '🏈';
        if (sport?.toLowerCase() === 'nrl') return '🏉';
        return '🏆';
    };

    const handleShare = async () => {
        if (!shareContentRef.current || isSharing) return;

        setIsSharing(true);
        
        try {
            // Wait longer for the UI to fully update and fonts to load
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Force text rendering to be crisp
            const allTextElements = shareContentRef.current?.querySelectorAll('div, span, p');
            allTextElements?.forEach(el => {
                const element = el as HTMLElement;
                // Apply CSS properties using setAttribute to avoid TypeScript errors
                element.setAttribute('style', element.getAttribute('style') || '' + 
                    'text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased;');
            });
            
            // Configure html2canvas for better quality
            const canvas = await html2canvas(shareContentRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#121212', // Dark background to match theme
                logging: false,
                width: shareContentRef.current.scrollWidth,
                height: shareContentRef.current.scrollHeight,
                scale: 3, // Higher resolution for sharper text
                letterRendering: true, // Better text rendering
                fontDisplay: 'swap', // Better font handling
                onclone: (clonedDoc: Document) => {
                    // Additional text fixes on the cloned document
                    const clonedElements = clonedDoc.querySelectorAll('div, span, p');
                    clonedElements.forEach((el: Element) => {
                        const element = el as HTMLElement;
                        element.style.setProperty('text-rendering', 'optimizeLegibility');
                    });
                }
            } as any);
            
            const image = canvas.toDataURL("image/png", 1.0);
            
            // Check if Web Share API is supported and files can be shared
            if (navigator.share && navigator.canShare) {
                try {
                    const response = await fetch(image);
                    const blob = await response.blob();
                    const file = new File([blob], 'multi-bet-wicky.png', { type: 'image/png' });

                    const shareData = {
                        title: 'Build Your Own Bet by Wicky',
                        text: `Check out this ${combination.legs.length}-leg multi! Target: ${targetOdds.toFixed(2)}x, Potential win: $${combination.potentialWin.toFixed(2)} 🎯`,
                        files: [file],
                    };

                    if (navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                        console.log("Multi shared successfully!");
                        onClose();
                    } else {
                        throw new Error("Files cannot be shared on this device");
                    }
                } catch (shareError) {
                    console.log("Web Share failed, falling back to download:", shareError);
                    downloadImage(image);
                }
            } else {
                console.log("Web Share API not supported, downloading image");
                downloadImage(image);
            }
        } catch (err) {
            console.error("Error taking screenshot:", err);
            alert("Sorry, there was an error taking the screenshot. Please try again.");
        } finally {
            setIsSharing(false);
        }
    };

    const downloadImage = (imageDataUrl: string) => {
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `wicky-multi-bet-${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Multi screenshot downloaded!");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            
            {/* Modal */}
            <div className="relative z-10 w-full max-w-sm mx-4 max-h-[85vh]">
                {/* Close button */}
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-2 right-2 z-20 bg-muted/90 hover:bg-muted text-muted-foreground border-border"
                >
                    <X className="h-4 w-4" />
                </Button>

                {/* Scrollable container */}
                <div className="overflow-y-auto max-h-[85vh] pr-1 pb-1">
                    {/* Share content - this is what gets screenshotted */}
                    <Card ref={shareContentRef} className="bg-card border border-border shadow-xl font-sans antialiased">
                    <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="text-center space-y-1">
                            <div className="text-lg font-bold text-primary">
                                🎯 Build Your Own Bet by Wicky
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Multi {multiIndex} of {totalMultis} • {combination.legs.length} legs
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="text-center bg-muted/50 rounded-lg p-2 border border-border">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Stake</div>
                                <div className="text-sm font-bold text-foreground">${stake}</div>
                            </div>
                            <div className="text-center bg-muted/50 rounded-lg p-2 border border-border">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Odds</div>
                                <div className="text-sm font-bold text-primary">{combination.achievedOdds.toFixed(2)}x</div>
                            </div>
                            <div className="text-center bg-muted/50 rounded-lg p-2 border border-border">
                                <div className="text-xs text-muted-foreground uppercase tracking-wide">Win</div>
                                <div className="text-sm font-bold text-green-600">${combination.potentialWin.toFixed(2)}</div>
                            </div>
                        </div>

                        {/* Multi Legs */}
                        <div className="space-y-2">
                            <div className="text-center text-xs font-semibold text-foreground border-b border-border pb-1">
                                Multi Legs
                            </div>
                            
                            {combination.legs.map((leg, index) => (
                                <div key={`${leg.playerId}-${index}`} className="bg-muted/30 rounded-lg p-2 border border-border">
                                    <div className="flex flex-col">
                                        {/* Header with player name and number */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="font-semibold text-foreground text-sm">
                                                {leg.playerName}
                                            </div>
                                            <div className="ml-auto text-lg font-bold text-primary">
                                                {leg.odds.toFixed(2)}
                                            </div>
                                        </div>
                                        
                                        {/* Game description */}
                                        <div className="text-xs text-muted-foreground mb-1">
                                            {leg.gameDescription}
                                        </div>
                                        
                                        {/* Market and sport */}
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <span className="bg-accent/20 text-accent px-1.5 py-0.5 rounded text-xs font-medium">
                                                {getMarketDisplayName(leg.market)}
                                            </span>
                                            {leg.sport && (
                                                <span className="text-xs text-muted-foreground">
                                                    {getSportEmoji(leg.sport)} {leg.sport.toUpperCase()}
                                                </span>
                                            )}
                                            <span className="ml-auto text-xs text-muted-foreground">odds</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Share Button - Outside the screenshot */}

                        {/* Footer */}
                        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
                            Generated with Build Your Own Bet by Wicky
                        </div>
                    </CardContent>
                </Card>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4 justify-center">
                    <Button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {isSharing ? (
                            <>
                                <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <Share2 className="h-4 w-4" />
                                Share Screenshot
                            </>
                        )}
                    </Button>
                    
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSharing}
                        className="bg-muted hover:bg-muted/80 text-muted-foreground border-border"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
} 