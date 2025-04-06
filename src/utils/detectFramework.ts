// utils/detectFramework.ts
import fs from "fs";
import path from "path";

export function detectFramework(projectPath: string): string {
  const files = fs.readdirSync(projectPath);

  if (files.includes("next.config.js")) return "nextjs";
  if (files.includes("package.json")) {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, "package.json"), "utf-8"));
    if (pkg.dependencies?.next) return "nextjs";
    if (pkg.dependencies?.react && pkg.scripts?.start) return "react";
    if (pkg.dependencies?.express) return "nodejs";
  }
  if (files.includes("manage.py")) return "django";
  if (files.includes("app.py") || files.includes("requirements.txt")) return "flask";

  return "unknown";
}
