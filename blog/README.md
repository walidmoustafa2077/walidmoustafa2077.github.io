# Blog

One HTML file per post. The listing page (`/blog.html`) is generated from the
`<meta>` tags in those files — there is no CMS and no database.

```
blog/
├── _template.html                  ← copy this to start a post
├── your-post-slug.html             ← a published post
├── posts.json                      ← generated (do not edit)
├── posts.js                        ← generated (do not edit)
└── README.md
```

## Writing a post

1. Copy the template:

   ```bash
   cp blog/_template.html blog/where-the-bugs-live.html
   ```

   The file name is the URL: `/blog/where-the-bugs-live.html`.

2. Edit the head. Only two tags are required beyond the description:

   ```html
   <title>Where the bugs live — Walid Mostafa</title>
   <meta name="description" content="One sentence, shown on the card.">
   <meta name="post:category" content="Development">
   <meta name="post:date" content="2026-11-08">
   <meta name="post:tags" content="C#, Debugging">
   <meta name="post:cover" content="../assets/shots/nexacv.jpg">
   ```

   | Tag | Required | Notes |
   | --- | --- | --- |
   | `post:category` | yes | Drives the filter chips and their counts |
   | `post:date` | yes | `YYYY-MM-DD`, used for sorting |
   | `description` | yes | Excerpt on the card |
   | `post:tags` | no | Comma separated |
   | `post:cover` | no | Path relative to the post file; omit for generated art |
   | `post:featured` | no | `true` / `false` |
   | `post:draft` | no | `true` hides it from the index |

3. Write the article inside `<article class="post-body">`. Use `h2`/`h3`,
   paragraphs, lists, `<pre><code>` blocks, `<blockquote>`, `<figure>`.

   Escape `<` and `&` inside code blocks (`List&lt;T&gt;`).

4. Rebuild the index:

   ```bash
   node scripts/build-blog.js     # or: npm run blog
   ```

## Publishing

Push the post. `.github/workflows/blog-index.yml` runs the builder and commits
`blog/posts.json` + `blog/posts.js` back to `main`, which triggers the normal
GitHub Pages deploy. Nothing else to wire up.

## How detection works

`scripts/build-blog.js` scans `blog/*.html`, skipping:

- files starting with `_` (so `_template.html` is never indexed),
- files starting with `.`,
- `index.html`.

For each post it reads the `<title>`, the `description`, the `post:*` tags, and
counts words inside `<article>` to estimate reading time (220 words/min). Images
declared in `post:cover` or `og:image` are resolved relative to the post file;
a missing image falls back to the generated cover art in `blog.css`.

Output is written only when it changes, so the workflow does not create empty
commits.
