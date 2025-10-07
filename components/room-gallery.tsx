"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react"

// Sample room data - in a real app this would come from props or API
const roomImages = [
  "/luxury-hotel-room-with-panoramic-view.jpg",
  "/elegant-hotel-bathroom-with-marble-finishes.jpg",
  "/hotel-room-balcony-with-tuscany-landscape-view.jpg",
  "/hotel-room-interior-with-traditional-italian-decor.jpg",
  "/hotel-room-bed-with-luxury-linens-and-pillows.jpg",
]

interface RoomGalleryProps {
  roomId: string
}

export function RoomGallery({ roomId }: RoomGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % roomImages.length)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + roomImages.length) % roomImages.length)
  }

  return (
    <>
      <div className="relative mb-8">
        {/* Main Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
          <Image
            src={roomImages[currentImage] || "/placeholder.svg"}
            alt={`Camera ${roomId} - Immagine ${currentImage + 1}`}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
          />

          {/* Navigation Arrows */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
            onClick={prevImage}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
            onClick={nextImage}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Fullscreen Button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          {/* Image Counter */}
          <Badge className="absolute bottom-4 right-4 bg-black/70 text-white">
            {currentImage + 1} / {roomImages.length}
          </Badge>
        </div>

        {/* Thumbnail Navigation */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {roomImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`relative flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentImage
                  ? "border-primary shadow-lg scale-105"
                  : "border-transparent hover:border-primary/50"
              }`}
            >
              <Image src={image || "/placeholder.svg"} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <Image
              src={roomImages[currentImage] || "/placeholder.svg"}
              alt={`Camera ${roomId} - Fullscreen`}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
            />

            {/* Close Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Navigation in Fullscreen */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={prevImage}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={nextImage}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
