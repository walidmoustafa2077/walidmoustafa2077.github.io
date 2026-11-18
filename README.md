# walidmoustafa2077.github.io

Source for **[walidmoustafa2077.github.io](https://walidmoustafa2077.github.io/)** — the personal portfolio of Walid Mostafa, full-stack developer.

Static HTML, CSS, and vanilla JavaScript. No build step for the pages themselves; the only script is `scripts/build-blog.js`, which indexes `blog/*.html` into `blog/posts.json`.

## Structure

```
index.html          Home
projects.html       Project index + detail modals
blog.html           Post index
blog/               Posts (one HTML file each) + generated posts.json
styles.css          Shared design system and page styles
projects.css        Project page styles
blog.css            Blog page styles
script.js           Shared behaviour: nav, reveal, modals, forms
projects.js         Project data and rendering
blog.js             Blog filtering, sorting, paging
readmes.js          Cached README content for project modals
scripts/build-blog.js
```

## Adding a post

1. Copy `blog/_template.html` to `blog/<slug>.html` and fill in the front matter.
2. Run `node scripts/build-blog.js`.
3. Commit both the post and the regenerated `blog/posts.json`.

The `Build blog index` workflow does step 2 automatically on push.

## Contact and subscribe forms

Both forms POST to [FormSubmit](https://formsubmit.co) and are relayed to the owner's inbox. If the relay is unreachable, the page falls back to opening the visitor's mail client, so no submission dead-ends.

## Design

`DESIGN.md` documents the tokens, type scale, and layout rules.
