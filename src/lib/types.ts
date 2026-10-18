export type ProjectLinks = { live?: string; repo?: string; caseStudy?: string }

export type ProjectMedia = {
  /** Still image shown in the frame (auto-detected from public/media/<slug>/poster.*). */
  poster?: string
  /** Short muted video loop for the frame (auto-detected from public/media/<slug>/loop.*). */
  loop?: string
  gallery: string[]
}

export type Project = {
  slug: string
  title: string
  tagline: string
  category: string
  room?: string
  order?: number
  featured: boolean
  year: number
  role: string
  tech: string[]
  links: ProjectLinks
  media: ProjectMedia
  allowEmbed: boolean
  /** Markdown body. */
  body: string
}
