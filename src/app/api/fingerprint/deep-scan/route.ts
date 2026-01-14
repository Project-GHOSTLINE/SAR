// API: Deep Fingerprint Scan - Extract EVERYTHING trackable
// POST /api/fingerprint/deep-scan - Complete device fingerprinting

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const clientData = await request.json();

    const results: any = {
      timestamp: new Date().toISOString(),
      uniqueness_score: 0,
      trackability: 'UNKNOWN',
      fingerprint_hash: '',
      data_points: 0,
      server_side: {},
      client_side: clientData,
      system_info: {},
      network_info: {},
      tracking_vectors: []
    };

    // SERVER SIDE FINGERPRINTING
    results.server_side = await getServerSideFingerprint(request);

    // SYSTEM INFO
    results.system_info = await getSystemInfo();

    // NETWORK INFO
    results.network_info = await getNetworkInfo();

    // Calculate tracking vectors
    results.tracking_vectors = calculateTrackingVectors(results);

    // Calculate uniqueness score
    results.uniqueness_score = calculateUniqueness(results);
    results.data_points = countDataPoints(results);

    // Generate fingerprint hash
    results.fingerprint_hash = generateHash(results);

    // Determine trackability
    if (results.uniqueness_score > 95) {
      results.trackability = 'UNIQUE - Easily identified across sites';
    } else if (results.uniqueness_score > 80) {
      results.trackability = 'HIGHLY TRACKABLE - Very distinctive';
    } else if (results.uniqueness_score > 60) {
      results.trackability = 'TRACKABLE - Identifiable with effort';
    } else {
      results.trackability = 'LOW TRACKABILITY - Common configuration';
    }

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

// Get server-side fingerprint
async function getServerSideFingerprint(request: NextRequest): Promise<any> {
  const fp: any = {
    headers: {},
    ip_info: {},
    tls_info: {}
  };

  // All headers
  fp.headers = {
    user_agent: request.headers.get('user-agent'),
    accept: request.headers.get('accept'),
    accept_language: request.headers.get('accept-language'),
    accept_encoding: request.headers.get('accept-encoding'),
    dnt: request.headers.get('dnt'),
    upgrade_insecure_requests: request.headers.get('upgrade-insecure-requests'),
    sec_fetch_site: request.headers.get('sec-fetch-site'),
    sec_fetch_mode: request.headers.get('sec-fetch-mode'),
    sec_fetch_user: request.headers.get('sec-fetch-user'),
    sec_fetch_dest: request.headers.get('sec-fetch-dest'),
    sec_ch_ua: request.headers.get('sec-ch-ua'),
    sec_ch_ua_mobile: request.headers.get('sec-ch-ua-mobile'),
    sec_ch_ua_platform: request.headers.get('sec-ch-ua-platform'),
    connection: request.headers.get('connection'),
    cache_control: request.headers.get('cache-control'),
    pragma: request.headers.get('pragma'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin')
  };

  // IP information
  fp.ip_info = {
    x_forwarded_for: request.headers.get('x-forwarded-for'),
    x_real_ip: request.headers.get('x-real-ip'),
    cf_connecting_ip: request.headers.get('cf-connecting-ip'),
    true_client_ip: request.headers.get('true-client-ip')
  };

  // Get public IP
  try {
    const { stdout } = await execAsync('curl -s https://api.ipify.org', { timeout: 3000 });
    fp.ip_info.public_ip = stdout.trim();
  } catch (e) {}

  return fp;
}

// Get system information
async function getSystemInfo(): Promise<any> {
  const info: any = {};

  try {
    // macOS version
    const { stdout: osVersion } = await execAsync('sw_vers -productVersion', { timeout: 2000 });
    info.os_version = osVersion.trim();

    // Hardware model
    const { stdout: model } = await execAsync('sysctl -n hw.model', { timeout: 2000 });
    info.hardware_model = model.trim();

    // CPU info
    const { stdout: cpu } = await execAsync('sysctl -n machdep.cpu.brand_string', { timeout: 2000 });
    info.cpu = cpu.trim();

    // CPU cores
    const { stdout: cores } = await execAsync('sysctl -n hw.ncpu', { timeout: 2000 });
    info.cpu_cores = cores.trim();

    // Memory
    const { stdout: mem } = await execAsync('sysctl -n hw.memsize', { timeout: 2000 });
    info.memory_bytes = mem.trim();
    info.memory_gb = (parseInt(mem.trim()) / 1024 / 1024 / 1024).toFixed(2);

    // Machine ID
    const { stdout: uuid } = await execAsync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', { timeout: 2000 });
    const uuidMatch = uuid.match(/"([^"]+)"/);
    if (uuidMatch) info.machine_uuid = uuidMatch[1];

    // Serial number
    const { stdout: serial } = await execAsync('ioreg -l | grep IOPlatformSerialNumber | awk \'{print $4}\' | tr -d \'"\'', { timeout: 2000 });
    info.serial_number = serial.trim();

    // Mac address
    const { stdout: mac } = await execAsync('ifconfig en0 | grep ether | awk \'{print $2}\'', { timeout: 2000 });
    info.mac_address = mac.trim();

    // Boot time
    const { stdout: boot } = await execAsync('sysctl -n kern.boottime', { timeout: 2000 });
    info.boot_time = boot.trim();

    // Hostname
    const { stdout: hostname } = await execAsync('hostname', { timeout: 2000 });
    info.hostname = hostname.trim();

    // Current user
    const { stdout: user } = await execAsync('whoami', { timeout: 2000 });
    info.current_user = user.trim();

    // Screen resolution (if available)
    try {
      const { stdout: res } = await execAsync('system_profiler SPDisplaysDataType | grep Resolution', { timeout: 3000 });
      info.screen_resolution = res.trim();
    } catch (e) {}

  } catch (e: any) {
    info.error = e.message;
  }

  return info;
}

