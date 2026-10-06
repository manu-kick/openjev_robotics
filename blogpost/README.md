# PlayJev × LIBERO — interactive blog post

Static editorial site. No build step and no backend are required.
Mathematical notation is authored in LaTeX and rendered client-side with MathJax from
the jsDelivr CDN, so the published page needs internet access for first-page rendering.

## Local preview

From the repository root:

```bash
python3 -m http.server 8080 --directory blogpost
```

Then open `http://127.0.0.1:8080/`.

## Hosting

Upload the complete `blogpost/` directory to any static host. Keep the `assets/`
directory next to `index.html`; all runtime URLs are relative.

The three links at the bottom point to files one level above `blogpost/`. If the post
is deployed as a standalone directory rather than as part of the repository site,
replace those links with the public URLs for the paper, simulator documentation and
project repository.
