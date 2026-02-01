"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

export function VideoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const { t } = useLanguage()
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const videos = [
    {
      src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_uwJxwIgSNXE7LxMtzbcA92dJLQe9/UbPiKtLwe4tUdE56zyVnXb/public/videoTitle1.mp4",
      title: "B&B",
      description: "ALL 22 Suite & SPA LUXURY EXPERIENCE",
    },
    {
      src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_uwJxwIgSNXE7LxMtzbcA92dJLQe9/f3upmbuc_dbNB_E06ERvb-/public/videoTitle2.mp4",
      title: "Puglia",
      description: "Polignano a Mare",
    },
    {
      src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_uwJxwIgSNXE7LxMtzbcA92dJLQe9/RFxysHbEdAWlRxie2v1_RI/public/videoTitle3.mp4",
      title: "SPA",
      description: "ALL 22 Suite & SPA LUXURY EXPERIENCE",
    },
  ]

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length)
  }

  const togglePlayPause = () => {
    const currentVideo = videoRefs.current[currentIndex]
    if (currentVideo) {
      if (isPlaying) {
        currentVideo.pause()
        setIsPlaying(false)
      } else {
        currentVideo.play()
        setIsPlaying(true)
      }
    }
  }

  useEffect(() => {
    // Pause all videos except the current one
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex && isPlaying) {
          video.play().catch(() => {
            // Autoplay might be blocked, that's okay
          })
        } else {
          video.pause()
          video.currentTime = 0
        }
      }
    })
  }, [currentIndex, isPlaying])

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(nextSlide, 10000)
      return () => clearInterval(interval)
    }
  }, [isPlaying])

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t("AL 22 Suite & SPA LUXURY EXPERIENCE")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            {t("Video")}
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black">
            {videos.map((video, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el
                  }}
                  className="w-full h-full object-cover"
                  loop
                  muted
                  playsInline
                  poster={`/placeholder.svg?height=720&width=1280&text=${video.title}`}
                >
                  <source src={video.src} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                  <h3 className="text-white text-2xl md:text-3xl font-bold mb-2">{t(video.title)}</h3>
                  <p className="text-white/90 text-lg">{t(video.description)}</p>
                </div>
              </div>
            ))}

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm z-20"
              onClick={prevSlide}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm z-20"
              onClick={nextSlide}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm z-20"
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? "bg-primary w-8" : "bg-muted-foreground/30"
                }`}
                aria-label={`Go to video ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
