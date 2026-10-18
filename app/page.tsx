import { Hero } from '@/components/Hero'
import { SearchBar } from '@/components/SearchBar'
import { FeaturedFarms } from '@/components/FeaturedFarms'
import { ProduceSection } from '@/components/ProduceSection'
import { PromiseBanner } from '@/components/PromiseBanner'
import { HarvestCalendar } from '@/components/HarvestCalendar'

export default function HomePage() {
  return (
    <>
      <Hero />
      <SearchBar />

      <section className="section intro-grid" id="story">
        <div>
          <p className="section-kicker">Travel that gives back</p>
          <h2>
            Meet the hands
            <br />
            behind the harvest.
          </h2>
        </div>
        <div className="intro-copy">
          <p>
            AgriTrails connects curious city travellers with farming families across Maharashtra.
            Stay a little slower, learn something real, and make sure your money goes where it
            matters.
          </p>
          <div className="stat-row">
            <div>
              <strong>100%</strong>
              <span>direct to farmers</span>
            </div>
            <div>
              <strong>48+</strong>
              <span>local experiences</span>
            </div>
            <div>
              <strong>4.9/5</strong>
              <span>guest happiness</span>
            </div>
          </div>
        </div>
      </section>

      <FeaturedFarms />
      <ProduceSection />
      <PromiseBanner />
      <HarvestCalendar />
    </>
  )
}
