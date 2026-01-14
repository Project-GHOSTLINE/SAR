// API: Network Trace - Real Network Analysis
// GET /api/network/trace - Get real network trace data

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const traces: any = {};

    // Get network interfaces
    try {
      const { stdout: ifconfig } = await execAsync('ifconfig');
      traces.interfaces = parseInterfaces(ifconfig);
    } catch (e) {
      traces.interfaces = [];
    }

    // Get routing table
    try {
      const { stdout: netstat } = await execAsync('netstat -rn');
      traces.routes = parseRoutes(netstat);
    } catch (e) {
      traces.routes = [];
    }

    // Get active connections
    try {
      const { stdout: lsof } = await execAsync('lsof -i -P -n | grep LISTEN | head -20');
      traces.listening_ports = parsePorts(lsof);
    } catch (e) {
      traces.listening_ports = [];
    }

    // Get DNS servers
    try {
      const { stdout: dns } = await execAsync('cat /etc/resolv.conf | grep nameserver');
      traces.dns_servers = dns.split('\n')
        .filter(l => l.includes('nameserver'))
        .map(l => l.split('nameserver')[1].trim());
    } catch (e) {
      traces.dns_servers = ['8.8.8.8'];
    }

    // Get ARP table
    try {
      const { stdout: arp } = await execAsync('arp -a');
      traces.arp_table = parseArp(arp);
    } catch (e) {
      traces.arp_table = [];
    }

    // Ping gateway (latency)
    try {
      const gateway = traces.routes.find((r: any) => r.destination === 'default')?.gateway;
      if (gateway) {
        const { stdout: ping } = await execAsync(`ping -c 3 ${gateway}`);
        traces.gateway_latency = parsePing(ping);
      }
    } catch (e) {
      traces.gateway_latency = { avg: 0, min: 0, max: 0 };
    }

    // Get current bandwidth usage
    try {
      const { stdout: netstat2 } = await execAsync('netstat -ib');
      traces.bandwidth = parseBandwidth(netstat2);
    } catch (e) {
      traces.bandwidth = {};
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      traces
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function parseInterfaces(output: string): any[] {
  const interfaces: any[] = [];
  const lines = output.split('\n');
  let current: any = null;

  for (const line of lines) {
    if (line.match(/^[a-z]+\d+:/)) {
      if (current) interfaces.push(current);
      const name = line.split(':')[0];
      current = { name, addresses: [] };
    } else if (current && line.includes('inet ')) {
      const match = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        current.addresses.push({ type: 'IPv4', address: match[1] });
      }
    } else if (current && line.includes('ether ')) {
      const match = line.match(/ether\s+([\da-f:]+)/);
      if (match) {
        current.mac = match[1];
      }
    }
  }

  if (current) interfaces.push(current);
  return interfaces;
}

function parseRoutes(output: string): any[] {
  const routes: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.match(/^\d+\.\d+\.\d+\.\d+/) || line.includes('default')) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        routes.push({
          destination: parts[0],
          gateway: parts[1],
          interface: parts[parts.length - 1]
        });
      }
    }
  }

  return routes;
}

function parsePorts(output: string): any[] {
  const ports: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length >= 9) {
      const address = parts[8];
      const match = address.match(/:(\d+)$/);
      if (match) {
        ports.push({
          process: parts[0],
          port: match[1],
          address: address.split(':')[0] || '*'
        });
      }
    }
  }

  return ports;
}

function parseArp(output: string): any[] {
  const arp: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([\da-f:]+)/);
    if (match) {
      arp.push({
        ip: match[1],
        mac: match[2]
      });
    }
  }

  return arp;
}

function parsePing(output: string): any {
  const match = output.match(/min\/avg\/max[^=]*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/);
  if (match) {
    return {
      min: parseFloat(match[1]),
      avg: parseFloat(match[2]),
      max: parseFloat(match[3])
    };
  }
  return { min: 0, avg: 0, max: 0 };
}

function parseBandwidth(output: string): any {
  const bandwidth: any = {};
  const lines = output.split('\n');

  for (const line of lines) {
    if (line.match(/^[a-z]+\d+/)) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 7) {
        bandwidth[parts[0]] = {
          ibytes: parseInt(parts[5]) || 0,
          obytes: parseInt(parts[6]) || 0
        };
      }
    }
  }

  return bandwidth;
}
