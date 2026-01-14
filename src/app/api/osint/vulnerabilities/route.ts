// API: Vulnerability Scanner - Find Weaknesses
// POST /api/osint/vulnerabilities - Scan for exploitable vulnerabilities

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { osintAuthMiddleware } from '@/middleware/osint-auth'

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  // 🔐 Security: Check authentication
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError

  try {
    const { target, scan_level } = await request.json();

    const results: any = {
      timestamp: new Date().toISOString(),
      target,
      scan_level: scan_level || 'basic',
      vulnerabilities: [],
      risk_score: 0,
      summary: {}
    };

    // Run all vulnerability checks
    const checks = await Promise.all([
      checkSQLInjection(target),
      checkXSS(target),
      checkCommandInjection(target),
      checkPathTraversal(target),
      checkOpenRedirect(target),
      checkCSRF(target),
      checkSSRF(target),
      checkXXE(target),
      checkInsecureDeserialization(target),
      checkWeakCrypto(target),
      checkMissingSecurityHeaders(target),
      checkExposedCredentials(target),
      checkDefaultCredentials(target),
      checkOutdatedSoftware(target),
      checkOpenPorts(target)
    ]);

    // Flatten results
    checks.forEach(check => {
      if (check.vulnerabilities) {
        results.vulnerabilities.push(...check.vulnerabilities);
      }
    });

    // Calculate risk score
    results.risk_score = calculateRiskScore(results.vulnerabilities);

    // Summary by severity
    results.summary = {
      critical: results.vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').length,
      high: results.vulnerabilities.filter((v: any) => v.severity === 'HIGH').length,
      medium: results.vulnerabilities.filter((v: any) => v.severity === 'MEDIUM').length,
      low: results.vulnerabilities.filter((v: any) => v.severity === 'LOW').length,
      info: results.vulnerabilities.filter((v: any) => v.severity === 'INFO').length,
      total: results.vulnerabilities.length
    };

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 1. SQL Injection Detection
async function checkSQLInjection(target: string): Promise<any> {
  const vulns: any[] = [];
  const payloads = ["'", "1' OR '1'='1", "'; DROP TABLE users--", "' UNION SELECT NULL--"];

  try {
    const { stdout } = await execAsync(
      `curl -s "http://${target}/?id=1'" --max-time 3`,
      { timeout: 4000 }
    );

    if (stdout.includes('SQL') || stdout.includes('mysql') || stdout.includes('syntax error')) {
      vulns.push({
        type: 'SQL Injection',
        severity: 'CRITICAL',
        description: 'SQL error messages exposed - potential SQL injection',
        location: '/?id=',
        payload: "id=1'",
        impact: 'Database compromise, data theft, authentication bypass',
        remediation: 'Use parameterized queries, input validation, ORM'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 2. XSS Detection
async function checkXSS(target: string): Promise<any> {
  const vulns: any[] = [];
  const payload = '<script>alert(1)</script>';

  try {
    const { stdout } = await execAsync(
      `curl -s "http://${target}/?q=${encodeURIComponent(payload)}" --max-time 3`,
      { timeout: 4000 }
    );

    if (stdout.includes(payload) || stdout.includes('<script>alert')) {
      vulns.push({
        type: 'Cross-Site Scripting (XSS)',
        severity: 'HIGH',
        description: 'User input reflected without sanitization',
        location: '/?q=',
        payload: payload,
        impact: 'Session hijacking, credential theft, malware distribution',
        remediation: 'HTML encoding, Content Security Policy, input validation'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 3. Command Injection
async function checkCommandInjection(target: string): Promise<any> {
  const vulns: any[] = [];
  const payloads = ['; ls', '| whoami', '`id`', '$(whoami)'];

  try {
    const { stdout } = await execAsync(
      `curl -s "http://${target}/?cmd=ping%20-c%201%20127.0.0.1;ls" --max-time 3`,
      { timeout: 4000 }
    );

    if (stdout.match(/root|bin|usr|etc|var/) || stdout.includes('uid=')) {
      vulns.push({
        type: 'OS Command Injection',
        severity: 'CRITICAL',
        description: 'System commands can be executed through input',
        location: '/?cmd=',
        payload: 'ping -c 1 127.0.0.1;ls',
        impact: 'Complete system compromise, data theft, backdoor installation',
        remediation: 'Avoid system calls, whitelist inputs, use safe APIs'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 4. Path Traversal
async function checkPathTraversal(target: string): Promise<any> {
  const vulns: any[] = [];
  const payloads = ['../../etc/passwd', '../../../etc/passwd', '....//....//etc/passwd'];

  try {
    const { stdout } = await execAsync(
      `curl -s "http://${target}/?file=../../etc/passwd" --max-time 3`,
      { timeout: 4000 }
    );

    if (stdout.includes('root:x:0:0') || stdout.includes('/bin/bash')) {
      vulns.push({
        type: 'Path Traversal',
        severity: 'HIGH',
        description: 'Unauthorized access to file system',
        location: '/?file=',
        payload: '../../etc/passwd',
        impact: 'Access to sensitive files, configuration exposure',
        remediation: 'Input validation, path canonicalization, chroot'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 5. Open Redirect
async function checkOpenRedirect(target: string): Promise<any> {
  const vulns: any[] = [];

  try {
    const { stdout, stderr } = await execAsync(
      `curl -sI "http://${target}/?redirect=https://evil.com" --max-time 3`,
      { timeout: 4000 }
    );

    if (stdout.includes('Location: https://evil.com') || stdout.includes('302') || stdout.includes('301')) {
      vulns.push({
        type: 'Open Redirect',
        severity: 'MEDIUM',
        description: 'Unvalidated redirects to external sites',
        location: '/?redirect=',
        payload: 'https://evil.com',
        impact: 'Phishing attacks, malware distribution',
        remediation: 'Whitelist redirect URLs, validate destination'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 6. CSRF Check
async function checkCSRF(target: string): Promise<any> {
  const vulns: any[] = [];

  try {
    const { stdout } = await execAsync(
      `curl -sI "http://${target}" --max-time 3`,
      { timeout: 4000 }
    );

    if (!stdout.includes('X-CSRF-Token') &&
        !stdout.includes('csrf') &&
        !stdout.includes('SameSite=Strict')) {
      vulns.push({
        type: 'Missing CSRF Protection',
        severity: 'MEDIUM',
        description: 'No CSRF tokens detected in responses',
        location: 'All forms',
        payload: 'N/A',
        impact: 'Unauthorized actions on behalf of users',
        remediation: 'Implement CSRF tokens, SameSite cookies'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 7. SSRF Check
async function checkSSRF(target: string): Promise<any> {
  const vulns: any[] = [];

  try {
    const { stdout } = await execAsync(
      `curl -s "http://${target}/?url=http://169.254.169.254/latest/meta-data/" --max-time 3`,
      { timeout: 4000 }
    );

    if (stdout.includes('ami-id') || stdout.includes('instance-id')) {
      vulns.push({
        type: 'Server-Side Request Forgery (SSRF)',
        severity: 'CRITICAL',
        description: 'Server fetches arbitrary URLs',
        location: '/?url=',
        payload: 'http://169.254.169.254/latest/meta-data/',
        impact: 'Cloud metadata access, internal network scanning',
        remediation: 'Whitelist URLs, validate protocols, disable redirects'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 8. XXE Check
async function checkXXE(target: string): Promise<any> {
  const vulns: any[] = [];
  const payload = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>';

  try {
    const { stdout } = await execAsync(
      `curl -s -X POST "http://${target}" -H "Content-Type: application/xml" -d '${payload}' --max-time 3`,
      { timeout: 4000 }
    );

    if (stdout.includes('root:x:0:0')) {
      vulns.push({
        type: 'XML External Entity (XXE)',
        severity: 'HIGH',
        description: 'XML parser processes external entities',
        location: 'XML endpoints',
        payload: payload,
        impact: 'File disclosure, SSRF, DoS',
        remediation: 'Disable external entities, use JSON'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 9. Insecure Deserialization
async function checkInsecureDeserialization(target: string): Promise<any> {
  const vulns: any[] = [];

  // This is complex to detect without actual testing
  // Would need to analyze error messages and behavior

  return { vulnerabilities: vulns };
}

// 10. Weak Crypto Check
async function checkWeakCrypto(target: string): Promise<any> {
  const vulns: any[] = [];

  try {
    const { stdout } = await execAsync(
      `nmap --script ssl-enum-ciphers -p 443 ${target} 2>/dev/null || echo "skip"`,
      { timeout: 10000 }
    );

    if (stdout.includes('SSLv2') || stdout.includes('SSLv3') || stdout.includes('TLSv1.0')) {
      vulns.push({
        type: 'Weak SSL/TLS Configuration',
        severity: 'HIGH',
        description: 'Outdated SSL/TLS protocols enabled',
        location: 'HTTPS endpoint',
        payload: 'N/A',
        impact: 'Man-in-the-middle attacks, traffic interception',
        remediation: 'Disable SSLv2/v3, use TLS 1.2+, strong ciphers'
      });
    }
  } catch (e) {
    // nmap not available or scan failed
  }

  return { vulnerabilities: vulns };
}

// 11. Missing Security Headers
async function checkMissingSecurityHeaders(target: string): Promise<any> {
  const vulns: any[] = [];

  try {
    const { stdout } = await execAsync(
      `curl -sI "https://${target}" --max-time 3`,
      { timeout: 4000 }
    );

    const headers = stdout.toLowerCase();
    const missing: string[] = [];

    if (!headers.includes('strict-transport-security')) missing.push('HSTS');
    if (!headers.includes('content-security-policy')) missing.push('CSP');
    if (!headers.includes('x-frame-options')) missing.push('X-Frame-Options');
    if (!headers.includes('x-content-type-options')) missing.push('X-Content-Type-Options');
    if (!headers.includes('x-xss-protection')) missing.push('X-XSS-Protection');

    if (missing.length > 0) {
      vulns.push({
        type: 'Missing Security Headers',
        severity: 'MEDIUM',
        description: `Missing: ${missing.join(', ')}`,
        location: 'HTTP responses',
        payload: 'N/A',
        impact: 'Clickjacking, XSS, MIME sniffing attacks',
        remediation: 'Add security headers to all responses'
      });
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 12. Exposed Credentials
async function checkExposedCredentials(target: string): Promise<any> {
  const vulns: any[] = [];

  try {
    // Check common files
    const files = ['.env', '.git/config', 'config.php', 'wp-config.php', '.htpasswd'];

    for (const file of files) {
      try {
        const { stdout } = await execAsync(
          `curl -s "http://${target}/${file}" --max-time 2`,
          { timeout: 3000 }
        );

        if (stdout.includes('password') ||
            stdout.includes('api_key') ||
            stdout.includes('secret') ||
            stdout.includes('DB_')) {
          vulns.push({
            type: 'Exposed Credentials',
            severity: 'CRITICAL',
            description: `Sensitive file accessible: ${file}`,
            location: `/${file}`,
            payload: 'N/A',
            impact: 'Complete system compromise',
            remediation: 'Remove sensitive files from web root, .htaccess protection'
          });
        }
      } catch (e) {
        // File not found
      }
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 13. Default Credentials
async function checkDefaultCredentials(target: string): Promise<any> {
  const vulns: any[] = [];

  const defaults = [
    { user: 'admin', pass: 'admin' },
    { user: 'admin', pass: 'password' },
    { user: 'root', pass: 'root' },
    { user: 'administrator', pass: 'administrator' }
  ];

  try {
    for (const cred of defaults) {
      const { stdout } = await execAsync(
        `curl -s -u ${cred.user}:${cred.pass} "http://${target}/admin" --max-time 2`,
        { timeout: 3000 }
      );

      if (stdout.includes('dashboard') || stdout.includes('welcome') || !stdout.includes('401')) {
        vulns.push({
          type: 'Default Credentials',
          severity: 'CRITICAL',
          description: `Default login works: ${cred.user}/${cred.pass}`,
          location: '/admin',
          payload: `${cred.user}:${cred.pass}`,
          impact: 'Unauthorized administrative access',
          remediation: 'Change default credentials immediately'
        });
        break; // Stop after first match
      }
    }
  } catch (e) {
    // Auth endpoint not found
  }

  return { vulnerabilities: vulns };
}

// 14. Outdated Software
async function checkOutdatedSoftware(target: string): Promise<any> {
  const vulns: any[] = [];

  try {
    const { stdout } = await execAsync(
      `curl -sI "http://${target}" --max-time 3`,
      { timeout: 4000 }
    );

    const serverMatch = stdout.match(/Server: (.+)/i);
    if (serverMatch) {
      const server = serverMatch[1].toLowerCase();

      // Check for known outdated versions
      if (server.includes('apache/2.2') ||
          server.includes('nginx/1.10') ||
          server.includes('php/5.')) {
        vulns.push({
          type: 'Outdated Software',
          severity: 'HIGH',
          description: `Outdated server: ${serverMatch[1]}`,
          location: 'Server',
          payload: 'N/A',
          impact: 'Known vulnerabilities, lack of security patches',
          remediation: 'Update to latest stable version'
        });
      }
    }
  } catch (e) {
    // Target not accessible
  }

  return { vulnerabilities: vulns };
}

// 15. Open Ports
async function checkOpenPorts(target: string): Promise<any> {
  const vulns: any[] = [];
  const dangerousPorts = [21, 23, 25, 445, 3389, 5432, 3306, 6379, 27017];

  for (const port of dangerousPorts) {
    try {
      const { stdout } = await execAsync(
        `nc -zv -w 1 ${target} ${port} 2>&1`,
        { timeout: 2000 }
      );

      if (stdout.includes('succeeded') || stdout.includes('open')) {
        vulns.push({
          type: 'Dangerous Port Open',
          severity: port === 23 || port === 21 ? 'HIGH' : 'MEDIUM',
          description: `Port ${port} is publicly accessible`,
          location: `${target}:${port}`,
          payload: 'N/A',
          impact: 'Direct access to services, potential exploitation',
          remediation: 'Firewall rules, VPN access only'
        });
      }
    } catch (e) {
      // Port closed
    }
  }

  return { vulnerabilities: vulns };
}

// Calculate overall risk score
function calculateRiskScore(vulns: any[]): number {
  let score = 0;
  vulns.forEach(v => {
    switch (v.severity) {
      case 'CRITICAL': score += 10; break;
      case 'HIGH': score += 7; break;
      case 'MEDIUM': score += 4; break;
      case 'LOW': score += 2; break;
      case 'INFO': score += 1; break;
    }
  });
  return Math.min(100, score);
}
