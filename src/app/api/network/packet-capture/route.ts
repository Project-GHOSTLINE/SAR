// API: Packet Capture - Wireshark-like Network Monitoring
// POST /api/network/packet-capture - Start packet capture session

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const {
      duration = 10,
      interface: iface = 'any',
      filter = '',
      packet_count = 100
    } = await request.json();

    const captureFile = join('/tmp', `capture_${Date.now()}.pcap`);

    const results: any = {
      timestamp: new Date().toISOString(),
      capture_duration: duration,
      interface: iface,
      filter: filter || 'none',
      capture_file: captureFile,
      packets: [],
      statistics: {},
      threats_detected: []
    };

    // Start packet capture with tcpdump
    const tcpdumpCmd = filter
      ? `sudo tcpdump -i ${iface} -c ${packet_count} -w ${captureFile} -n "${filter}" 2>&1`
      : `sudo tcpdump -i ${iface} -c ${packet_count} -w ${captureFile} -n 2>&1`;

    try {
      const { stdout, stderr } = await execAsync(tcpdumpCmd, {
        timeout: (duration + 5) * 1000
      });

      // Parse capture statistics
      const captureStats = stderr || stdout;
      const captureMatch = captureStats.match(/(\d+) packets captured/);
      const receivedMatch = captureStats.match(/(\d+) packets received/);
      const droppedMatch = captureStats.match(/(\d+) packets dropped/);

      results.statistics = {
        packets_captured: captureMatch ? parseInt(captureMatch[1]) : 0,
        packets_received: receivedMatch ? parseInt(receivedMatch[1]) : 0,
        packets_dropped: droppedMatch ? parseInt(droppedMatch[1]) : 0
      };

    } catch (e: any) {
      // Capture might timeout or fail, that's ok
      results.capture_error = e.message;
    }

    // Read and analyze captured packets
    try {
      const analyzeCmd = `sudo tcpdump -r ${captureFile} -nn -tt -v 2>&1 | head -n 500`;
      const { stdout: packetData } = await execAsync(analyzeCmd, { timeout: 10000 });

      // Parse packets
      results.packets = parsePackets(packetData);

      // Analyze for threats
      results.threats_detected = detectThreats(results.packets);

      // Get protocol statistics
      results.statistics.protocols = getProtocolStats(results.packets);
      results.statistics.top_sources = getTopSources(results.packets);
      results.statistics.top_destinations = getTopDestinations(results.packets);

    } catch (e: any) {
      results.analysis_error = e.message;
    }

    // Cleanup
    try {
      await unlink(captureFile);
    } catch (e) {
      // File might not exist
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

// Parse tcpdump output into structured packets
function parsePackets(tcpdumpOutput: string): any[] {
  const packets: any[] = [];
  const lines = tcpdumpOutput.split('\n').filter(line => line.trim() && !line.includes('reading from'));

  for (let i = 0; i < lines.length && i < 200; i++) {
    const line = lines[i];

    try {
      const packet: any = {
        id: i + 1,
        raw: line,
        timestamp: null,
        protocol: 'UNKNOWN',
        source: null,
        destination: null,
        length: 0,
        flags: [],
        info: ''
      };

      // Extract timestamp
      const timestampMatch = line.match(/^(\d+\.\d+)/);
      if (timestampMatch) {
        packet.timestamp = parseFloat(timestampMatch[1]);
      }

      // Detect protocol
      if (line.includes('IP ')) packet.protocol = 'IP';
      if (line.includes('TCP ')) packet.protocol = 'TCP';
      if (line.includes('UDP ')) packet.protocol = 'UDP';
      if (line.includes('ICMP ')) packet.protocol = 'ICMP';
      if (line.includes('ARP ')) packet.protocol = 'ARP';
      if (line.includes('DNS ')) packet.protocol = 'DNS';
      if (line.includes('HTTP ')) packet.protocol = 'HTTP';
      if (line.includes('HTTPS ')) packet.protocol = 'HTTPS';
      if (line.includes('TLS ')) packet.protocol = 'TLS';

      // Extract source and destination
      const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)\.(\d+)\s+>\s+(\d+\.\d+\.\d+\.\d+)\.(\d+)/);
      if (ipMatch) {
        packet.source = { ip: ipMatch[1], port: parseInt(ipMatch[2]) };
        packet.destination = { ip: ipMatch[3], port: parseInt(ipMatch[4]) };
      } else {
        // Try simpler pattern
        const simpleMatch = line.match(/(\d+\.\d+\.\d+\.\d+)\s+>\s+(\d+\.\d+\.\d+\.\d+)/);
        if (simpleMatch) {
          packet.source = { ip: simpleMatch[1], port: null };
          packet.destination = { ip: simpleMatch[2], port: null };
        }
      }

      // Extract length
      const lengthMatch = line.match(/length (\d+)/i);
      if (lengthMatch) {
        packet.length = parseInt(lengthMatch[1]);
      }

      // Extract TCP flags
      if (packet.protocol === 'TCP') {
        if (line.includes('Flags [S]')) packet.flags.push('SYN');
        if (line.includes('Flags [S.]')) packet.flags.push('SYN-ACK');
        if (line.includes('Flags [.]')) packet.flags.push('ACK');
        if (line.includes('Flags [F]')) packet.flags.push('FIN');
        if (line.includes('Flags [R]')) packet.flags.push('RST');
        if (line.includes('Flags [P]')) packet.flags.push('PSH');
      }

      // Info
      packet.info = line.substring(0, 150);

      packets.push(packet);
    } catch (e) {
      // Skip malformed packets
    }
  }

  return packets;
}

