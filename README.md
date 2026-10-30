# QSX AI website

Vanilla HTML, CSS and JavaScript. No build step, no dependencies. All asset paths are relative, so the site works from a GitHub Pages repository subpath (e.g. `https://qsxai.github.io/qsx-ai-site/`).

## Structure

```
index.html        page markup (English defaults, works without JS)
css/styles.css    design system, mobile-first, RTL via logical properties
js/config.js      YOUR contact details (edit this)
js/i18n.js        English + Arabic copy
js/main.js        language switch, mobile menu, reveals, hero scene
assets/favicon.svg
```

## Configure before publishing

Edit `js/config.js`:

- `email`: your contact email (the form opens the visitor's mail app addressed to it)
- `whatsapp`: digits only with country code, e.g. `201001234567`

Until these are filled in, the contact section shows a clearly marked placeholder.

## Edit copy

Every visible string lives in `js/i18n.js` (`en` and `ar`). Keys match the `data-i18n` attributes in `index.html`.

## Deploy on GitHub Pages

1. Copy these files into the root of the `qsx-ai-site` repository (replacing the old files).
2. `git add -A && git commit -m "Redesign site" && git push`
3. In the repo: Settings → Pages → Source: "Deploy from a branch", Branch: `main` (or your default), folder `/ (root)`.
4. Wait about a minute, then open `https://qsxai.github.io/qsx-ai-site/`.
