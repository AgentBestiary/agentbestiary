import os, subprocess, textwrap

CHROME = os.path.expanduser("~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome")
OUT = "/home/ubuntu/projects/mint3/art/preview"
os.makedirs(OUT, exist_ok=True)

TIER_COL = {"Common": "#8b95a7", "Uncommon": "#5ce1e6", "Rare": "#7c9bff", "Epic": "#c39bff", "Legendary": "#ffd166"}


def creature(body_grad=("#f2f6ff", "#9fb3d1"), eye="#5ce1e6", outline="#0b1020"):
    """Pengu silhouette, 1024 canvas."""
    return f'''
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="{body_grad[0]}"/><stop offset="1" stop-color="{body_grad[1]}"/>
      </linearGradient>
      <radialGradient id="belly" cx="0.5" cy="0.35" r="0.7">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="1" stop-color="#dfe8f7" stop-opacity="0.1"/>
      </radialGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
    </defs>
    <ellipse cx="512" cy="760" rx="230" ry="42" fill="#000" opacity="0.35" filter="url(#soft)"/>
    <!-- feet -->
    <path d="M382 742 q-46 12 -58 34 q60 16 104 -6 z" fill="{body_grad[1]}" stroke="{outline}" stroke-width="3"/>
    <path d="M642 742 q46 12 58 34 q-60 16 -104 -6 z" fill="{body_grad[1]}" stroke="{outline}" stroke-width="3"/>
    <!-- body -->
    <path d="M512 236 c132 0 208 108 208 248 c0 158 -92 268 -208 268 c-116 0 -208 -110 -208 -268 c0 -140 76 -248 208 -248 z"
          fill="url(#body)" stroke="{outline}" stroke-width="6"/>
    <path d="M512 300 c86 0 138 86 138 196 c0 122 -62 200 -138 200 c-76 0 -138 -78 -138 -200 c0 -110 52 -196 138 -196 z"
          fill="url(#belly)" opacity="0.55"/>
    <!-- wings -->
    <path d="M320 420 q-52 116 -6 226 q40 -96 74 -150 z" fill="{body_grad[1]}" opacity="0.9" stroke="{outline}" stroke-width="4"/>
    <path d="M704 420 q52 116 6 226 q-40 -96 -74 -150 z" fill="{body_grad[1]}" opacity="0.9" stroke="{outline}" stroke-width="4"/>
    <!-- eyes -->
    <circle cx="430" cy="452" r="30" fill="#0b1020"/>
    <circle cx="594" cy="452" r="30" fill="#0b1020"/>
    <circle cx="430" cy="452" r="12" fill="{eye}" filter="url(#glow)"/>
    <circle cx="594" cy="452" r="12" fill="{eye}" filter="url(#glow)"/>
    <circle cx="421" cy="443" r="5" fill="#fff" opacity="0.9"/>
    <circle cx="585" cy="443" r="5" fill="#fff" opacity="0.9"/>
    <!-- beak -->
    <path d="M512 486 q34 10 34 34 q0 26 -34 34 q-34 -8 -34 -34 q0 -24 34 -34 z" fill="#ff9f43" stroke="#c9761f" stroke-width="3"/>
    <path d="M512 520 q18 6 0 14 q-18 -8 0 -14 z" fill="#c9761f" opacity="0.6"/>
    '''


def style_a(species="pengu", tier="Epic", handle="specimen_one", tid=12, eye="#5ce1e6"):
    col = TIER_COL[tier]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#080b14"/><stop offset="0.55" stop-color="#101a2e"/><stop offset="1" stop-color="#0a0f1c"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.42" r="0.55">
      <stop offset="0" stop-color="{col}" stop-opacity="0.34"/><stop offset="1" stop-color="{col}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7cf9ff"/><stop offset="0.5" stop-color="{col}"/><stop offset="1" stop-color="#a78bfa"/>
    </linearGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="#ffffff" opacity="0.035"/>
    </pattern>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#halo)"/>
  <g opacity="0.5" stroke="#2a3550" stroke-width="1">
    {''.join(f'<line x1="{x}" y1="0" x2="{x}" y2="1024"/>' for x in range(64, 1024, 64))}
    {''.join(f'<line x1="0" y1="{y}" x2="1024" y2="{y}"/>' for y in range(64, 1024, 64))}
  </g>
  {creature(eye=eye)}
  <!-- card -->
  <rect x="40" y="40" width="944" height="944" rx="42" fill="none" stroke="url(#frame)" stroke-width="4"/>
  <rect x="56" y="56" width="912" height="912" rx="34" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5"/>
  <g stroke="url(#frame)" stroke-width="6" stroke-linecap="round">
    <path d="M40 150 L40 40 L150 40"/><path d="M874 40 L984 40 L984 150"/>
    <path d="M984 874 L984 984 L874 984"/><path d="M150 984 L40 984 L40 874"/>
  </g>
  <text x="96" y="128" font-family="monospace" font-size="26" letter-spacing="8" fill="#c9d6ee" opacity="0.85">AGENT BESTIARY</text>
  <g>
    <rect x="748" y="96" width="192" height="52" rx="26" fill="{col}" opacity="0.16" stroke="{col}" stroke-opacity="0.7"/>
    <text x="844" y="131" font-family="monospace" font-size="24" letter-spacing="3" fill="{col}" text-anchor="middle">{tier.upper()}</text>
  </g>
  <text x="96" y="880" font-family="monospace" font-size="96" fill="#f2f6ff" opacity="0.95">#{tid:04d}</text>
  <text x="96" y="928" font-family="monospace" font-size="30" fill="{col}" opacity="0.95">@{handle}</text>
  <text x="928" y="928" font-family="monospace" font-size="22" fill="#8b95a7" text-anchor="end">BSC · 5000</text>
  <rect width="1024" height="1024" fill="url(#scan)"/>
  <rect width="1024" height="1024" fill="url(#vig)"/>
