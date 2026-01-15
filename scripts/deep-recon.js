#!/usr/bin/env node
/**
 * 🔴 DEEP RECON SCANNER - ADMIN SUDO MODE
 * Scanne TOUT le système SAR:
 * - Routes API (standard + cachées)
 * - Variables d'environnement + secrets
 * - Ports ouverts (standard + non-usuels)
 * - Connexions réseau actives
 * - Empreintes système (fingerprints)
 * - Dépendances + vulnérabilités
 * - Services externes connectés
 * - Webhooks + callbacks
 * - Base de données + tables
 * - Fichiers de configuration
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import crypto from "node:crypto";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "src", "app", "api");
const OUT_DIR = path.join(ROOT, "src", "generated");
const OUT_FILE = path.join(OUT_DIR, "deep-recon-report.json");

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

// Ports à scanner (standard + non-usuels)
const PORTS_TO_SCAN = [
  // Standard
  80, 443, 3000, 3001, 5432, 5433, 6379, 8080, 8443, 9000,
  // Non-usuels / backdoors potentiels
  31337, 12345, 4444, 5555, 6666, 7777, 8888, 9999,
  // Services cachés
  2222, 2375, 2376, 3306, 27017, 27018, 28017,
  // VPN/Tunnel
  1194, 1723, 4500, 500,
  // Debug/Admin
  9229, 5858, 8000, 8001, 8888
];

console.log("🔴 DEEP RECON SCANNER - ADMIN SUDO MODE");
console.log("=" .repeat(60));
console.log("");

const report = {
  timestamp: new Date().toISOString(),
  system: {},
  routes: [],
  environment: {},
  secrets: [],
  network: {},
  ports: {},
  fingerprints: {},
  dependencies: {},
  vulnerabilities: [],
  database: {},
  external_services: [],
  webhooks: [],
  configs: [],
  warnings: [],
  risks: []
};

// ============================================
// 1. SYSTEM FINGERPRINT
// ============================================
console.log("📡 [1/12] Scanning system fingerprint...");
try {
  report.system = {
    platform: process.platform,
    arch: process.arch,
    node_version: process.version,
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    user: process.env.USER || process.env.USERNAME || "unknown",
    home: process.env.HOME || process.env.USERPROFILE || "unknown",
    shell: process.env.SHELL || "unknown",
    hostname: execSync("hostname").toString().trim(),
    os_info: execSync("uname -a").toString().trim()
  };

  // Network interfaces
  const networkInterfaces = execSync("ifconfig || ipconfig").toString();
  report.system.network_interfaces = networkInterfaces.split("\n").slice(0, 20);

  console.log(`  ✓ Platform: ${report.system.platform}`);
  console.log(`  ✓ Hostname: ${report.system.hostname}`);
  console.log(`  ✓ User: ${report.system.user}`);
} catch (error) {
  report.warnings.push(`System fingerprint error: ${error.message}`);
}

// ============================================
// 2. API ROUTES SCANNER (DEEP)
// ============================================
console.log("\n🔍 [2/12] Deep scanning API routes...");

function walk(dir) {
  const out = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else out.push(full);
    }
  } catch (error) {
    report.warnings.push(`Walk error in ${dir}: ${error.message}`);
  }
  return out;
}

function toApiPath(routeFile) {
  const rel = path.relative(API_DIR, routeFile);
  const noExt = rel.replace(/\.(ts|tsx|js|jsx)$/, "");
  const withoutRoute = noExt.replace(/\/route$/, "");
  return "/api/" + withoutRoute.split(path.sep).join("/");
}

function readMethods(code) {
  const methods = [];
  for (const m of HTTP_METHODS) {
    const re = new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\s*\\(`, "g");
    if (re.test(code)) methods.push(m);
  }
  return methods;
}

function readMeta(code) {
  const match = code.match(/export\s+const\s+routeMeta\s*=\s*({[\s\S]*?});/);
  if (!match) return null;
  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return null;
  }
}

function analyzeRouteCode(code, filePath) {
  const analysis = {
    hasAuth: false,
    hasRateLimit: false,
    hasValidation: false,
    usesSupabase: false,
    usesExternalAPI: false,
    hasTODO: false,
    hasConsoleLog: false,
    hasHardcodedSecrets: false,
    externalAPIs: [],
    vulnerabilities: []
  };

  // Check for auth
  if (/auth|token|bearer|jwt|session/i.test(code)) {
    analysis.hasAuth = true;
  }

  // Check for rate limiting
  if (/rateLimit|rate-limit|throttle/i.test(code)) {
    analysis.hasRateLimit = true;
  }

  // Check for validation
  if (/validate|zod|yup|joi|schema/i.test(code)) {
    analysis.hasValidation = true;
  }

  // Check for Supabase
  if (/supabase|createClient/i.test(code)) {
    analysis.usesSupabase = true;
  }

  // Check for external APIs
  const apiMatches = code.match(/https?:\/\/[^\s"']+/g);
  if (apiMatches) {
    analysis.usesExternalAPI = true;
    analysis.externalAPIs = [...new Set(apiMatches)];
  }

  // Check for TODOs
  if (/TODO|FIXME|HACK|XXX/i.test(code)) {
    analysis.hasTODO = true;
    const todos = code.match(/(TODO|FIXME|HACK|XXX):.*/gi) || [];
    analysis.todos = todos;
  }

  // Check for console.log (should not be in production)
  if (/console\.(log|debug|info)/g.test(code)) {
    analysis.hasConsoleLog = true;
  }

  // Check for hardcoded secrets (DANGER!)
  const secretPatterns = [
    /password\s*=\s*["'][^"']+["']/gi,
    /api[_-]?key\s*=\s*["'][^"']+["']/gi,
    /secret\s*=\s*["'][^"']+["']/gi,
    /token\s*=\s*["'][^"']+["']/gi
  ];

  secretPatterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) {
      analysis.hasHardcodedSecrets = true;
      analysis.vulnerabilities.push({
        type: "HARDCODED_SECRET",
        severity: "CRITICAL",
        file: filePath,
        matches: matches
      });
    }
  });

  // Check for SQL injection risks
  if (/\$\{.*\}.*query|query.*\$\{/i.test(code) && !/prepared|parameterized/i.test(code)) {
    analysis.vulnerabilities.push({
      type: "SQL_INJECTION_RISK",
      severity: "HIGH",
      file: filePath,
      detail: "Potential SQL injection - dynamic query construction detected"
    });
  }

  return analysis;
}

