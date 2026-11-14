import type { SvgComponent } from "astro/types"
import Email from "@/assets/icons/email.svg"
import GitHub from "@/assets/icons/github.svg"
import LinkedIn from "@/assets/icons/linkedin.svg"
import RSS from "@/assets/icons/rss.svg"

export const SITE = {
  title: "Sekademi CyberSecurity",
  description: "Sharing Knowledge, Building the Future",
  locale: "en-US",
  dir: "ltr",
  defaultPageImage: "/static/1200x630.png",
  defaultPostImage: "/static/1200x630.png",
} as const

export const NAVIGATION = [
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
]

export const SOCIALS: { href: string; label: string; icon: SvgComponent }[] = [
  { href: "https://github.com/sekademi", label: "GitHub", icon: GitHub },
  {
    href: "https://linkedin.com/company/sekademi",
    label: "LinkedIn",
    icon: LinkedIn,
  },
  { href: "mailto:sekademicyber@gmail.com", label: "Email", icon: Email },
  { href: "/rss.xml", label: "RSS", icon: RSS },
]
