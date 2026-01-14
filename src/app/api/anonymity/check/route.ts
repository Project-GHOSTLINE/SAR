// API: Anonymity Check - Verify if you're anonymous
// GET /api/anonymity/check - Check all anonymity vectors

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      anonymity_score: 0,
      is_anonymous: false,
      leaks: [],
      exposures: [],
      recommendations: []
    };

    // 1. Get public IP
    const ipInfo = await getPublicIP();
    results.public_ip = ipInfo;

    if (ipInfo.ip) {
      results.exposures.push({
        type: 'Public IP Exposed',
        value: ipInfo.ip,
        severity: 'HIGH',
        description: 'Your real IP is visible'
      });
    }

    // 2. Check DNS leaks
    const dnsLeaks = await checkDNSLeaks();
    if (dnsLeaks.length > 0) {
      results.leaks.push(...dnsLeaks);
    }

    // 3. Check if using Tor
    const torCheck = await checkTor();
    results.using_tor = torCheck.is_tor;
    if (torCheck.is_tor) {
      results.anonymity_score += 40;
    }

    // 4. Check if using VPN
    const vpnCheck = await checkVPN(ipInfo.ip);
    results.using_vpn = vpnCheck.is_vpn;
    if (vpnCheck.is_vpn) {
      results.anonymity_score += 30;
    }

    // 5. Check if using Proxy
    const proxyCheck = await checkProxy();
    results.using_proxy = proxyCheck.is_proxy;
    if (proxyCheck.is_proxy) {
      results.anonymity_score += 20;
    }

    // 6. Check exposed headers
    const headers = getExposedHeaders(request);
    results.exposed_headers = headers;
    if (headers.length > 0) {
      results.exposures.push({
        type: 'Headers Exposed',
        count: headers.length,
        severity: 'MEDIUM',
        description: `${headers.length} identifying headers sent`
      });
    }

    // 7. Get geolocation from IP
    const geo = await getGeolocation(ipInfo.ip);
    results.geolocation = geo;
    if (geo.country) {
      results.exposures.push({
        type: 'Geolocation Exposed',
        value: `${geo.city}, ${geo.country}`,
        severity: 'HIGH',
        description: 'Your physical location is revealed'
      });
    }

    // 8. Check timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    results.timezone = timezone;

    // 9. Browser fingerprint indicators
    results.fingerprint = {
      user_agent: request.headers.get('user-agent'),
      accept_language: request.headers.get('accept-language'),
      accept_encoding: request.headers.get('accept-encoding')
    };

    // Calculate final score
    results.anonymity_score = Math.max(0, results.anonymity_score - (results.leaks.length * 10) - (results.exposures.length * 5));
    results.is_anonymous = results.anonymity_score >= 50;

    // Generate recommendations
    results.recommendations = generateRecommendations(results);

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

// Get public IP
async function getPublicIP(): Promise<any> {
  try {
    const { stdout } = await execAsync('curl -s https://api.ipify.org?format=json --max-time 5', { timeout: 6000 });
    const data = JSON.parse(stdout);
    return { ip: data.ip };
  } catch (e) {
    try {
      const { stdout } = await execAsync('curl -s https://ifconfig.me --max-time 5', { timeout: 6000 });
      return { ip: stdout.trim() };
    } catch (e2) {
      return { ip: null };
    }
  }
}

// Check DNS leaks
async function checkDNSLeaks(): Promise<any[]> {
  const leaks: any[] = [];

  try {
    // Get DNS servers being used
    const { stdout } = await execAsync('scutil --dns 2>/dev/null | grep nameserver || cat /etc/resolv.conf 2>/dev/null | grep nameserver', { timeout: 3000 });

    const dnsServers = stdout.match(/\d+\.\d+\.\d+\.\d+/g) || [];

    // Check if DNS servers are public (Google, Cloudflare, etc.)
    const publicDNS = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'];
    const suspiciousDNS = dnsServers.filter(dns => !publicDNS.includes(dns));

    if (suspiciousDNS.length > 0) {
      leaks.push({
        type: 'DNS Leak',
        servers: suspiciousDNS,
        severity: 'CRITICAL',
        description: 'DNS requests may expose your location/ISP'
      });
    }

    // Check if DNS queries go through VPN
    try {
      const { stdout: dnsTest } = await execAsync('dig +short @8.8.8.8 whoami.akamai.net --time=2', { timeout: 3000 });
      const dnsIP = dnsTest.trim();

      const { stdout: directIP } = await execAsync('curl -s https://api.ipify.org --max-time 3', { timeout: 4000 });

      if (dnsIP && directIP && dnsIP !== directIP.trim()) {
        leaks.push({
          type: 'DNS vs HTTP IP Mismatch',
          dns_ip: dnsIP,
          http_ip: directIP.trim(),
          severity: 'HIGH',
          description: 'DNS queries may be leaking outside VPN tunnel'
        });
      }
    } catch (e) {}

  } catch (e) {}

  return leaks;
}

