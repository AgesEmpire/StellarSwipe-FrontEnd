"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, Clock, ArrowUpDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  value: string;
  type: "pair" | "provider" | "strategy";
  label: string;
}

interface SignalSearchProps {
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: { pair?: string; provider?: string; strategy?: string }) => void;
  className?: string;
}

const POPULAR_PAIRS = [
  "BTC/USD",
  "ETH/USD",
  "XLM/USD",
  "SOL/USD",
  "ADA/USD",
  "DOT/USD",
  "MATIC/USD",
  "ATOM/USD",
  "AVAX/USD",
  "LINK/USD",
];

const PROVIDERS = [
  "AlphaWave",
  "OrionSignals",
  "NebulaAI",
  "QuantPulse",
  "StellarEdge",
  "NovaTrade",
  "ZenithFX",
  "PolarSignals",
  "ApexQuant",
  "CosmicAlpha",
];

const STRATEGIES = [
  "Momentum",
  "Mean Reversion",
  "Breakout",
  "Scalping",
  "Swing",
  "Arbitrage",
  "Grid Trading",
  "DCA",
  "Trend Following",
  "Statistical Arbitrage",
];

export function SignalSearch({ onSearch, onFilterChange, className }: SignalSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("signal-recent-searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Generate suggestions based on query
  const suggestions = useMemo<SearchSuggestion[]>(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const results: SearchSuggestion[] = [];

    // Match pairs
    POPULAR_PAIRS.filter((p) => p.toLowerCase().includes(q)).forEach((p) => {
      results.push({ value: p, type: "pair", label: p });
    });

    // Match providers
    PROVIDERS.filter((p) => p.toLowerCase().includes(q)).forEach((p) => {
      results.push({ value: p, type: "provider", label: p });
    });

    // Match strategies
    STRATEGIES.filter((s) => s.toLowerCase().includes(q)).forEach((s) => {
      results.push({ value: s, type: "strategy", label: s });
    });

    return results.slice(0, 8);
  }, [query]);

  const saveRecentSearch = useCallback((search: string) => {
    if (!search.trim()) return;
    setRecentSearches((prev) => {
      const updated = [search, ...prev.filter((s) => s !== search)].slice(0, 10);
      try {
        localStorage.setItem("signal-recent-searches", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      setQuery(value);
      setIsFocused(false);
      setShowMobileModal(false);
      setSelectedIndex(-1);
      saveRecentSearch(value);
      onSearch?.(value);

      // Determine filter type and call onFilterChange
      const pair = POPULAR_PAIRS.find((p) => p.toLowerCase() === value.toLowerCase());
      const provider = PROVIDERS.find((p) => p.toLowerCase() === value.toLowerCase());
      const strategy = STRATEGIES.find((s) => s.toLowerCase() === value.toLowerCase());

      if (pair) onFilterChange?.({ pair: value });
      else if (provider) onFilterChange?.({ provider: value });
      else if (strategy) onFilterChange?.({ strategy: value });
      else onSearch?.(value);
    },
    [onSearch, onFilterChange, saveRecentSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex].value);
        } else if (query.trim()) {
          handleSelect(query.trim());
        }
      } else if (e.key === "Escape") {
        setIsFocused(false);
        setShowMobileModal(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
      }
    },
    [suggestions, selectedIndex, query, handleSelect]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("signal-recent-searches");
    } catch {
      // Ignore
    }
  }, []);

  const showSuggestions = isFocused && (query.trim().length > 0 || recentSearches.length > 0);
  const hasSuggestions = suggestions.length > 0;

  const getSuggestionIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "pair":
        return <TrendingUp className="w-3.5 h-3.5 text-blue-500" />;
      case "provider":
        return <ArrowUpDown className="w-3.5 h-3.5 text-purple-500" />;
      case "strategy":
        return <Search className="w-3.5 h-3.5 text-green-500" />;
    }
  };

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Search Input */}
        <div
          className={cn(
            "relative flex items-center rounded-lg border transition-all",
            isFocused
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-primary/50"
          )}
        >
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              setIsFocused(true);
              // On mobile, open full-screen modal
              if (window.innerWidth < 640) {
                setShowMobileModal(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestions
              setTimeout(() => setIsFocused(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search signals by pair, provider, or strategy..."
            className="w-full pl-10 pr-10 py-2.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search signals"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            role="combobox"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 p-0.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Desktop Dropdown Suggestions */}
        {showSuggestions && !showMobileModal && (
          <div
            ref={suggestionsRef}
            id="search-suggestions"
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {hasSuggestions ? (
              <div className="py-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      index === selectedIndex
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => handleSelect(suggestion.value)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <span className="flex-1">{suggestion.label}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {suggestion.type}
                    </span>
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No suggestions found. Press Enter to search.
              </div>
            ) : null}

            {/* Recent Searches (shown when no query) */}
            {!query.trim() && recentSearches.length > 0 && (
              <div className="border-t border-border">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Recent Searches
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <button
                    key={`recent-${index}`}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
                    onClick={() => handleSelect(search)}
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{search}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Full-Screen Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 bg-background sm:hidden">
          <div className="flex flex-col h-full">
            {/* Modal Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <button
                onClick={() => setShowMobileModal(false)}
                className="p-1 rounded-full hover:bg-muted"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search signals..."
                  className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-sm outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {query.trim() && hasSuggestions ? (
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`mobile-${suggestion.type}-${suggestion.value}`}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors",
                        index === selectedIndex
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => handleSelect(suggestion.value)}
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <span className="flex-1">{suggestion.label}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {suggestion.type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results for &quot;{query}&quot;</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Popular Pairs */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Popular Pairs
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_PAIRS.slice(0, 6).map((pair) => (
                        <button
                          key={pair}
                          onClick={() => handleSelect(pair)}
                          className="px-3 py-1.5 text-sm bg-muted rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {pair}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Recent Searches
                        </h3>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((search, index) => (
                          <button
                            key={`mobile-recent-${index}`}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-muted transition-colors"
                            onClick={() => handleSelect(search)}
                          >
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{search}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategy Tags */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Strategies
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {STRATEGIES.slice(0, 6).map((strategy) => (
                        <button
                          key={strategy}
                          onClick={() => handleSelect(strategy)}
                          className="px-3 py-1.5 text-sm bg-muted rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {strategy}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
