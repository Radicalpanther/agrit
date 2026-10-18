'use client'

import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronDown, Compass, MapPin, Search } from 'lucide-react'

export function SearchBar() {
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const where = formData.get('where')?.toString().trim()
    const when = formData.get('when')?.toString().trim()
    const experience = formData.get('experience')?.toString().trim()

    const params = new URLSearchParams()
    if (where) params.set('where', where)
    if (when) params.set('when', when)
    if (experience) params.set('experience', experience)

    const queryString = params.toString()
    router.push(queryString ? `/explore?${queryString}` : '/explore')
  }

  return (
    <div className="search-wrap">
      <form className="search-bar" onSubmit={handleSubmit}>
        <label>
          <MapPin size={18} />
          <span>Where</span>
          <input
            name="where"
            placeholder="Maharashtra, Kerala, Punjab..."
            defaultValue=""
          />
        </label>
        <label>
          <CalendarDays size={18} />
          <span>When</span>
          <input
            name="when"
            placeholder="Any month or season"
            defaultValue=""
          />
        </label>
        <label>
          <Compass size={18} />
          <span>Experience</span>
          <select name="experience" defaultValue="">
            <option value="">Any activity</option>
            <option value="farm stay">Farm stay</option>
            <option value="fruit picking">Fruit picking</option>
            <option value="hurda">Hurda party</option>
            <option value="jaggery">Jaggery making</option>
            <option value="vineyard">Vineyard stay</option>
            <option value="cattle tending">Cattle tending</option>
            <option value="spice plantation">Spice plantation</option>
            <option value="mustard harvest">Mustard harvest</option>
          </select>
          <ChevronDown size={15} />
        </label>
        <button className="search-btn" type="submit">
          <Search size={19} />
          <span>Search farms</span>
        </button>
      </form>
    </div>
  )
}