// Check if using Tor
async function checkTor(): Promise<any> {
  try {
    // Check Tor control port
    const { stdout: torCheck } = await execAsync('lsof -i :9051 2>/dev/null || echo "no"', { timeout: 2000 });

    if (torCheck.includes('tor')) {
      return { is_tor: true, confidence: 'HIGH' };
    }

    // Check if IP is Tor exit node
    try {
      const { stdout: ip } = await execAsync('curl -s https://api.ipify.org --max-time 3', { timeout: 4000 });
      const { stdout: torCheck2 } = await execAsync(`curl -s "https://check.torproject.org/api/ip" --max-time 3`, { timeout: 4000 });

      if (torCheck2.includes('"IsTor":true')) {
        return { is_tor: true, confidence: 'HIGH' };
      }
    } catch (e) {}

    return { is_tor: false };
  } catch (e) {
    return { is_tor: false };
  }
}

// Check if using VPN
async function checkVPN(ip: string): Promise<any> {
  try {
    // Check common VPN interfaces
    const { stdout: interfaces } = await execAsync('ifconfig | grep -E "tun|tap|ppp|vpn" | head -1', { timeout: 2000 });

    if (interfaces.includes('tun') || interfaces.includes('tap') || interfaces.includes('vpn')) {
      return { is_vpn: true, type: 'Interface detected', confidence: 'HIGH' };
    }

    // Check if IP belongs to known VPN provider
    if (ip) {
      const vpnProviders = ['nordvpn', 'expressvpn', 'protonvpn', 'mullvad', 'privateinternetaccess'];
      try {
        const { stdout: whois } = await execAsync(`whois ${ip} 2>/dev/null | grep -i -E "nordvpn|expressvpn|proton|mullvad|private internet" | head -1`, { timeout: 5000 });

        if (whois) {
          return { is_vpn: true, type: 'Provider detected', confidence: 'HIGH' };
        }
      } catch (e) {}
    }

    return { is_vpn: false };
  } catch (e) {
    return { is_vpn: false };
  }
}

// Check if using Proxy
async function checkProxy(): Promise<any> {
  try {
    // Check environment variables
    const { stdout: envProxy } = await execAsync('env | grep -i proxy', { timeout: 1000 });

    if (envProxy.includes('http_proxy') || envProxy.includes('https_proxy')) {
      return { is_proxy: true, type: 'Environment variable', confidence: 'HIGH' };
    }

    // Check common proxy ports
    const proxyPorts = [8080, 3128, 1080, 8888];
    for (const port of proxyPorts) {
      try {
        const { stdout } = await execAsync(`lsof -i :${port} 2>/dev/null`, { timeout: 1000 });
        if (stdout.includes('LISTEN')) {
          return { is_proxy: true, type: `Port ${port} listening`, confidence: 'MEDIUM' };
        }
      } catch (e) {}
    }

    return { is_proxy: false };
  } catch (e) {
    return { is_proxy: false };
  }
}

// Get exposed headers
function getExposedHeaders(request: NextRequest): string[] {
  const identifyingHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'via',
    'forwarded',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-client-ip',
    'cf-connecting-ip',
    'true-client-ip'
  ];

  const exposed: string[] = [];
  identifyingHeaders.forEach(header => {
    if (request.headers.get(header)) {
      exposed.push(`${header}: ${request.headers.get(header)}`);
    }
  });

  return exposed;
}

// Get geolocation from IP
async function getGeolocation(ip: string): Promise<any> {
  if (!ip) return {};

  try {
    const { stdout } = await execAsync(`curl -s "http://ip-api.com/json/${ip}" --max-time 5`, { timeout: 6000 });
    const data = JSON.parse(stdout);

    return {
      country: data.country,
      country_code: data.countryCode,
      region: data.regionName,
      city: data.city,
      zip: data.zip,
      lat: data.lat,
      lon: data.lon,
      isp: data.isp,
      org: data.org
    };
  } catch (e) {
    return {};
  }
}

// Generate recommendations
function generateRecommendations(results: any): string[] {
  const recs: string[] = [];

  if (!results.using_tor && !results.using_vpn) {
    recs.push('❌ CRITICAL: Use Tor Browser or VPN immediately');
  }

  if (results.leaks.length > 0) {
    recs.push('❌ DNS LEAK detected - Configure DNS over HTTPS or use VPN DNS');
  }

  if (results.exposed_headers.length > 0) {
    recs.push('⚠️ Identifying headers exposed - Use privacy-focused browser');
  }

  if (!results.using_tor) {
    recs.push('💡 For maximum anonymity, use Tor Browser');
  }

  if (results.using_vpn && !results.using_tor) {
    recs.push('✅ VPN detected - Good! Consider Tor for extra anonymity');
  }

  if (results.geolocation.isp) {
    recs.push(`⚠️ ISP exposed: ${results.geolocation.isp}`);
  }

  if (results.anonymity_score < 30) {
    recs.push('🚨 ANONYMITY LEVEL: VERY LOW - You are easily tracked');
  } else if (results.anonymity_score < 50) {
    recs.push('⚠️ ANONYMITY LEVEL: LOW - Basic tracking protection only');
  } else if (results.anonymity_score < 70) {
    recs.push('💪 ANONYMITY LEVEL: MEDIUM - Good protection');
  } else {
    recs.push('🛡️ ANONYMITY LEVEL: HIGH - Strong protection');
  }

  return recs;
}
