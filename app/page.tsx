import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { RoomsPreview } from "@/components/rooms-preview"
import { StorySection } from "@/components/story-section"
import ReviewsSection from "@/components/ReviewsSection"
import { Footer } from "@/components/footer"
  import { VideoCarousel } from "@/components/video-carousel"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <StorySection />
      <VideoCarousel />
      <ServicesSection />
      <RoomsPreview />
      <ReviewsSection className="mb-16" />
      <Footer />
    </main>
  )
}