// Get network information
async function getNetworkInfo(): Promise<any> {
  const info: any = {};

  try {
    // Local IP
    const { stdout: ip } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1', { timeout: 2000 });
    const ipMatch = ip.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
    if (ipMatch) info.local_ip = ipMatch[1];

    // Gateway
    const { stdout: gateway } = await execAsync('netstat -rn | grep default | head -1', { timeout: 2000 });
    const gwMatch = gateway.match(/default\s+(\d+\.\d+\.\d+\.\d+)/);
    if (gwMatch) info.gateway = gwMatch[1];

    // DNS servers
    const { stdout: dns } = await execAsync('scutil --dns | grep nameserver | head -5', { timeout: 2000 });
    info.dns_servers = dns.match(/\d+\.\d+\.\d+\.\d+/g) || [];

    // WiFi SSID
    try {
      const { stdout: ssid } = await execAsync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I | grep " SSID"', { timeout: 2000 });
      const ssidMatch = ssid.match(/SSID:\s*(.+)/);
      if (ssidMatch) info.wifi_ssid = ssidMatch[1].trim();
    } catch (e) {}

    // Network interfaces
    const { stdout: interfaces } = await execAsync('ifconfig | grep "^[a-z]" | cut -d: -f1', { timeout: 2000 });
    info.network_interfaces = interfaces.split('\n').filter(Boolean);

    // Active connections count
    const { stdout: conns } = await execAsync('netstat -an | grep ESTABLISHED | wc -l', { timeout: 2000 });
    info.active_connections = conns.trim();

    // Open ports
    const { stdout: ports } = await execAsync('netstat -an | grep LISTEN | wc -l', { timeout: 2000 });
    info.listening_ports = ports.trim();

  } catch (e: any) {
    info.error = e.message;
  }

  return info;
}

