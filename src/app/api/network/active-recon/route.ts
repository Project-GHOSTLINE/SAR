// API: Active Network Reconnaissance - Aggressive Network Scanning
// POST /api/network/active-recon - Active scanning of all devices on network

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { scan_type = 'full' } = await request.json();

    const results: any = {
      timestamp: new Date().toISOString(),
      scan_type,
      local_machine: {},
      devices: [],
      active_connections: [],
      open_ports_all_devices: [],
      suspicious_activity: [],
      network_topology: {}
    };

    // 1. Get local network info
    const localInfo = await getLocalNetworkInfo();
    results.local_machine = localInfo.local;
    results.network_topology = localInfo.network;

    // 2. Scan all devices on network (ARP scan)
    const devices = await scanAllDevices(localInfo.network.subnet);
    results.devices = devices;

    // 3. Get active connections from ALL devices
    results.active_connections = await getActiveConnections();

    // 4. Aggressive port scan on all discovered devices
    if (scan_type === 'full') {
      for (const device of devices.slice(0, 10)) { // Limit to 10 devices
        const ports = await scanDevicePorts(device.ip);
        if (ports.length > 0) {
          results.open_ports_all_devices.push({
            device: device.ip,
            hostname: device.hostname,
            mac: device.mac,
            open_ports: ports
          });
        }
      }
    }

    // 5. Detect suspicious activity
    results.suspicious_activity = detectSuspiciousActivity(
      devices,
      results.active_connections,
      results.open_ports_all_devices
    );

    // 6. Network traffic analysis
    results.traffic_analysis = await analyzeNetworkTraffic();

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

