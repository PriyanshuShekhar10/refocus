import sharp from "sharp";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const ROOT = process.cwd();
const WIDTH = 1200;
const HEIGHT = 630;
const BG = "#f7f8fa";

async function buildOgImage() {
  const logo = await sharp(join(ROOT, "assets/Logo.svg"))
    .resize(220, null, { fit: "inside" })
    .png()
    .toBuffer();

  const headerHeight = 96;
  const verticalPadding = 20;
  const maxDashboardWidth = WIDTH - 80;
  const maxDashboardHeight = HEIGHT - headerHeight - verticalPadding * 2;

  const sourceMeta = await sharp(join(ROOT, "assets/screenshots/image.png")).metadata();
  const sourceWidth = sourceMeta.width ?? 2940;
  const sourceHeight = sourceMeta.height ?? 1766;
  const aspect = sourceWidth / sourceHeight;

  let dashboardWidth = maxDashboardWidth;
  let dashboardHeight = Math.round(dashboardWidth / aspect);
  if (dashboardHeight > maxDashboardHeight) {
    dashboardHeight = maxDashboardHeight;
    dashboardWidth = Math.round(dashboardHeight * aspect);
  }

  const dashboard = await sharp(join(ROOT, "assets/screenshots/image.png"))
    .resize(dashboardWidth, dashboardHeight, { fit: "fill" })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logo).metadata();
  const logoWidth = logoMeta.width ?? 220;
  const logoHeight = logoMeta.height ?? 88;

  const dashboardTop = headerHeight + verticalPadding;
  const dashboardLeft = Math.round((WIDTH - dashboardWidth) / 2);
  const logoLeft = Math.round((WIDTH - logoWidth) / 2);
  const logoTop = Math.round((headerHeight - logoHeight) / 2);

  const roundedDashboard = await sharp(dashboard)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${dashboardWidth}" height="${dashboardHeight}">
            <rect x="0" y="0" width="${dashboardWidth}" height="${dashboardHeight}" rx="18" ry="18" fill="white"/>
          </svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const shadowSvg = Buffer.from(`<svg width="${dashboardWidth + 48}" height="${dashboardHeight + 48}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#0a0a0a" flood-opacity="0.14"/>
      </filter>
    </defs>
    <rect x="24" y="24" width="${dashboardWidth}" height="${dashboardHeight}" rx="18" ry="18" fill="white" filter="url(#shadow)"/>
  </svg>`);

  const shadowPlate = await sharp(shadowSvg).png().toBuffer();
  const shadowMeta = await sharp(shadowPlate).metadata();
  const shadowWidth = shadowMeta.width ?? dashboardWidth + 48;
  const shadowHeight = shadowMeta.height ?? dashboardHeight + 48;
  const shadowLeft = Math.round((WIDTH - shadowWidth) / 2);
  const shadowTop = dashboardTop - 24;

  const canvas = sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: BG,
    },
  });

  const output = await canvas
    .composite([
      { input: shadowPlate, left: shadowLeft, top: shadowTop },
      { input: roundedDashboard, left: dashboardLeft, top: dashboardTop },
      { input: logo, left: logoLeft, top: logoTop },
    ])
    .png()
    .toBuffer();

  return output;
}

const png = await buildOgImage();
const targets = [
  join(ROOT, "app/opengraph-image.png"),
  join(ROOT, "app/twitter-image.png"),
];

for (const target of targets) {
  await writeFile(target, png);
  console.log(`Wrote ${target}`);
}

console.log(`Generated ${WIDTH}x${HEIGHT} OG image`);
