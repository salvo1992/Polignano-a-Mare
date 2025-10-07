"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, X, Users, Euro, Star } from "lucide-react"

export function RoomFilters() {
  const [isOpen, setIsOpen] = useState(false)
  const [priceRange, setPriceRange] = useState([100, 300])
  const [guests, setGuests] = useState("")
  const [rating, setRating] = useState("")
  const [amenities, setAmenities] = useState<string[]>([])

  const amenityOptions = [
    "Vista panoramica",
    "Balcone privato",
    "WiFi gratuito",
    "Aria condizionata",
    "Minibar",
    "TV satellitare",
    "Vasca idromassaggio",
    "Patio privato",
  ]

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]))
  }

  const clearFilters = () => {
    setPriceRange([100, 300])
    setGuests("")
    setRating("")
    setAmenities([])
  }

  const activeFiltersCount =
    (priceRange[0] !== 100 || priceRange[1] !== 300 ? 1 : 0) + (guests ? 1 : 0) + (rating ? 1 : 0) + amenities.length

  return (
    <div className="mb-8">
      {/* Filter Toggle */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtri
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} className="text-sm">
            Cancella filtri
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(priceRange[0] !== 100 || priceRange[1] !== 300) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Euro className="w-3 h-3" />€{priceRange[0]} - €{priceRange[1]}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange([100, 300])} />
            </Badge>
          )}
          {guests && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {guests} ospiti
              <X className="w-3 h-3 cursor-pointer" onClick={() => setGuests("")} />
            </Badge>
          )}
          {rating && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {rating}+ stelle
              <X className="w-3 h-3 cursor-pointer" onClick={() => setRating("")} />
            </Badge>
          )}
          {amenities.map((amenity) => (
            <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
              {amenity}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleAmenity(amenity)} />
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Panel */}
      {isOpen && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-3 block">Prezzo per notte</label>
                <div className="px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={500}
                    min={50}
                    step={10}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>€{priceRange[0]}</span>
                    <span>€{priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="text-sm font-medium mb-3 block">Numero ospiti</label>
                <Select value={guests} onValueChange={setGuests}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona ospiti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 ospite</SelectItem>
                    <SelectItem value="2">2 ospiti</SelectItem>
                    <SelectItem value="3">3 ospiti</SelectItem>
                    <SelectItem value="4">4+ ospiti</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium mb-3 block">Valutazione minima</label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4.5">4.5+ stelle</SelectItem>
                    <SelectItem value="4.0">4.0+ stelle</SelectItem>
                    <SelectItem value="3.5">3.5+ stelle</SelectItem>
                    <SelectItem value="3.0">3.0+ stelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amenities */}
              <div>
                <label className="text-sm font-medium mb-3 block">Servizi</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {amenityOptions.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity}
                        checked={amenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <label
                        htmlFor={amenity}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
