'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Building2, Home, Landmark, Palette, TrendingUp, Package, HelpCircle } from 'lucide-react';
import { FormData, FormErrors, ASSET_TYPES, CURRENCIES } from '../../types';

interface Step1AssetInfoProps {
  formData: FormData;
  errors: FormErrors;
  updateFormData: (field: keyof FormData, value: any) => void;
}

interface LocationSuggestion {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
}

const ASSET_ICONS: Record<string, React.ReactNode> = {
  real_estate: <Home className="w-5 h-5" />,
  infrastructure: <Landmark className="w-5 h-5" />,
  art_collectibles: <Palette className="w-5 h-5" />,
  business_equity: <Building2 className="w-5 h-5" />,
  revenue_based: <TrendingUp className="w-5 h-5" />,
  commodities: <Package className="w-5 h-5" />,
  other: <HelpCircle className="w-5 h-5" />,
};

export function Step1AssetInfo({ formData, errors, updateFormData }: Step1AssetInfoProps) {
  const [locationQuery, setLocationQuery] = useState(formData.assetLocation || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced location search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (locationQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(locationQuery)}`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch (error) {
        console.error('Location search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [locationQuery]);

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    const { address } = suggestion;
    const city = address.city || address.town || address.village || address.municipality || '';
    const country = address.country || '';
    const formattedLocation = [city, address.state, country].filter(Boolean).join(', ');
    
    setLocationQuery(formattedLocation);
    updateFormData('assetLocation', formattedLocation);
    setShowSuggestions(false);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationQuery(value);
    updateFormData('assetLocation', value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Asset Information</h2>
        <p className="text-gray-400 text-sm">
          Tell us about the asset you want to tokenize
        </p>
      </div>

      {/* Asset Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Asset Type <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ASSET_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateFormData('assetType', type.value)}
              className={`
                flex items-center gap-3 p-4 rounded-xl border transition-all text-left
                ${formData.assetType === type.value
                  ? 'bg-blue-500/20 border-blue-500 text-white'
                  : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                }
              `}
            >
              <span className={formData.assetType === type.value ? 'text-blue-400' : 'text-gray-400'}>
                {ASSET_ICONS[type.value] || <HelpCircle className="w-5 h-5" />}
              </span>
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
        {errors.assetType && (
          <p className="mt-2 text-sm text-red-400">{errors.assetType}</p>
        )}
      </div>

      {/* Asset Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Asset Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.assetName}
          onChange={(e) => updateFormData('assetName', e.target.value)}
          placeholder="e.g., Downtown Office Building, Vintage Art Collection"
          className={`w-full px-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.assetName ? 'border-red-500' : 'border-gray-600'
          }`}
        />
        {errors.assetName && (
          <p className="mt-1 text-sm text-red-400">{errors.assetName}</p>
        )}
      </div>

      {/* Asset Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Asset Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.assetDescription}
          onChange={(e) => updateFormData('assetDescription', e.target.value)}
          placeholder="Describe your asset in detail: its features, condition, history, and any unique characteristics..."
          rows={4}
          className={`w-full px-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
            errors.assetDescription ? 'border-red-500' : 'border-gray-600'
          }`}
        />
        {errors.assetDescription && (
          <p className="mt-1 text-sm text-red-400">{errors.assetDescription}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {formData.assetDescription.length}/1000 characters
        </p>
      </div>

      {/* Asset Location with Autocomplete */}
      <div ref={wrapperRef} className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Asset Location <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => handleLocationInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Start typing a city or address..."
            className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.assetLocation ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((suggestion, index) => {
              const { address } = suggestion;
              const city = address.city || address.town || address.village || address.municipality || '';
              const country = address.country || '';
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleLocationSelect(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        {city || suggestion.display_name.split(',')[0]}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {[address.state, country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {errors.assetLocation && (
          <p className="mt-1 text-sm text-red-400">{errors.assetLocation}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Type at least 3 characters to search for locations
        </p>
      </div>

      {/* Estimated Value & Currency */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
            Estimated Value <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-3">
            <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'GBP' ? '£' : ''}
            </span>
            <input
                type="text"
                value={formData.estimatedValue}
                onChange={(e) => {
                // Remove non-numeric characters except decimal point
                const rawValue = e.target.value.replace(/[^0-9.]/g, '');
                
                // Split by decimal point
                const parts = rawValue.split('.');
                
                // Format the integer part with commas
                const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                
                // Reconstruct with decimal part (limit to 2 decimal places)
                const formattedValue = parts.length > 1 
                    ? `${integerPart}.${parts[1].slice(0, 2)}`
                    : integerPart;
                
                updateFormData('estimatedValue', formattedValue);
                }}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-3 bg-gray-700 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.estimatedValue ? 'border-red-500' : 'border-gray-600'
                }`}
            />
            </div>
            <select
            value={formData.currency}
            onChange={(e) => updateFormData('currency', e.target.value)}
            className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                {currency.label}
                </option>
            ))}
            </select>
        </div>
        {errors.estimatedValue && (
            <p className="mt-1 text-sm text-red-400">{errors.estimatedValue}</p>
        )}
        {formData.estimatedValue && (
            <p className="mt-1 text-xs text-gray-500">
            {formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'GBP' ? '£' : ''}{formData.estimatedValue} {formData.currency}
            </p>
        )}
        </div>

      {/* Website (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
            Website <span className="text-gray-500">(Optional)</span>
        </label>
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            https://
            </span>
            <input
            type="text"
            value={formData.website?.replace(/^https?:\/\//, '') || ''}
            onChange={(e) => {
                const value = e.target.value.replace(/^https?:\/\//, '');
                updateFormData('website', value ? `https://${value}` : '');
            }}
            placeholder="example.com"
            className="w-full pl-[72px] pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
        {formData.website && (
            <p className="mt-1 text-xs text-gray-500">
            Full URL: {formData.website}
            </p>
        )}
        </div>
    </div>
  );
}
