# SwapWord POC — Anti-VERY

A no-framework, static HTML/CSS/JavaScript prototype.

## Files

- `index.html` — screens and markup
- `style.css` — visual styling and animations
- `app.mjs` — game timer, answer validation, score and screen flow
- `tasks.json` — hardcoded Anti-VERY task data

## Run locally

Because the game fetches `tasks.json`, serve the folder over HTTP rather than opening `index.html` directly.

### Option A: VS Code

Open `poc/` in VS Code and use the **Live Server** extension.

### Option B: Python

From inside this folder, run:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Publish

1. Commit and push the `poc/` folder to your GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project**, connect the repository, and select the repository.
3. Set the publish directory to `poc`. No build command is needed.
4. Deploy. Netlify will provide a public URL.

You can also use GitHub Pages, but check that the site is configured to publish from a source that includes the `poc/` directory.

## Notes

- Correct answers are matched against `validAnswers`, ignoring capitalization, outer spaces, repeated spaces, and trailing punctuation.
- Each correct answer awards 10 points.
- Questions are shuffled for each game. Once the deck is exhausted, it reshuffles to keep a full 60-second round possible.
- This is a client-side POC: answers and task data are visible in the browser and there is no server-side score storage.