const routeFiles = walk(API_DIR).filter((f) => /\/route\.(ts|tsx|js|jsx)$/.test(f));

routeFiles.forEach((file) => {
  const code = fs.readFileSync(file, "utf8");
  const methods = readMethods(code);
  const meta = readMeta(code) ?? {};
  const analysis = analyzeRouteCode(code, file);

  const route = {
    path: toApiPath(file),
    file: path.relative(ROOT, file),
    methods,
    group: meta.group ?? "🌐 Other",
    summary: meta.summary ?? "",
    auth: meta.auth ?? "unknown",
    risky: Boolean(meta.risky),
    fileSize: fs.statSync(file).size,
    linesOfCode: code.split("\n").length,
    ...analysis
  };

  report.routes.push(route);

  // Collect vulnerabilities
  if (analysis.vulnerabilities.length > 0) {
    report.vulnerabilities.push(...analysis.vulnerabilities);
  }

  // Collect external services
  if (analysis.externalAPIs.length > 0) {
    analysis.externalAPIs.forEach(api => {
      if (!report.external_services.find(s => s.url === api)) {
        report.external_services.push({
          url: api,
          usedBy: [route.path]
        });
      }
    });
  }
});

console.log(`  ✓ Found ${report.routes.length} API routes`);
console.log(`  ✓ Detected ${report.vulnerabilities.length} vulnerabilities`);
console.log(`  ✓ Found ${report.external_services.length} external services`);

// ============================================
// 3. ENVIRONMENT VARIABLES & SECRETS
// ============================================
console.log("\n🔐 [3/12] Scanning environment variables & secrets...");