</svg>'''


def style_b(tier="Rare", handle="specimen_one", tid=12, eye="#7c9bff"):
    col = TIER_COL[tier]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="spot" cx="0.5" cy="0.38" r="0.62">
      <stop offset="0" stop-color="#1a2334"/><stop offset="1" stop-color="#04060b"/>
    </radialGradient>
    <linearGradient id="metal" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#e8eefb"/><stop offset="0.45" stop-color="#9aa8c2"/><stop offset="1" stop-color="#4a5570"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#spot)"/>
  <text x="512" y="640" font-family="monospace" font-size="440" fill="#ffffff" opacity="0.045" text-anchor="middle">{tid:04d}</text>
  {creature(body_grad=("#e8eefb", "#6f7c96"), eye=eye, outline="#0a0e18")}
  <g stroke="#ffffff" stroke-opacity="0.5" stroke-width="1.5" fill="none">
    <path d="M64 120 L64 64 L120 64"/><path d="M904 64 L960 64 L960 120"/>
    <path d="M960 904 L960 960 L904 960"/><path d="M120 960 L64 960 L64 904"/>
  </g>
  <text x="96" y="132" font-family="monospace" font-size="22" letter-spacing="6" fill="#9aa8c2">SPECIMEN / BSC</text>
  <text x="928" y="132" font-family="monospace" font-size="22" letter-spacing="4" fill="{col}" text-anchor="end">{tier.upper()}</text>
  <line x1="96" y1="852" x2="928" y2="852" stroke="#ffffff" stroke-opacity="0.15"/>
  <text x="96" y="908" font-family="monospace" font-size="34" fill="#e8eefb">#{tid:04d}</text>
  <text x="928" y="908" font-family="monospace" font-size="28" fill="{col}" text-anchor="end">@{handle}</text>
  <text x="96" y="946" font-family="monospace" font-size="18" letter-spacing="3" fill="#6f7c96">PENGU · LASER · NONE · ORB</text>
</svg>'''


def style_c(tier="Uncommon", handle="specimen_one", tid=12):
    col = TIER_COL[tier]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="4" fill="#0b0b0f" opacity="0.35"/>
    </pattern>
  </defs>
  <rect width="1024" height="1024" fill="{col}"/>
  <rect width="1024" height="1024" fill="url(#dots)"/>
  <g transform="translate(512 512)">
    <rect x="-300" y="-300" width="600" height="600" rx="60" fill="#0b0b0f" stroke="#ffffff" stroke-width="18"/>
    <text x="0" y="250" font-family="monospace" font-size="120" fill="{col}" text-anchor="middle" opacity="0.25">{tid:04d}</text>
  </g>
  <g transform="translate(0 20) scale(0.92) translate(44 -10)">
    {creature(body_grad=("#ffffff", "#cfd8ea"), eye="{col}", outline="#0b0b0f")}
  </g>
  <g transform="rotate(-6 512 176)">
    <rect x="252" y="120" width="520" height="88" rx="18" fill="#0b0b0f"/>
    <text x="512" y="180" font-family="monospace" font-size="46" letter-spacing="6" fill="{col}" text-anchor="middle">BESTIARY</text>
  </g>
  <rect x="72" y="836" width="880" height="112" rx="22" fill="#0b0b0f"/>
  <text x="104" y="906" font-family="monospace" font-size="52" fill="#ffffff">#{tid:04d}</text>
  <text x="920" y="906" font-family="monospace" font-size="34" fill="{col}" text-anchor="end">@{handle}</text>
</svg>'''


VARIANTS = [("A-holo", style_a()), ("B-void", style_b()), ("C-sticker", style_c())]

for name, svg in VARIANTS:
    html = f"<html><body style='margin:0;background:#000'>{svg}</body></html>"
    hp = f"{OUT}/{name}.html"
    open(hp, "w").write(html)
    png = f"{OUT}/{name}.png"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                    "--window-size=1024,1024", f"--screenshot={png}", f"file://{hp}"],
                   check=True, capture_output=True)
    print("ok", png, os.path.getsize(png) // 1024, "KB")
