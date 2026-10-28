# Delta Robot · Academic Project Showcase

COEP Technological University, Pune · Department of Robotics and Artificial Intelligence
Team: Prathmesh Lasankar and Mangesh · Guide: Dr. S. S. Ohol

A static, mobile-friendly website for the Delta Robot project. Plain HTML, CSS and JavaScript. No build step, no backend, no API keys.

## Status and honesty note
The physical robot, CAD model and measured dimensions do **not** exist yet. The 3D model on the site is an **illustrative conceptual model** generated in code with placeholder proportions. The animation runs only in the browser and is not a physical robot. The demo uses a standard delta-robot inverse-kinematics formula with placeholder arm lengths; the project's own kinematic model is future work. The site contains no results, specifications or performance figures.

## Files
- `index.html` – page content (must stay at the repository root)
- `style.css` – styling
- `script.js` – navigation, scroll effects, 3D model and controls
- `README.md` – this file

## How the 3D model loads
Three.js r128 is loaded from the public cdnjs CDN. If it cannot load or WebGL is unavailable, a simplified 2D animated illustration is shown instead. Rotate with drag, zoom with scroll or pinch, or use the arrow keys and `+` / `-` while the model is focused.

## Publish on GitHub Pages
1. Open your repository on github.com.
2. Click **Add file → Upload files**, drag in `index.html`, `style.css`, `script.js` and `README.md`, then click **Commit changes**.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose branch **main** and folder **/ (root)**, then click **Save**.
5. Wait 1–2 minutes and refresh. The link appears at the top: `https://prathmeshlasankar.github.io/Delta_Robot/`
6. Open the link on your phone, then use it to make your QR code.

## Credits
Three.js (MIT licence). All diagrams and geometry are original.
