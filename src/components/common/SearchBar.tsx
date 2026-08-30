'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, MapPin, Building, ArrowRight, ShieldCheck } from 'lucide-react';
import { useProperty } from '@/context/PropertyContext';

interface SearchBarProps {
  initialValue?: string;
  size?: 'normal' | 'large';
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = '',
  size = 'large',
  placeholder = 'Enter 14-digit ULPIN (e.g. 14092837482910), Property ID, or Survey No...',
  onSearch,
}) => {
  const router = useRouter();
  const { properties } = useProperty();
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  const sampleUlpins = [
    { ulpin: '14092837482910', title: 'Skyline Heights Commercial (BLR)', status: 'VERIFIED' },
    { ulpin: '14092837482911', title: 'Green Valley Residency (HYD)', status: 'DISPUTED' },
    { ulpin: '14092837482912', title: 'Royal Palm Towers (PUN)', status: 'FIELD_VERIFICATION_REQUESTED' },
    { ulpin: '14092837482914', title: 'Sunrise Farm Parcel (MYS)', status: 'VERIFIED' },
  ];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    if (onSearch) {
      onSearch(cleanQuery);
      return;
    }

    // Check if directly matches a property's ULPIN or ID
    const matched = properties.find(
      (p) =>
        p.ulpin === cleanQuery ||
        p.id.toLowerCase() === cleanQuery.toLowerCase() ||
        p.propertyId.toLowerCase() === cleanQuery.toLowerCase()
    );

    if (matched) {
      router.push(`/properties/${matched.id}`);
    } else {
      router.push(`/properties?query=${encodeURIComponent(cleanQuery)}`);
    }
  };

  const handleSelectSuggestion = (ulpin: string) => {
    setQuery(ulpin);
    const matched = properties.find((p) => p.ulpin === ulpin);
    if (matched) {
      router.push(`/properties/${matched.id}`);
    } else {
      router.push(`/properties?query=${encodeURIComponent(ulpin)}`);
    }
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <div
          className={`relative flex items-center rounded-2xl transition-all duration-300 ${
            size === 'large'
              ? 'bg-slate-900/90 border-2 border-cyan-500/40 p-2 sm:p-2.5 shadow-[0_0_30px_-5px_rgba(6,182,212,0.35)] backdrop-blur-xl'
              : 'bg-white border border-slate-200 p-1.5 shadow-sm'
          } ${isFocused ? 'ring-4 ring-cyan-500/20 border-cyan-400' : ''}`}
        >
          <div className="pl-3 sm:pl-4 text-cyan-400 flex items-center gap-2">
            <Search className={size === 'large' ? 'w-6 h-6' : 'w-5 h-5'} />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 250)}
            placeholder={placeholder}
            className={`w-full bg-transparent px-3 sm:px-4 py-2 font-medium tracking-tight outline-none focus:outline-none ${
              size === 'large'
                ? 'text-white placeholder-slate-400 text-sm sm:text-base font-mono'
                : 'text-slate-900 placeholder-slate-400 text-sm'
            }`}
          />

          <button
            type="submit"
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold tracking-tight transition-all duration-200 shadow-md ${
              size === 'large'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-sm shadow-tech-cyan'
                : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs'
            }`}
          >
            <span>Verify ULPIN</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Suggested Quick ULPIN Pills */}
      {size === 'large' && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Quick Demo ULPINs:
          </span>
          {sampleUlpins.map((item) => (
            <button
              key={item.ulpin}
              type="button"
              onClick={() => handleSelectSuggestion(item.ulpin)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 font-mono text-[11px] transition-all hover:border-cyan-500/50"
            >
              <span>{item.ulpin}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  item.status === 'VERIFIED'
                    ? 'bg-emerald-400'
                    : item.status === 'DISPUTED'
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
