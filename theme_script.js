const fs = require('fs');
const path = 'e:/golf/client/src/organizer/style/OrganiserManage.css';
let css = fs.readFileSync(path, 'utf8');

// Replace the root block entirely
css = css.replace(/:root\s*\{[\s\S]*?\}/, `:root{
  --bg: var(--surface);
  --sideBg: var(--surface_container_lowest);
  --text: #ffffff;
  --muted: var(--on_surface_variant);

  --border: var(--outline_variant);
  --border2: var(--surface_container_highest);

  --shadowSm: var(--shadow-ambient);
  --shadowMd: var(--shadow-ambient);
  --shadowLg: var(--shadow-ambient);

  --rLg: var(--radius-xl);
  --rMd: var(--radius-lg);
  --rSm: var(--radius-lg);

  --focus: 0 0 0 3px var(--primary_container);

  --primary: var(--primary_fixed);
  --primaryHover: var(--primary_fixed);

  --danger: #FF0055;
  --dangerBg: rgba(255, 0, 85, 0.1);

  --tabRing: 0 0 0 2px var(--primary_fixed);
}`);

// Replace all backgrounds explicitly white to surface_container_low
css = css.replace(/background:\s*(#fff|#ffffff|rgba\(255,255,255,1\.?0*\))\s*;/gi, 'background: var(--surface_container_low);');
css = css.replace(/background:\s*rgba\(255,255,255,0?\.([^)]+)\)\s*;/gi, 'background: var(--surface_container_high);');
css = css.replace(/background:\s*#fafafa\s*;/gi, 'background: var(--surface_container_high);');
css = css.replace(/background:\s*#f8fafc\s*;/gi, 'background: var(--surface_container_highest);');

// Text colors
css = css.replace(/color:\s*#111827\s*;/gi, 'color: #FFFFFF;');
css = css.replace(/color:\s*#0f172a\s*;/gi, 'color: #FFFFFF;');
css = css.replace(/border-color:\s*#111827\s*;/gi, 'border-color: var(--primary_container);');

fs.writeFileSync(path, css);
console.log('OrganiserManage.css Dark Noir Theme Applied.');
