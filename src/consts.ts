import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'Sekademi CyberSecurity',
  description:
    'Sharing Knowledge, Building the Future',
  href: 'https://sekademi.github.io',
  author: 'Sekademi',
  locale: 'en-US',
  featuredPostCount: 2,
  postsPerPage: 3,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: 'blog',
  },
  {
    href: '/projects',
    label: 'projects',
  },
  {
    href: '/about',
    label: 'about',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/sekademi',
    label: 'GitHub',
  },
  {
    href: 'https://linkedin.com/company/sekademi',
    label: 'LinkedIn',
  },
  {
    href: 'mailto:sekademicyber@gmail.com',
    label: 'Email',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
