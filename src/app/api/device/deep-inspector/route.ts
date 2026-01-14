// API: Deep Device Inspector - Extract ALL device information
// GET /api/device/deep-inspector - Complete device inspection

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      device_model: {},
      operating_system: {},
      dns_info: {},
      browser_history: {},
      command_history: {},
      messages: {},
      app_usage: {},
      system_logs: {}
    };

    // Device Model & Hardware
    results.device_model = await getDeviceModel();

    // Operating System Details
    results.operating_system = await getOSDetails();

    // DNS Information
    results.dns_info = await getDNSInfo();

    // Browser History
    results.browser_history = await getBrowserHistory();

    // Command History
    results.command_history = await getCommandHistory();

    // Messages/SMS
    results.messages = await getMessages();

    // App Usage
    results.app_usage = await getAppUsage();

    // System Logs
    results.system_logs = await getSystemLogs();

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

// Get device model and hardware info
async function getDeviceModel(): Promise<any> {
  const info: any = {};

  try {
    // Hardware model
    const { stdout: model } = await execAsync('sysctl -n hw.model', { timeout: 2000 });
    info.model = model.trim();

    // Machine name
    const { stdout: machine } = await execAsync('sysctl -n hw.machine', { timeout: 2000 });
    info.machine = machine.trim();

    // Product name
    try {
      const { stdout: product } = await execAsync('system_profiler SPHardwareDataType | grep "Model Name"', { timeout: 3000 });
      info.product_name = product.replace('Model Name:', '').trim();
    } catch (e) {}

    // Model identifier
    try {
      const { stdout: identifier } = await execAsync('system_profiler SPHardwareDataType | grep "Model Identifier"', { timeout: 3000 });
      info.model_identifier = identifier.replace('Model Identifier:', '').trim();
    } catch (e) {}

    // Serial number
    const { stdout: serial } = await execAsync('ioreg -l | grep IOPlatformSerialNumber | awk \'{print $4}\' | tr -d \'"\'', { timeout: 2000 });
    info.serial_number = serial.trim();

    // UUID
    const { stdout: uuid } = await execAsync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', { timeout: 2000 });
    const uuidMatch = uuid.match(/"([^"]+)"/);
    if (uuidMatch) info.uuid = uuidMatch[1];

    // CPU
    const { stdout: cpu } = await execAsync('sysctl -n machdep.cpu.brand_string', { timeout: 2000 });
    info.cpu = cpu.trim();

    // CPU cores
    const { stdout: cores } = await execAsync('sysctl -n hw.ncpu', { timeout: 2000 });
    info.cpu_cores = cores.trim();

    // Memory
    const { stdout: mem } = await execAsync('sysctl -n hw.memsize', { timeout: 2000 });
    info.memory_bytes = mem.trim();
    info.memory_gb = (parseInt(mem.trim()) / 1024 / 1024 / 1024).toFixed(2);

  } catch (e: any) {
    info.error = e.message;
  }

  return info;
}

// Get OS details
async function getOSDetails(): Promise<any> {
  const info: any = {};

  try {
    // macOS version
    const { stdout: version } = await execAsync('sw_vers -productVersion', { timeout: 2000 });
    info.version = version.trim();

    // Build version
    const { stdout: build } = await execAsync('sw_vers -buildVersion', { timeout: 2000 });
    info.build = build.trim();

    // Product name
    const { stdout: product } = await execAsync('sw_vers -productName', { timeout: 2000 });
    info.product = product.trim();

    // Kernel version
    const { stdout: kernel } = await execAsync('uname -r', { timeout: 2000 });
    info.kernel = kernel.trim();

    // Uptime
    const { stdout: uptime } = await execAsync('uptime', { timeout: 2000 });
    info.uptime = uptime.trim();

    // Boot time
    const { stdout: boot } = await execAsync('sysctl -n kern.boottime', { timeout: 2000 });
    info.boot_time = boot.trim();

    // Hostname
    const { stdout: hostname } = await execAsync('hostname', { timeout: 2000 });
    info.hostname = hostname.trim();

    // Current user
    const { stdout: user } = await execAsync('whoami', { timeout: 2000 });
    info.current_user = user.trim();

    // All users
    const { stdout: users } = await execAsync('dscl . list /Users | grep -v "^_"', { timeout: 2000 });
    info.all_users = users.split('\n').filter(Boolean);

    // Timezone
    const { stdout: timezone } = await execAsync('systemsetup -gettimezone', { timeout: 2000 });
    info.timezone = timezone.trim();

    // Language
    const { stdout: lang } = await execAsync('defaults read -g AppleLanguages', { timeout: 2000 });
    info.language = lang.trim();

  } catch (e: any) {
    info.error = e.message;
  }

  return info;
}

