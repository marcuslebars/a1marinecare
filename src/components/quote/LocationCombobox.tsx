"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { locations } from "@/content/site";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  customLocation: string;
  onCustomLocationChange: (value: string) => void;
  marinaDetails: string;
  onMarinaDetailsChange: (value: string) => void;
}

export function LocationCombobox({
  value,
  onChange,
  customLocation,
  onCustomLocationChange,
  marinaDetails,
  onMarinaDetailsChange,
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const selectedLocation = locations.find((l) => l.slug === value);
  const isOtherSelected = value === "other";
  const hasCustomValue = value && !locations.find((l) => l.slug === value) && value !== "other";

  const displayValue = isOtherSelected
    ? "Other"
    : hasCustomValue
      ? value
      : selectedLocation?.name ?? "";

  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full h-11 justify-between rounded-xl bg-background border-input hover:bg-accent hover:text-accent-foreground",
              !displayValue && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              {displayValue || "Search locations..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command className="rounded-lg">
            <CommandInput
              placeholder="Search locations..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No location found.</CommandEmpty>
              <CommandGroup>
                {filteredLocations.map((location) => (
                  <CommandItem
                    key={location.slug}
                    value={location.slug}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === location.slug ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{location.name}</span>
                      <span className="text-xs text-muted-foreground">{location.region}</span>
                    </div>
                  </CommandItem>
                ))}
                <CommandItem
                  value="other"
                  onSelect={() => {
                    onChange("other");
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "other" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium">Other</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isOtherSelected && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <Label className="text-muted-foreground text-sm flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            Enter your marina, town, or boat location
          </Label>
          <Input
            placeholder="e.g. Honey Harbour Marina, Port Sydney..."
            value={customLocation}
            onChange={(e) => onCustomLocationChange(e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
      )}

      {(isOtherSelected || hasCustomValue) && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <Label className="text-muted-foreground text-sm">
            Marina / dock / access details <span className="text-xs">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. Slip B12, south dock, call on arrival..."
            value={marinaDetails}
            onChange={(e) => onMarinaDetailsChange(e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