// Calculate tracking vectors
function calculateTrackingVectors(results: any): any[] {
  const vectors = [];

  // User Agent tracking
  if (results.server_side.headers.user_agent) {
    vectors.push({
      vector: 'User Agent',
      value: results.server_side.headers.user_agent,
      uniqueness: 'MEDIUM',
      description: 'Browser and OS identification'
    });
  }

  // IP tracking
  if (results.server_side.ip_info.public_ip) {
    vectors.push({
      vector: 'Public IP Address',
      value: results.server_side.ip_info.public_ip,
      uniqueness: 'HIGH',
      description: 'Persistent identifier, changes rarely'
    });
  }

  // Hardware UUID
  if (results.system_info.machine_uuid) {
    vectors.push({
      vector: 'Hardware UUID',
      value: results.system_info.machine_uuid,
      uniqueness: 'VERY HIGH',
      description: 'Permanent hardware identifier'
    });
  }

  // Serial number
  if (results.system_info.serial_number) {
    vectors.push({
      vector: 'Serial Number',
      value: results.system_info.serial_number,
      uniqueness: 'VERY HIGH',
      description: 'Unique device serial'
    });
  }

  // MAC address
  if (results.system_info.mac_address) {
    vectors.push({
      vector: 'MAC Address',
      value: results.system_info.mac_address,
      uniqueness: 'VERY HIGH',
      description: 'Network card identifier'
    });
  }

  // Canvas fingerprint
  if (results.client_side.canvas) {
    vectors.push({
      vector: 'Canvas Fingerprint',
      value: results.client_side.canvas.substring(0, 32) + '...',
      uniqueness: 'VERY HIGH',
      description: 'GPU and graphics driver signature'
    });
  }

  // WebGL fingerprint
  if (results.client_side.webgl) {
    vectors.push({
      vector: 'WebGL Fingerprint',
      value: results.client_side.webgl.renderer,
      uniqueness: 'VERY HIGH',
      description: 'Graphics card identification'
    });
  }

  // Audio fingerprint
  if (results.client_side.audio) {
    vectors.push({
      vector: 'Audio Fingerprint',
      value: results.client_side.audio.substring(0, 32) + '...',
      uniqueness: 'HIGH',
      description: 'Audio processing signature'
    });
  }

  // Screen resolution
  if (results.client_side.screen) {
    vectors.push({
      vector: 'Screen Resolution',
      value: `${results.client_side.screen.width}x${results.client_side.screen.height}`,
      uniqueness: 'MEDIUM',
      description: 'Display configuration'
    });
  }

  // Installed fonts
  if (results.client_side.fonts && results.client_side.fonts.length > 0) {
    vectors.push({
      vector: 'Font Enumeration',
      value: `${results.client_side.fonts.length} fonts detected`,
      uniqueness: 'HIGH',
      description: 'Unique font installation pattern'
    });
  }

  // Plugins
  if (results.client_side.plugins && results.client_side.plugins.length > 0) {
    vectors.push({
      vector: 'Browser Plugins',
      value: `${results.client_side.plugins.length} plugins`,
      uniqueness: 'MEDIUM',
      description: 'Installed extensions pattern'
    });
  }

  // Timezone
  if (results.client_side.timezone) {
    vectors.push({
      vector: 'Timezone',
      value: results.client_side.timezone,
      uniqueness: 'LOW',
      description: 'Location indicator'
    });
  }

  // CPU cores
  if (results.client_side.cpu_cores) {
    vectors.push({
      vector: 'CPU Cores',
      value: results.client_side.cpu_cores,
      uniqueness: 'LOW',
      description: 'Hardware specification'
    });
  }

  // Memory
  if (results.client_side.device_memory) {
    vectors.push({
      vector: 'Device Memory',
      value: `${results.client_side.device_memory}GB`,
      uniqueness: 'LOW',
      description: 'RAM capacity'
    });
  }

  // Language
  if (results.client_side.languages) {
    vectors.push({
      vector: 'Languages',
      value: results.client_side.languages.join(', '),
      uniqueness: 'MEDIUM',
      description: 'Browser language preferences'
    });
  }

  // Platform
  if (results.client_side.platform) {
    vectors.push({
      vector: 'Platform',
      value: results.client_side.platform,
      uniqueness: 'LOW',
      description: 'Operating system'
    });
  }

  return vectors;
}

// Calculate uniqueness score
function calculateUniqueness(results: any): number {
  let score = 0;

  // Very high uniqueness factors
  if (results.system_info.machine_uuid) score += 20;
  if (results.system_info.serial_number) score += 20;
  if (results.system_info.mac_address) score += 15;
  if (results.client_side.canvas) score += 15;
  if (results.client_side.webgl) score += 15;

  // High uniqueness factors
  if (results.server_side.ip_info.public_ip) score += 10;
  if (results.client_side.audio) score += 10;
  if (results.client_side.fonts && results.client_side.fonts.length > 20) score += 10;

  // Medium uniqueness factors
  if (results.client_side.screen) score += 5;
  if (results.client_side.plugins && results.client_side.plugins.length > 0) score += 5;

  // Combination bonus
  const vectors = calculateTrackingVectors(results);
  if (vectors.length > 10) score += 10;

  return Math.min(100, score);
}

// Count data points
function countDataPoints(results: any): number {
  let count = 0;

  function countObject(obj: any) {
    for (const key in obj) {
      if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          countObject(obj[key]);
        } else {
          count++;
        }
      }
    }
  }

  countObject(results);
  return count;
}

// Generate fingerprint hash
function generateHash(results: any): string {
  const data = JSON.stringify(results);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
}
