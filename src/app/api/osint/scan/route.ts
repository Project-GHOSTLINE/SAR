// API: OSINT Real Network Scanner
// GET /api/osint/scan - Scan réseau complet avec vraies données

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { osintAuthMiddleware } from '@/middleware/osint-auth'

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  // 🔐 Security: Check authentication
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError

  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      local_machine: {},
      network_devices: [],
      open_ports: [],
      network_info: {}
    };

    // 1. Get local IP
    try {
      const { stdout: ifconfig } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1');
      const match = ifconfig.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        results.local_machine.ip = match[1];
      }
    } catch (e) {
      results.local_machine.ip = 'unknown';
    }

    // 2. Get MAC address
    try {
      const { stdout: mac } = await execAsync('ifconfig en0 | grep ether');
      const match = mac.match(/ether\s+([\da-f:]+)/);
      if (match) {
        results.local_machine.mac = match[1];
      }
    } catch (e) {
      results.local_machine.mac = 'unknown';
    }

    // 3. Get hostname
    try {
      const { stdout: hostname } = await execAsync('hostname');
      results.local_machine.hostname = hostname.trim();
    } catch (e) {
      results.local_machine.hostname = 'unknown';
    }

    // 4. Scan ARP table for devices
    try {
      const { stdout: arp } = await execAsync('arp -a | grep -v incomplete');
      const lines = arp.split('\n').filter(Boolean);

      for (const line of lines) {
        const match = line.match(/^(.+?)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([\da-f:]+)/);
        if (match) {
          const [, hostname, ip, mac] = match;

          let deviceType = 'Unknown';
          if (hostname.includes('router') || hostname.includes('gateway') || ip.endsWith('.1')) {
            deviceType = 'Router';
          } else if (hostname.includes('iphone') || hostname.includes('ipad')) {
            deviceType = 'Apple Device';
          } else if (hostname.includes('hue')) {
            deviceType = 'Smart Home';
          }

          results.network_devices.push({
            hostname: hostname.trim(),
            ip,
            mac,
            type: deviceType
          });
        }
      }
    } catch (e) {
      results.network_devices = [];
    }

    // 5. Scan open ports
    try {
      const { stdout: netstat } = await execAsync('netstat -an | grep LISTEN');
      const lines = netstat.split('\n').filter(Boolean);

      const portMap: any = {};

      for (const line of lines) {
        const parts = line.split(/\s+/);
        const address = parts[3];

        if (address) {
          const portMatch = address.match(/:(\d+)$|\.(\d+)$/);
          if (portMatch) {
            const port = portMatch[1] || portMatch[2];

            if (!portMap[port]) {
              let service = 'Unknown';
              let description = '';

              switch (port) {
                case '3000':
                  service = 'Next.js';
                  description = 'Next.js Development Server';
                  break;
                case '5432':
                  service = 'PostgreSQL';
                  description = 'Database Server';
                  break;
                case '6379':
                  service = 'Redis';
                  description = 'Cache Server';
                  break;
                case '11434':
                  service = 'Ollama';
                  description = 'AI Model Server';
                  break;
                case '8880':
                  service = 'Python';
                  description = 'Python Web Server';
                  break;
                case '2022':
                  service = 'Whisper';
                  description = 'Speech Recognition';
                  break;
                case '7265':
                  service = 'Raycast';
                  description = 'Productivity Tool';
                  break;
                case '7000':
                case '5000':
                  service = 'Control Center';
                  description = 'macOS Control Center';
                  break;
                default:
                  service = `Port ${port}`;
                  description = 'Service Running';
              }

              const isPublic = address.includes('*') || !address.includes('127.0.0.1');

              portMap[port] = {
                port: parseInt(port),
                service,
                description,
                public: isPublic,
                address: address
              };
            }
          }
        }
      }

      results.open_ports = Object.values(portMap).sort((a: any, b: any) => a.port - b.port);
    } catch (e) {
      results.open_ports = [];
    }

    // 6. Get gateway info
    try {
      const { stdout: route } = await execAsync('netstat -rn | grep default');
      const match = route.match(/default\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        results.network_info.gateway = match[1];
      }
    } catch (e) {
      results.network_info.gateway = 'unknown';
    }

    // 7. Get DNS
    try {
      const { stdout: dns } = await execAsync('cat /etc/resolv.conf | grep nameserver');
      const servers = dns.split('\n')
        .filter(l => l.includes('nameserver'))
        .map(l => l.split('nameserver')[1].trim());
      results.network_info.dns_servers = servers;
    } catch (e) {
      results.network_info.dns_servers = [];
    }

    // 8. Ping gateway for latency
    if (results.network_info.gateway && results.network_info.gateway !== 'unknown') {
      try {
        const { stdout: ping } = await execAsync(`ping -c 3 ${results.network_info.gateway}`);
        const match = ping.match(/min\/avg\/max[^=]*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/);
        if (match) {
          results.network_info.latency = {
            min: parseFloat(match[1]),
            avg: parseFloat(match[2]),
            max: parseFloat(match[3])
          };
        }
      } catch (e) {
        results.network_info.latency = null;
      }
    }

    // Summary stats
    results.summary = {
      total_devices: results.network_devices.length,
      total_ports: results.open_ports.length,
      public_ports: results.open_ports.filter((p: any) => p.public).length,
      private_ports: results.open_ports.filter((p: any) => !p.public).length
    };

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