// Get DNS information
async function getDNSInfo(): Promise<any> {
  const info: any = {
    current_dns: [],
    dns_history: [],
    dns_queries: []
  };

  try {
    // Current DNS servers
    const { stdout: dns } = await execAsync('scutil --dns | grep nameserver', { timeout: 2000 });
    info.current_dns = dns.match(/\d+\.\d+\.\d+\.\d+/g) || [];

    // DNS configuration details
    try {
      const { stdout: dnsConfig } = await execAsync('scutil --dns', { timeout: 3000 });
      info.dns_config = dnsConfig;
    } catch (e) {}

    // Check /etc/resolv.conf
    try {
      const resolvConf = await readFile('/etc/resolv.conf', 'utf-8');
      info.resolv_conf = resolvConf;
    } catch (e) {}

    // Recent DNS queries from log (if accessible)
    try {
      const { stdout: queries } = await execAsync('log show --predicate \'eventMessage contains "DNS"\' --last 1h --style compact 2>/dev/null | head -50', { timeout: 5000 });
      if (queries) {
        info.recent_queries = queries.split('\n').filter(Boolean).slice(0, 20);
      }
    } catch (e) {}

    // DNS cache
    try {
      const { stdout: cache } = await execAsync('dscacheutil -cachedump -entries Host 2>/dev/null | head -100', { timeout: 3000 });
      if (cache) {
        info.dns_cache = cache.split('\n').filter(Boolean).slice(0, 30);
      }
    } catch (e) {}

  } catch (e: any) {
    info.error = e.message;
  }

  return info;
}

// Get browser history
async function getBrowserHistory(): Promise<any> {
  const history: any = {
    safari: [],
    chrome: [],
    firefox: []
  };

  const homeDir = os.homedir();

  // Safari History
  try {
    const safariPath = join(homeDir, 'Library/Safari/History.db');
    const { stdout } = await execAsync(
      `sqlite3 "${safariPath}" "SELECT url, title, datetime(visit_time + 978307200, 'unixepoch', 'localtime') as visit_time FROM history_visits INNER JOIN history_items ON history_visits.history_item = history_items.id ORDER BY visit_time DESC LIMIT 50" 2>/dev/null`,
      { timeout: 5000 }
    );
    if (stdout) {
      history.safari = stdout.split('\n').filter(Boolean).map(line => {
        const parts = line.split('|');
        return {
          url: parts[0] || '',
          title: parts[1] || '',
          visit_time: parts[2] || ''
        };
      });
    }
  } catch (e: any) {
    history.safari = { error: 'Access denied or not found' };
  }

  // Chrome History
  try {
    const chromePath = join(homeDir, 'Library/Application Support/Google/Chrome/Default/History');
    // Copy to temp first (Chrome locks the file)
    const tempPath = '/tmp/chrome_history_temp';
    await execAsync(`cp "${chromePath}" "${tempPath}" 2>/dev/null`, { timeout: 2000 });
    const { stdout } = await execAsync(
      `sqlite3 "${tempPath}" "SELECT url, title, datetime(last_visit_time/1000000-11644473600, 'unixepoch', 'localtime') as last_visit FROM urls ORDER BY last_visit DESC LIMIT 50" 2>/dev/null`,
      { timeout: 5000 }
    );
    if (stdout) {
      history.chrome = stdout.split('\n').filter(Boolean).map(line => {
        const parts = line.split('|');
        return {
          url: parts[0] || '',
          title: parts[1] || '',
          last_visit: parts[2] || ''
        };
      });
    }
    await execAsync(`rm "${tempPath}" 2>/dev/null`, { timeout: 1000 });
  } catch (e: any) {
    history.chrome = { error: 'Access denied or not found' };
  }

  // Firefox History
  try {
    const { stdout: profilePath } = await execAsync(
      `find "${homeDir}/Library/Application Support/Firefox/Profiles" -name "*.default*" -type d 2>/dev/null | head -1`,
      { timeout: 3000 }
    );
    if (profilePath.trim()) {
      const firefoxPath = join(profilePath.trim(), 'places.sqlite');
      const tempPath = '/tmp/firefox_history_temp';
      await execAsync(`cp "${firefoxPath}" "${tempPath}" 2>/dev/null`, { timeout: 2000 });
      const { stdout } = await execAsync(
        `sqlite3 "${tempPath}" "SELECT url, title, datetime(last_visit_date/1000000, 'unixepoch', 'localtime') as last_visit FROM moz_places ORDER BY last_visit DESC LIMIT 50" 2>/dev/null`,
        { timeout: 5000 }
      );
      if (stdout) {
        history.firefox = stdout.split('\n').filter(Boolean).map(line => {
          const parts = line.split('|');
          return {
            url: parts[0] || '',
            title: parts[1] || '',
            last_visit: parts[2] || ''
          };
        });
      }
      await execAsync(`rm "${tempPath}" 2>/dev/null`, { timeout: 1000 });
    }
  } catch (e: any) {
    history.firefox = { error: 'Access denied or not found' };
  }

  return history;
}

