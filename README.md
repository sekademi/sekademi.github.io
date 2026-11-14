## [Sekademi CyberSecurity](https://sekademi.github.io)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=fff)](#technology-stack)

**Sekademi** is a cybersecurity-focused blog and project showcase. It serves as a platform for sharing technical insights, write-ups, and showcasing innovative tools developed by the Sekademi team.

## 🚀 Quick Start

Ensure you have [Node.js](https://nodejs.org/) 22.12 or newer installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sekademi/sekademi.github.io.git
   cd sekademi.github.io
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🛠️ Technology Stack

| Category   | Technology                                                  |
| ---------- | ----------------------------------------------------------- |
| Framework  | [Astro 7](https://astro.build/)                             |
| Styling    | Native CSS (no UI or CSS framework)                         |
| Content    | Markdown, processed with [Sätteri](https://satteri.dev/)    |
| Codeblocks | [Expressive Code](https://expressive-code.com/)             |
| Math       | [Temml](https://temml.org/) (MathML)                        |

## 📂 Project Structure

- `src/content/blog/<slug>/index.md`: blog posts. Cover images live in `src/assets/covers/`.
- `src/content/projects/`: project showcase entries.
- `src/content/authors/`: profiles of the Sekademi team members.
- `src/pages/`: home, about, blog, projects, authors and tag pages.
- `src/consts.ts`: site title, navigation and social links.
- `public/`: favicons, web manifest and the default social image.

### Writing a post

```markdown
---
title: 'My post'
description: 'One sentence summary.'
date: 2026-11-14
tags: ['Tag']
image: '../../../assets/covers/my-cover.jpg'
authors: ['fr0stb1rd']
---
```

Callouts use directives: `:::note`, `:::tip`, `:::warning` and `:::caution`. `authors` is required and must match a file name in `src/content/authors/`.

## 🔗 Links

- **Website**: [sekademi.github.io](https://sekademi.github.io)
- **GitHub**: [@sekademi](https://github.com/sekademi)
- **LinkedIn**: [Sekademi](https://linkedin.com/company/sekademi)
- **Email**: [sekademicyber@gmail.com](mailto:sekademicyber@gmail.com)

Built by [Sekademi](https://github.com/sekademi) using the [astro-erudite](https://github.com/jktrn/astro-erudite) template (v2).