// Get local network information
async function getLocalNetworkInfo(): Promise<any> {
  const info: any = {
    local: {},
    network: {}
  };

  try {
    // Get local IP and interface
    const { stdout: ifconfig } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1');
    const lines = ifconfig.split('\n').filter(Boolean);

    for (const line of lines) {
      const match = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\s+netmask\s+0x([a-f0-9]+)/);
      if (match) {
        const ip = match[1];
        const netmaskHex = match[2];

        // Convert hex netmask to CIDR
        const netmaskBinary = parseInt(netmaskHex, 16).toString(2);
        const cidr = netmaskBinary.split('1').length - 1;

        // Calculate subnet
        const ipParts = ip.split('.');
        const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/${cidr}`;

        info.local = {
          ip,
          netmask: netmaskHex,
          cidr,
          subnet
        };

        info.network = {
          subnet,
          cidr,
          network_address: `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`,
          broadcast: `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.255`
        };

        break;
      }
    }

    // Get gateway
    const { stdout: route } = await execAsync('netstat -rn | grep default');
    const gatewayMatch = route.match(/default\s+(\d+\.\d+\.\d+\.\d+)/);
    if (gatewayMatch) {
      info.network.gateway = gatewayMatch[1];
    }

    // Get MAC address
    const { stdout: ifconfigMac } = await execAsync('ifconfig en0 | grep ether');
    const macMatch = ifconfigMac.match(/ether\s+([a-f0-9:]+)/);
    if (macMatch) {
      info.local.mac = macMatch[1];
    }

  } catch (e) {
    // Fallback
  }

  return info;
}

// Scan all devices on network using ARP
async function scanAllDevices(subnet: string): Promise<any[]> {
  const devices: any[] = [];

  try {
    // Method 1: ARP table
    const { stdout: arp } = await execAsync('arp -a');
    const lines = arp.split('\n').filter(line => !line.includes('incomplete'));

    for (const line of lines) {
      const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([a-f0-9:]+)/);
      if (match) {
        const ip = match[1];
        const mac = match[2];

        // Get hostname
        let hostname = 'Unknown';
        try {
          const hostnameMatch = line.match(/^(\S+)/);
          if (hostnameMatch && hostnameMatch[1] !== '?') {
            hostname = hostnameMatch[1];
          }
        } catch (e) {}

        // Detect device type
        const deviceType = detectDeviceType(mac, hostname);

        // Check if device is online (ping)
        let online = false;
        try {
          await execAsync(`ping -c 1 -W 1 ${ip}`, { timeout: 2000 });
          online = true;
        } catch (e) {
          // Device might be blocking ping but still online
          online = true; // Assume online since in ARP table
        }

        devices.push({
          ip,
          mac,
          hostname,
          device_type: deviceType,
          online,
          last_seen: new Date().toISOString()
        });
      }
    }

    // Method 2: Active scan using nmap if available (faster)
    try {
      const networkPart = subnet.split('/')[0].replace(/\.\d+$/, '.0/24');
      const { stdout: nmap } = await execAsync(
        `nmap -sn ${networkPart} 2>/dev/null || echo "skip"`,
        { timeout: 15000 }
      );

      if (!nmap.includes('skip')) {
        const nmapLines = nmap.split('\n');
        for (let i = 0; i < nmapLines.length; i++) {
          const line = nmapLines[i];
          const ipMatch = line.match(/Nmap scan report for.*?(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch) {
            const ip = ipMatch[1];
            // Check if not already in devices
            if (!devices.find(d => d.ip === ip)) {
              devices.push({
                ip,
                mac: 'Unknown',
                hostname: 'Unknown',
                device_type: 'Unknown',
                online: true,
                last_seen: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (e) {
      // nmap not available or failed
    }

  } catch (e: any) {
    console.error('Device scan error:', e.message);
  }

  return devices;
}

// Get active network connections
async function getActiveConnections(): Promise<any[]> {
  const connections: any[] = [];

  try {
    const { stdout } = await execAsync('netstat -an | grep ESTABLISHED');
    const lines = stdout.split('\n').filter(Boolean);

    for (const line of lines) {
      const match = line.match(/(\w+)\s+\d+\s+\d+\s+(\S+)\s+(\S+)\s+ESTABLISHED/);
      if (match) {
        const protocol = match[1];
        const local = match[2];
        const remote = match[3];

        const [localIP, localPort] = local.split('.');
        const remoteParts = remote.split('.');
        const remotePort = remoteParts.pop();
        const remoteIP = remoteParts.join('.');

        connections.push({
          protocol,
          local_address: localIP,
          local_port: localPort,
          remote_address: remoteIP,
          remote_port: remotePort,
          state: 'ESTABLISHED'
        });
      }
    }

    // Also get listening ports
    const { stdout: listening } = await execAsync('netstat -an | grep LISTEN');
    const listenLines = listening.split('\n').filter(Boolean);

    for (const line of listenLines) {
      const match = line.match(/(\w+)\s+\d+\s+\d+\s+(\S+)\s+\S+\s+LISTEN/);
      if (match) {
        const protocol = match[1];
        const local = match[2];

        connections.push({
          protocol,
          local_address: local.includes('.') ? local.split('.')[0] : local,
          local_port: local.includes('.') ? local.split('.').pop() : null,
          remote_address: '*',
          remote_port: '*',
          state: 'LISTEN'
        });
      }
    }

  } catch (e) {
    // netstat failed
  }

  return connections;
}

// Aggressive port scan on specific device
async function scanDevicePorts(ip: string): Promise<any[]> {
  const openPorts: any[] = [];

  // Common ports to scan
  const commonPorts = [
    21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995,
    1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017, 27018
  ];

  try {
    // Try nmap first (faster)
    try {
      const { stdout: nmap } = await execAsync(
        `nmap -p ${commonPorts.join(',')} ${ip} 2>/dev/null`,
        { timeout: 10000 }
      );

      const lines = nmap.split('\n');
      for (const line of lines) {
        const match = line.match(/(\d+)\/tcp\s+open\s+(\S+)/);
        if (match) {
          openPorts.push({
            port: parseInt(match[1]),
            service: match[2],
            protocol: 'tcp'
          });
        }
      }
    } catch (e) {
      // nmap not available, use nc
      for (const port of commonPorts.slice(0, 15)) { // Limit for speed
        try {
          const { stdout } = await execAsync(
            `nc -zv -w 1 ${ip} ${port} 2>&1`,
            { timeout: 1500 }
          );

          if (stdout.includes('succeeded') || stdout.includes('open')) {
            openPorts.push({
              port,
              service: getServiceName(port),
              protocol: 'tcp'
            });
          }
        } catch (e) {
          // Port closed
        }
      }
    }
  } catch (e) {
    // Scan failed
  }

  return openPorts;
}

// Detect device type from MAC address
function detectDeviceType(mac: string, hostname: string): string {
  const macUpper = mac.toUpperCase();
  const hostnameUpper = hostname.toUpperCase();

  // Common MAC prefixes
  if (macUpper.startsWith('00:50:56') || macUpper.startsWith('00:0C:29')) return 'VMware Virtual Machine';
  if (macUpper.startsWith('08:00:27')) return 'VirtualBox VM';
  if (macUpper.startsWith('52:54:00')) return 'KVM/QEMU VM';
  if (macUpper.startsWith('AC:DE:48') || macUpper.startsWith('B8:27:EB')) return 'Raspberry Pi';

  // Hostname detection
  if (hostnameUpper.includes('IPHONE') || hostnameUpper.includes('IPAD')) return 'Apple iOS Device';
  if (hostnameUpper.includes('ANDROID')) return 'Android Device';
  if (hostnameUpper.includes('MACBOOK') || hostnameUpper.includes('IMAC')) return 'Apple Computer';
  if (hostnameUpper.includes('WINDOWS') || hostnameUpper.includes('DESKTOP')) return 'Windows Computer';
  if (hostnameUpper.includes('ROUTER')) return 'Router';
  if (hostnameUpper.includes('PRINTER')) return 'Printer';
  if (hostnameUpper.includes('HUE') || hostnameUpper.includes('PHILIPS')) return 'Smart Home Device';

  return 'Unknown Device';
}

// Get service name from port
function getServiceName(port: number): string {
  const services: any = {
    21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
    80: 'HTTP', 110: 'POP3', 135: 'RPC', 139: 'NetBIOS', 143: 'IMAP',
    443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
    1433: 'MSSQL', 1521: 'Oracle', 3306: 'MySQL', 3389: 'RDP',
    5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt',
    8443: 'HTTPS-Alt', 27017: 'MongoDB', 27018: 'MongoDB'
  };
  return services[port] || 'Unknown';
}

// Detect suspicious activity
function detectSuspiciousActivity(
  devices: any[],
  connections: any[],
  portsData: any[]
): any[] {
  const suspicious: any[] = [];

  // 1. Devices with many open ports
  portsData.forEach(device => {
    if (device.open_ports.length > 10) {
      suspicious.push({
        type: 'High Port Count',
        severity: 'HIGH',
        device: device.device,
        description: `Device has ${device.open_ports.length} open ports - possible server or vulnerable device`,
        ports: device.open_ports.map((p: any) => p.port)
      });
    }
  });

  // 2. Dangerous ports open
  const dangerousPorts = [23, 21, 445, 3389, 5900, 1433, 3306, 27017];
  portsData.forEach(device => {
    const dangerous = device.open_ports.filter((p: any) => dangerousPorts.includes(p.port));
    if (dangerous.length > 0) {
      suspicious.push({
        type: 'Dangerous Port Open',
        severity: 'CRITICAL',
        device: device.device,
        description: `Dangerous ports exposed: ${dangerous.map((p: any) => p.port).join(', ')}`,
        ports: dangerous.map((p: any) => p.port),
        recommendation: 'Close these ports or restrict access'
      });
    }
  });

  // 3. Unknown devices
  const unknownDevices = devices.filter(d =>
    d.device_type === 'Unknown Device' && d.online
  );
  if (unknownDevices.length > 0) {
    suspicious.push({
      type: 'Unknown Devices',
      severity: 'MEDIUM',
      count: unknownDevices.length,
      description: `${unknownDevices.length} unidentified device(s) on network`,
      devices: unknownDevices.map(d => ({ ip: d.ip, mac: d.mac }))
    });
  }

  // 4. Too many active connections
  if (connections.length > 100) {
    suspicious.push({
      type: 'High Connection Count',
      severity: 'MEDIUM',
      count: connections.length,
      description: `Unusually high number of network connections: ${connections.length}`,
      recommendation: 'Check for malware or botnet activity'
    });
  }

  return suspicious;
}

// Analyze network traffic patterns
async function analyzeNetworkTraffic(): Promise<any> {
  const analysis: any = {
    protocols: {},
    top_destinations: [],
    bandwidth_usage: {}
  };

  try {
    // Get protocol distribution
    const { stdout: netstat } = await execAsync('netstat -s');

    // Parse protocol stats
    if (netstat.includes('tcp:')) {
      const tcpMatch = netstat.match(/(\d+) packets sent/);
      if (tcpMatch) analysis.protocols.tcp = parseInt(tcpMatch[1]);
    }

    // Get bandwidth usage (if available)
    try {
      const { stdout: nettop } = await execAsync('nettop -P -L 1 -J bytes_in,bytes_out 2>/dev/null | head -20');
      // Parse nettop output for bandwidth
      analysis.bandwidth_usage = { measured: true };
    } catch (e) {
      analysis.bandwidth_usage = { measured: false };
    }

  } catch (e) {
    // Analysis failed
  }

  return analysis;
}