// Get command history
async function getCommandHistory(): Promise<any> {
  const history: any = {
    bash: [],
    zsh: [],
    recent_commands: []
  };

  const homeDir = os.homedir();

  try {
    // Bash history
    try {
      const bashHistory = await readFile(join(homeDir, '.bash_history'), 'utf-8');
      history.bash = bashHistory.split('\n').filter(Boolean).slice(-100);
    } catch (e) {
      history.bash = { error: 'Not found' };
    }

    // Zsh history
    try {
      const zshHistory = await readFile(join(homeDir, '.zsh_history'), 'utf-8');
      history.zsh = zshHistory.split('\n').filter(Boolean).slice(-100);
    } catch (e) {
      history.zsh = { error: 'Not found' };
    }

    // Recent commands from history
    try {
      const { stdout } = await execAsync('history 100 2>/dev/null', { timeout: 2000 });
      if (stdout) {
        history.recent_commands = stdout.split('\n').filter(Boolean);
      }
    } catch (e) {}

  } catch (e: any) {
    history.error = e.message;
  }

  return history;
}

// Get messages/SMS
async function getMessages(): Promise<any> {
  const messages: any = {
    total_conversations: 0,
    recent_messages: [],
    contacts: []
  };

  const homeDir = os.homedir();

  try {
    const chatDbPath = join(homeDir, 'Library/Messages/chat.db');

    // Get total conversations
    try {
      const { stdout: count } = await execAsync(
        `sqlite3 "${chatDbPath}" "SELECT COUNT(*) FROM chat" 2>/dev/null`,
        { timeout: 3000 }
      );
      messages.total_conversations = parseInt(count.trim()) || 0;
    } catch (e) {}

    // Get recent messages
    try {
      const { stdout } = await execAsync(
        `sqlite3 "${chatDbPath}" "SELECT datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime') as date, text, is_from_me FROM message ORDER BY date DESC LIMIT 50" 2>/dev/null`,
        { timeout: 5000 }
      );
      if (stdout) {
        messages.recent_messages = stdout.split('\n').filter(Boolean).map(line => {
          const parts = line.split('|');
          return {
            date: parts[0] || '',
            text: parts[1] || '[Media/Attachment]',
            is_from_me: parts[2] === '1' ? 'Sent' : 'Received'
          };
        });
      }
    } catch (e: any) {
      messages.recent_messages = { error: 'Access denied - Full Disk Access required' };
    }

    // Get contacts
    try {
      const { stdout } = await execAsync(
        `sqlite3 "${chatDbPath}" "SELECT DISTINCT chat_identifier FROM chat LIMIT 50" 2>/dev/null`,
        { timeout: 3000 }
      );
      if (stdout) {
        messages.contacts = stdout.split('\n').filter(Boolean);
      }
    } catch (e) {}

  } catch (e: any) {
    messages.error = 'Messages database not accessible - Full Disk Access permission required';
  }

  return messages;
}

// Get app usage
async function getAppUsage(): Promise<any> {
  const usage: any = {
    running_apps: [],
    recent_apps: []
  };

  try {
    // Currently running apps
    const { stdout: running } = await execAsync('ps aux | grep ".app/Contents/MacOS" | grep -v grep', { timeout: 3000 });
    usage.running_apps = running.split('\n').filter(Boolean).map(line => {
      const match = line.match(/([^\/]+\.app)/);
      return match ? match[1] : null;
    }).filter(Boolean);

    // Recent apps from launchd
    try {
      const { stdout: recent } = await execAsync(
        'log show --predicate \'eventMessage contains "Application"\' --last 1h --style compact 2>/dev/null | grep -i "launched\\|opened" | head -20',
        { timeout: 5000 }
      );
      if (recent) {
        usage.recent_apps = recent.split('\n').filter(Boolean);
      }
    } catch (e) {}

  } catch (e: any) {
    usage.error = e.message;
  }

  return usage;
}

// Get system logs
async function getSystemLogs(): Promise<any> {
  const logs: any = {
    recent_errors: [],
    security_events: [],
    network_events: []
  };

  try {
    // Recent errors
    try {
      const { stdout: errors } = await execAsync(
        'log show --predicate \'messageType == error\' --last 1h --style compact 2>/dev/null | head -30',
        { timeout: 5000 }
      );
      if (errors) {
        logs.recent_errors = errors.split('\n').filter(Boolean);
      }
    } catch (e) {}

    // Security events
    try {
      const { stdout: security } = await execAsync(
        'log show --predicate \'subsystem == "com.apple.securityd"\' --last 1h --style compact 2>/dev/null | head -30',
        { timeout: 5000 }
      );
      if (security) {
        logs.security_events = security.split('\n').filter(Boolean);
      }
    } catch (e) {}

    // Network events
    try {
      const { stdout: network } = await execAsync(
        'log show --predicate \'subsystem == "com.apple.network"\' --last 1h --style compact 2>/dev/null | head -30',
        { timeout: 5000 }
      );
      if (network) {
        logs.network_events = network.split('\n').filter(Boolean);
      }
    } catch (e) {}

  } catch (e: any) {
    logs.error = e.message;
  }

  return logs;
}