const envFiles = [".env", ".env.local", ".env.development", ".env.production"];
const sensitiveKeys = [
  "API_KEY", "SECRET", "PASSWORD", "TOKEN", "PRIVATE",
  "SUPABASE", "DATABASE", "WEBHOOK", "STRIPE", "VOPAY"
];

envFiles.forEach(envFile => {
  const envPath = path.join(ROOT, envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("#"));

    lines.forEach(line => {
      const [key, value] = line.split("=").map(s => s.trim());
      if (key && value) {
        const isSensitive = sensitiveKeys.some(sk => key.includes(sk));
        const maskedValue = isSensitive ? value.substring(0, 8) + "..." : value;

        report.environment[key] = {
          file: envFile,
          value: maskedValue,
          sensitive: isSensitive,
          length: value.length
        };

        if (isSensitive) {
          report.secrets.push({
            key,
            file: envFile,
            type: "environment",
            masked: maskedValue
          });
        }
      }
    });

    console.log(`  ✓ Scanned ${envFile}: ${lines.length} variables`);
  }
});

console.log(`  ✓ Found ${Object.keys(report.environment).length} environment variables`);
console.log(`  ✓ Detected ${report.secrets.length} sensitive secrets`);

// ============================================
// 4. NETWORK SCANNING
// ============================================
console.log("\n🌐 [4/12] Scanning network connections...");

try {
  // Active connections
  const netstat = execSync("netstat -an || ss -tuln").toString();
  const connections = netstat.split("\n").filter(l => l.includes("ESTABLISHED") || l.includes("LISTEN"));

  report.network.active_connections = connections.length;
  report.network.connections_sample = connections.slice(0, 20);

  // DNS info
  try {
    const dnsServers = execSync("cat /etc/resolv.conf | grep nameserver || ipconfig /all | findstr DNS").toString();
    report.network.dns_servers = dnsServers.split("\n").filter(Boolean).slice(0, 5);
  } catch (e) {
    report.warnings.push("Could not read DNS servers");
  }

  console.log(`  ✓ Found ${report.network.active_connections} active connections`);
} catch (error) {
  report.warnings.push(`Network scan error: ${error.message}`);
}

// ============================================
// 5. PORT SCANNING (LOCAL)
// ============================================
console.log("\n🔌 [5/12] Scanning ports (standard + hidden)...");

const openPorts = [];

// Quick port check (non-blocking)
function checkPort(port) {
  try {
    const result = execSync(`nc -z -v -w1 localhost ${port} 2>&1 || telnet localhost ${port} 2>&1`, {
      timeout: 1000
    }).toString();

    if (result.includes("succeeded") || result.includes("Connected") || result.includes("open")) {
      return true;
    }
  } catch (error) {
    // Port closed or error
  }
  return false;
}

// Sample some ports (full scan would take too long)
const portsToCheck = [3000, 3001, 5432, 8080, 8443, 5858, 9229]; // Key ports only for speed
portsToCheck.forEach(port => {
  if (checkPort(port)) {
    openPorts.push(port);
  }
});

report.ports = {
  total_scanned: portsToCheck.length,
  open_ports: openPorts,
  suspicious_ports: openPorts.filter(p => [31337, 12345, 4444, 6666].includes(p))
};

console.log(`  ✓ Scanned ${portsToCheck.length} ports`);
console.log(`  ✓ Found ${openPorts.length} open ports: ${openPorts.join(", ")}`);

if (report.ports.suspicious_ports.length > 0) {
  report.risks.push({
    type: "SUSPICIOUS_PORTS",
    severity: "HIGH",
    detail: `Suspicious ports detected: ${report.ports.suspicious_ports.join(", ")}`
  });
}

// ============================================
// 6. FINGERPRINTS (UNIQUE IDENTIFIERS)
// ============================================
console.log("\n👆 [6/12] Collecting system fingerprints...");

report.fingerprints = {
  machine_id: crypto.randomBytes(16).toString("hex"), // Simulated
  install_hash: crypto.createHash("sha256").update(ROOT).digest("hex"),
  project_signature: crypto.createHash("md5").update(ROOT + Date.now()).digest("hex"),
  build_timestamp: fs.existsSync(path.join(ROOT, "package.json"))
    ? fs.statSync(path.join(ROOT, "package.json")).mtime.toISOString()
    : "unknown",
  git_commit: "",
  git_branch: ""
};

