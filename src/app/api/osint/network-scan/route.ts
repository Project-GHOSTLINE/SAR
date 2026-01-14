// API: OSINT Network Scanner
// GET /api/osint/network-scan
// Scanne les devices connectés au réseau WiFi

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { osintAuthMiddleware } from '@/middleware/osint-auth'

const execAsync = promisify(exec);

// Database de fabricants basé sur MAC address
const macVendors: Record<string, string> = {
  '00:1A:11': 'Google',
  '00:50:F2': 'Microsoft',
  '3C:22:FB': 'Apple',
  '00:17:F2': 'Apple',
  'AC:DE:48': 'Apple',
  'F0:18:98': 'Apple',
  '00:1B:63': 'Apple',
  '28:6A:BA': 'Apple',
  '00:0A:95': 'Apple',
  '00:1E:C2': 'Apple',
  '00:25:00': 'Apple',
  '00:26:BB': 'Apple',
  '04:0C:CE': 'Apple',
  '08:00:07': 'Apple',
  '0C:3E:9F': 'Apple',
  '10:DD:B1': 'Apple',
  '14:10:9F': 'Apple',
  '18:34:51': 'Apple',
  '1C:AB:A7': 'Apple',
  '20:C9:D0': 'Apple',
  '24:A2:E1': 'Apple',
  '28:E1:4C': 'Apple',
  '2C:BE:08': 'Apple',
  '30:F7:C5': 'Apple',
  '34:15:9E': 'Apple',
  '38:48:4C': 'Apple',
  '3C:07:54': 'Apple',
  '40:30:04': 'Apple',
  '44:00:10': 'Apple',
  '48:43:7C': 'Apple',
  '4C:74:BF': 'Apple',
  '50:EA:D6': 'Apple',
  '54:26:96': 'Apple',
  '58:55:CA': 'Apple',
  '5C:59:48': 'Apple',
  '60:03:08': 'Apple',
  '64:20:0C': 'Apple',
  '68:5B:35': 'Apple',
  '6C:40:08': 'Apple',
  '70:56:81': 'Apple',
  '74:1B:B2': 'Apple',
  '78:3A:84': 'Apple',
  '7C:04:D0': 'Apple',
  '80:49:71': 'Apple',
  '84:38:35': 'Apple',
  '88:1F:A1': 'Apple',
  '8C:58:77': 'Apple',
  '90:27:E4': 'Apple',
  '94:E9:6A': 'Apple',
  '98:F0:AB': 'Apple',
  '9C:20:7B': 'Apple',
  'A0:99:9B': 'Apple',
  'A4:5E:60': 'Apple',
  'A8:86:DD': 'Apple',
  'AC:61:EA': 'Apple',
  'B0:34:95': 'Apple',
  'B4:18:D1': 'Apple',
  'B8:09:8A': 'Apple',
  'BC:3B:AF': 'Apple',
  'C0:1A:DA': 'Apple',
  'C4:2C:03': 'Apple',
  'C8:2A:14': 'Apple',
  'CC:08:E0': 'Apple',
  'D0:03:4B': 'Apple',
  'D4:9A:20': 'Apple',
  'D8:30:62': 'Apple',
  'DC:2B:2A': 'Apple',
  'E0:AC:CB': 'Apple',
  'E4:25:E7': 'Apple',
  'E8:80:2E': 'Apple',
  'EC:35:86': 'Apple',
  'F0:DB:F8': 'Apple',
  'F4:0F:24': 'Apple',
  'F8:1E:DF': 'Apple',
  'FC:25:3F': 'Apple',
  '00:04:20': 'Roku',
  '00:0D:4B': 'Roku',
  'B0:A7:37': 'Roku',
  '00:11:D9': 'Roku',
  '00:D0:CB': 'Cisco',
  '00:01:42': 'Cisco',
  '00:E0:1E': 'Cisco',
  '00:1C:0E': 'Cisco',
  '28:6C:07': 'Cisco',
  '00:04:5A': 'Linksys',
  '00:06:25': 'Linksys',
  '00:12:17': 'Linksys',
  '00:13:10': 'Linksys',
  '00:14:BF': 'Linksys',
  '00:15:E9': 'Linksys',
  '00:16:B6': 'Linksys',
  '00:18:39': 'Linksys',
  '00:18:F8': 'Linksys',
  '00:1A:70': 'Linksys',
  '00:1C:10': 'Linksys',
  '00:1D:7E': 'Linksys',
  '00:1E:E5': 'Linksys',
  '00:20:E0': 'Linksys',
  '00:21:29': 'Linksys',
  '00:22:6B': 'Linksys',
  '00:23:69': 'Linksys',
  '00:25:9C': 'Linksys',
  '68:7F:74': 'Linksys',
  'C0:C1:C0': 'Linksys',
  '00:0C:41': 'TP-Link',
  '00:27:19': 'TP-Link',
  '10:FE:ED': 'TP-Link',
  '14:CF:92': 'TP-Link',
  '1C:3B:F3': 'TP-Link',
  '50:C7:BF': 'TP-Link',
  '54:A0:50': 'TP-Link',
  '60:E3:27': 'TP-Link',
  '64:70:02': 'TP-Link',
  '74:DA:88': 'TP-Link',
  '98:DA:C4': 'TP-Link',
  'A0:F3:C1': 'TP-Link',
  'C4:6E:1F': 'TP-Link',
  'E8:48:B8': 'TP-Link',
  'F4:F2:6D': 'TP-Link',
  '00:17:88': 'Philips Hue',
  '00:1F:3F': 'Samsung',
  '00:1B:98': 'Samsung',
  '34:23:BA': 'Samsung',
  '5C:0A:5B': 'Samsung',
  '78:1F:DB': 'Samsung',
  '88:32:9B': 'Samsung',
  'B4:EF:39': 'Samsung',
  'E8:50:8B': 'Samsung',
  '00:1C:B3': 'Amazon',
  '44:65:0D': 'Amazon Echo',
  '4C:EF:C0': 'Amazon',
  '74:C2:46': 'Amazon',
  'F0:27:2D': 'Amazon',
  '00:1B:21': 'Intel',
  '00:13:CE': 'Intel',
  '00:15:00': 'Intel',
  '00:16:76': 'Intel',
  '00:19:D1': 'Intel',
  '00:1B:77': 'Intel',
  '00:1E:64': 'Intel',
  '00:1F:3C': 'Intel',
  '00:21:5C': 'Intel',
  '00:23:14': 'Intel',
  '00:24:D7': 'Intel',
  '00:26:C6': 'Intel',
  '00:27:10': 'Intel',
  'AC:7B:A1': 'Intel',
  'B4:B6:76': 'Intel',
  'C4:85:08': 'Intel',
  'D0:50:99': 'Intel',
  'EC:A8:6B': 'Intel',
};