// Detect network threats
function detectThreats(packets: any[]): any[] {
  const threats: any[] = [];

  // 1. Port Scan Detection
  const synPackets = packets.filter(p => p.flags.includes('SYN') && !p.flags.includes('ACK'));
  const sourceIPs = new Map<string, Set<number>>();

  synPackets.forEach(p => {
    if (p.source?.ip && p.destination?.port) {
      if (!sourceIPs.has(p.source.ip)) {
        sourceIPs.set(p.source.ip, new Set());
      }
      sourceIPs.get(p.source.ip)!.add(p.destination.port);
    }
  });

  sourceIPs.forEach((ports, ip) => {
    if (ports.size > 10) {
      threats.push({
        type: 'Port Scan',
        severity: 'HIGH',
        source: ip,
        description: `Potential port scan detected from ${ip} targeting ${ports.size} different ports`,
        ports_scanned: Array.from(ports).slice(0, 20),
        timestamp: new Date().toISOString()
      });
    }
  });

  // 2. DDoS Detection (high packet rate from single source)
  const packetsBySource = new Map<string, number>();
  packets.forEach(p => {
    if (p.source?.ip) {
      packetsBySource.set(p.source.ip, (packetsBySource.get(p.source.ip) || 0) + 1);
    }
  });

  packetsBySource.forEach((count, ip) => {
    if (count > 50) {
      threats.push({
        type: 'Possible DDoS',
        severity: 'CRITICAL',
        source: ip,
        description: `High packet rate detected from ${ip}: ${count} packets`,
        packet_count: count,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 3. Suspicious Ports
  const suspiciousPorts = [4444, 5555, 6666, 31337, 12345, 1337]; // Common backdoor ports
  packets.forEach(p => {
    if (p.destination?.port && suspiciousPorts.includes(p.destination.port)) {
      threats.push({
        type: 'Suspicious Port',
        severity: 'MEDIUM',
        source: p.source?.ip || 'unknown',
        destination: p.destination?.ip || 'unknown',
        port: p.destination.port,
        description: `Traffic to suspicious port ${p.destination.port}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 4. Large Data Transfer
  packets.forEach(p => {
    if (p.length > 5000) {
      threats.push({
        type: 'Large Data Transfer',
        severity: 'INFO',
        source: p.source?.ip || 'unknown',
        destination: p.destination?.ip || 'unknown',
        size: p.length,
        description: `Large packet detected: ${p.length} bytes`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 5. Abnormal DNS Traffic
  const dnsPackets = packets.filter(p => p.destination?.port === 53 || p.source?.port === 53);
  if (dnsPackets.length > 30) {
    threats.push({
      type: 'Excessive DNS Queries',
      severity: 'MEDIUM',
      description: `High volume of DNS queries detected: ${dnsPackets.length} packets`,
      packet_count: dnsPackets.length,
      timestamp: new Date().toISOString()
    });
  }

  return threats;
}

// Get protocol statistics
function getProtocolStats(packets: any[]): any {
  const stats: any = {};
  packets.forEach(p => {
    stats[p.protocol] = (stats[p.protocol] || 0) + 1;
  });
  return stats;
}

// Get top source IPs
function getTopSources(packets: any[]): any[] {
  const sources = new Map<string, number>();
  packets.forEach(p => {
    if (p.source?.ip) {
      sources.set(p.source.ip, (sources.get(p.source.ip) || 0) + 1);
    }
  });

  return Array.from(sources.entries())
    .map(([ip, count]) => ({ ip, packets: count }))
    .sort((a, b) => b.packets - a.packets)
    .slice(0, 10);
}

// Get top destination IPs
function getTopDestinations(packets: any[]): any[] {
  const destinations = new Map<string, number>();
  packets.forEach(p => {
    if (p.destination?.ip) {
      destinations.set(p.destination.ip, (destinations.get(p.destination.ip) || 0) + 1);
    }
  });

  return Array.from(destinations.entries())
    .map(([ip, count]) => ({ ip, packets: count }))
    .sort((a, b) => b.packets - a.packets)
    .slice(0, 10);
}