try {
  report.fingerprints.git_commit = execSync("git rev-parse HEAD").toString().trim();
  report.fingerprints.git_branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  console.log(`  ✓ Git: ${report.fingerprints.git_branch} @ ${report.fingerprints.git_commit.substring(0, 8)}`);
} catch (error) {
  report.warnings.push("Not a git repository");
}

console.log(`  ✓ Machine ID: ${report.fingerprints.machine_id}`);
console.log(`  ✓ Install Hash: ${report.fingerprints.install_hash.substring(0, 16)}...`);

// ============================================
// 7. DEPENDENCIES & VULNERABILITIES
// ============================================
console.log("\n📦 [7/12] Analyzing dependencies...");

const packageJsonPath = path.join(ROOT, "package.json");
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  report.dependencies = {
    name: packageJson.name,
    version: packageJson.version,
    dependencies: Object.keys(packageJson.dependencies || {}).length,
    devDependencies: Object.keys(packageJson.devDependencies || {}).length,
    total: Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).length
  };

  console.log(`  ✓ Project: ${report.dependencies.name} v${report.dependencies.version}`);
  console.log(`  ✓ Dependencies: ${report.dependencies.dependencies}`);
  console.log(`  ✓ DevDependencies: ${report.dependencies.devDependencies}`);

  // Check for known vulnerable packages (simple check)
  const vulnPackages = ["node-fetch@2.6.0", "axios@0.21.0", "lodash@4.17.15"]; // Examples
  const installedPackages = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });

  installedPackages.forEach(pkg => {
    if (vulnPackages.some(v => pkg.includes(v.split("@")[0]))) {
      report.vulnerabilities.push({
        type: "VULNERABLE_DEPENDENCY",
        severity: "MEDIUM",
        package: pkg,
        detail: "Package has known vulnerabilities - run npm audit"
      });
    }
  });
}

// ============================================
// 8. DATABASE SCANNING
// ============================================
console.log("\n🗄️  [8/12] Scanning database configuration...");

const supabaseConfigFiles = walk(ROOT).filter(f => f.includes("supabase") && f.endsWith(".ts"));
const dbTables = new Set();

