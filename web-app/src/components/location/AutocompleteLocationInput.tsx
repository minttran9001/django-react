"use client";

import { MapPin } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isMapboxConfigured,
  searchMapboxLocations,
  type MapboxLocationSuggestion,
} from "@/lib/mapbox/geocoding";
import { cn } from "@/lib/utils";

export interface LocationSelection {
  address: string;
  latitude: string;
  longitude: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

interface AutocompleteLocationInputProps {
  id?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  defaultValue?: string;
  onLocationSelect: (location: LocationSelection) => void;
}

export function AutocompleteLocationInput({
  id,
  label = "Location",
  placeholder = "Search for an address or place",
  disabled = false,
  defaultValue = "",
  onLocationSelect,
}: AutocompleteLocationInputProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const confirmedQueryRef = useRef(defaultValue || null);
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<MapboxLocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);

  const mapboxConfigured = isMapboxConfigured();
  const inputId = id ?? "location-search";

  const updateDropdownPosition = useCallback(() => {
    const inputWrapper = inputWrapperRef.current;
    if (!inputWrapper) return;

    const rect = inputWrapper.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const selectSuggestion = useCallback(
    (suggestion: MapboxLocationSuggestion) => {
      confirmedQueryRef.current = suggestion.placeName;
      setQuery(suggestion.placeName);
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setDropdownPosition(null);
      setIsLoading(false);
      setErrorMessage(null);
      onLocationSelect({
        address: suggestion.placeName,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      });
    },
    [onLocationSelect],
  );

  useEffect(() => {
    if (!mapboxConfigured || query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setErrorMessage(null);
      setIsOpen(false);
      return;
    }

    if (confirmedQueryRef.current === query) {
      setSuggestions([]);
      setIsLoading(false);
      setErrorMessage(null);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const results = await searchMapboxLocations(query, controller.signal);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setActiveIndex(-1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setIsOpen(false);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to search locations right now.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [mapboxConfigured, query]);

  useEffect(() => {
    if (!isOpen || suggestions.length === 0) {
      setDropdownPosition(null);
      return;
    }

    updateDropdownPosition();

    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);

    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen, suggestions.length, updateDropdownPosition]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
      setActiveIndex(-1);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const dropdown =
    isOpen && suggestions.length > 0 && dropdownPosition
      ? createPortal(
        <ul
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
          className="fixed z-50 max-h-64 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="presentation">
              <button
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none",
                  activeIndex === index
                    ? "bg-muted text-foreground"
                    : "hover:bg-muted/70",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{suggestion.placeName}</span>
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )
      : null;

  return (
    <div ref={containerRef} className="space-y-2">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div ref={inputWrapperRef}>
        <Input
          id={inputId}
          type="search"
          role="combobox"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          placeholder={placeholder}
          disabled={disabled || !mapboxConfigured}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            if (nextQuery !== confirmedQueryRef.current) {
              confirmedQueryRef.current = null;
            }
            setQuery(nextQuery);
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {!mapboxConfigured && (
        <p className="text-sm text-muted-foreground">
          Add `NEXT_PUBLIC_MAPBOX_TOKEN` to enable location search.
        </p>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Searching locations...</p>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {dropdown}

      {isOpen &&
        !isLoading &&
        query.trim().length >= 2 &&
        suggestions.length === 0 &&
        !errorMessage && (
          <p className="text-sm text-muted-foreground">No locations found.</p>
        )}
    </div>
  );
}