function getMacVendor(mac: string): string {
  const prefix = mac.substring(0, 8).toUpperCase();
  return macVendors[prefix] || 'Unknown';
}

function getDeviceType(mac: string, hostname: string): string {
  const vendor = getMacVendor(mac).toLowerCase();
  const name = hostname.toLowerCase();

  if (vendor.includes('apple') || name.includes('iphone') || name.includes('ipad') || name.includes('macbook')) {
    if (name.includes('iphone')) return 'iPhone';
    if (name.includes('ipad')) return 'iPad';
    if (name.includes('mac') || name.includes('macbook')) return 'Mac Computer';
    return 'Apple Device';
  }

  if (vendor.includes('samsung')) return 'Samsung Device';
  if (vendor.includes('amazon') || vendor.includes('echo')) return 'Amazon Echo';
  if (vendor.includes('roku')) return 'Roku Streaming';
  if (vendor.includes('philips') || name.includes('hue')) return 'Smart Light';
  if (vendor.includes('cisco') || vendor.includes('linksys') || vendor.includes('tp-link')) return 'Router/Switch';
  if (vendor.includes('intel')) return 'Computer';

  if (name.includes('phone') || name.includes('mobile')) return 'Mobile Phone';
  if (name.includes('tv') || name.includes('roku')) return 'Smart TV';
  if (name.includes('watch')) return 'Smart Watch';
  if (name.includes('pc') || name.includes('desktop')) return 'Desktop Computer';
  if (name.includes('laptop')) return 'Laptop';
  if (name.includes('printer')) return 'Printer';

  return 'Unknown Device';
}

export async function GET(request: NextRequest) {
  // 🔐 Security: Check authentication
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError

  try {
    // Get ARP table
    const { stdout: arpOutput } = await execAsync('arp -a');

    // Get current network info
    const { stdout: ifconfigOutput } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1');

    // Parse network info
    const networkLines = ifconfigOutput.trim().split('\n');
    const localIPs = networkLines.map(line => {
      const match = line.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean);

    // Parse ARP table
    const arpLines = arpOutput.split('\n').filter(line => line.includes('at'));

    const devices = [];

    for (const line of arpLines) {
      // Format: hostname (ip) at mac on interface
      const match = line.match(/(.+?)\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]+)/i);

      if (match) {
        const [, hostname, ip, mac] = match;
        const vendor = getMacVendor(mac);
        const deviceType = getDeviceType(mac, hostname);
        const isLocal = localIPs.includes(ip);

        devices.push({
          hostname: hostname.trim(),
          ip,
          mac: mac.toUpperCase(),
          vendor,
          deviceType,
          isLocal,
          status: 'online',
          lastSeen: new Date().toISOString()
        });
      }
    }

    // Sort: local devices first, then by IP
    devices.sort((a, b) => {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      return a.ip.localeCompare(b.ip);
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      network: {
        localIPs,
        totalDevices: devices.length,
        onlineDevices: devices.length
      },
      devices
    });

  } catch (error: any) {
    console.error('Network scan error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        devices: []
      },
      { status: 500 }
    );
  }
}