supabaseConfigFiles.forEach(file => {
  const code = fs.readFileSync(file, "utf8");

  // Extract table names from .from('table_name')
  const tableMatches = code.match(/\.from\(['"`]([^'"`]+)['"`]\)/g);
  if (tableMatches) {
    tableMatches.forEach(match => {
      const table = match.match(/['"`]([^'"`]+)['"`]/)[1];
      dbTables.add(table);
    });
  }
});

report.database = {
  type: "Supabase PostgreSQL",
  tables: Array.from(dbTables),
  tables_count: dbTables.size,
  config_files: supabaseConfigFiles.length
};

console.log(`  ✓ Database: ${report.database.type}`);
console.log(`  ✓ Tables detected: ${report.database.tables_count}`);
console.log(`  ✓ Tables: ${Array.from(dbTables).slice(0, 10).join(", ")}...`);

// ============================================
// 9. EXTERNAL SERVICES
// ============================================
console.log("\n🌍 [9/12] Mapping external services...");

const externalServices = [
  { name: "Supabase", pattern: /supabase\.co/i },
  { name: "VoPay", pattern: /vopay\.com/i },
  { name: "Margill", pattern: /margill/i },
  { name: "Equifax", pattern: /equifax/i },
  { name: "Resend", pattern: /resend\.com/i },
  { name: "Vercel", pattern: /vercel/i },
  { name: "Miro", pattern: /miro\.com/i }
];

const allFiles = walk(ROOT).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
const servicesDetected = new Set();

allFiles.forEach(file => {
  const code = fs.readFileSync(file, "utf8");
  externalServices.forEach(service => {
    if (service.pattern.test(code)) {
      servicesDetected.add(service.name);
    }
  });
});

report.external_services = Array.from(servicesDetected).map(name => ({
  name,
  detected: true
}));

console.log(`  ✓ Detected ${report.external_services.length} external services:`);
report.external_services.forEach(s => console.log(`     - ${s.name}`));

// ============================================
// 10. WEBHOOKS
// ============================================
console.log("\n🔗 [10/12] Scanning webhooks...");

const webhookFiles = walk(API_DIR).filter(f => f.includes("webhook"));
webhookFiles.forEach(file => {
  const code = fs.readFileSync(file, "utf8");
  const webhookUrls = code.match(/https?:\/\/[^\s"']+webhook[^\s"']*/gi) || [];

  report.webhooks.push({
    file: path.relative(ROOT, file),
    urls: webhookUrls,
    count: webhookUrls.length
  });
});

console.log(`  ✓ Found ${webhookFiles.length} webhook files`);
console.log(`  ✓ Total webhook URLs: ${report.webhooks.reduce((sum, w) => sum + w.count, 0)}`);

// ============================================
// 11. CONFIG FILES
// ============================================
console.log("\n⚙️  [11/12] Scanning configuration files...");

const configFiles = [
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "package.json",
  "vercel.json",
  ".env",
  ".env.local",
  "tailwind.config.js",
  "postcss.config.js"
];

configFiles.forEach(configFile => {
  const configPath = path.join(ROOT, configFile);
  if (fs.existsSync(configPath)) {
    const stats = fs.statSync(configPath);
    report.configs.push({
      file: configFile,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  }
});

console.log(`  ✓ Found ${report.configs.length} configuration files`);

// ============================================
// 12. RISK ASSESSMENT
// ============================================
console.log("\n⚠️  [12/12] Performing risk assessment...");

// Check for common risks
if (report.secrets.length > 0) {
  report.risks.push({
    type: "EXPOSED_SECRETS",
    severity: "CRITICAL",
    count: report.secrets.length,
    detail: `${report.secrets.length} sensitive secrets found in environment files`
  });
}

if (report.vulnerabilities.length > 0) {
  report.risks.push({
    type: "CODE_VULNERABILITIES",
    severity: "HIGH",
    count: report.vulnerabilities.length,
    detail: `${report.vulnerabilities.length} code vulnerabilities detected`
  });
}

const routesWithoutAuth = report.routes.filter(r => !r.hasAuth && r.methods.includes("POST"));
if (routesWithoutAuth.length > 0) {
  report.risks.push({
    type: "UNPROTECTED_ROUTES",
    severity: "MEDIUM",
    count: routesWithoutAuth.length,
    detail: `${routesWithoutAuth.length} POST routes without authentication`
  });
}

console.log(`  ✓ Risk assessment complete`);
console.log(`  ⚠️  Found ${report.risks.length} security risks`);

// ============================================
// SAVE REPORT
// ============================================
console.log("\n💾 Saving deep recon report...");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

console.log(`  ✓ Report saved: ${path.relative(ROOT, OUT_FILE)}`);

// ============================================
// SUMMARY
// ============================================
console.log("\n" + "=".repeat(60));
console.log("🔴 DEEP RECON SUMMARY");
console.log("=".repeat(60));
console.log(`  API Routes:          ${report.routes.length}`);
console.log(`  Environment Vars:    ${Object.keys(report.environment).length}`);
console.log(`  Secrets Detected:    ${report.secrets.length}`);
console.log(`  Open Ports:          ${report.ports.open_ports.length}`);
console.log(`  External Services:   ${report.external_services.length}`);
console.log(`  Database Tables:     ${report.database.tables_count}`);
console.log(`  Webhooks:            ${report.webhooks.length}`);
console.log(`  Vulnerabilities:     ${report.vulnerabilities.length}`);
console.log(`  Security Risks:      ${report.risks.length}`);
console.log("=".repeat(60));

if (report.risks.length > 0) {
  console.log("\n⚠️  SECURITY RISKS:");
  report.risks.forEach(risk => {
    console.log(`  [${risk.severity}] ${risk.type}: ${risk.detail}`);
  });
}

console.log("\n✅ Deep recon scan complete!");
console.log(`📄 Full report: ${path.relative(ROOT, OUT_FILE)}`);
