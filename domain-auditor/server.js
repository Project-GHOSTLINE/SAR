const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = 3333;

app.use(express.json());
app.use(express.static('.'));

// API endpoint pour auditer un domaine
app.post('/api/audit', async (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  console.log(`🔍 Auditing domain: ${domain}`);

  try {
    const results = {
      domain,
      timestamp: new Date().toISOString(),
      curl: {},
      dns: {},
      whois: {},
      ssl: {},
      subdomains: []
    };

    // 1. CURL Analysis
    console.log('  → Running curl...');
    try {
      const curlCmd = `curl -v -w "\\n\\nPERF_DNS:%{time_namelookup}\\nPERF_TCP:%{time_connect}\\nPERF_TLS:%{time_appconnect}\\nPERF_SERVER:%{time_starttransfer}\\nPERF_TOTAL:%{time_total}\\nPERF_IP:%{remote_ip}\\nPERF_CODE:%{http_code}\\nPERF_SPEED:%{speed_download}\\nPERF_SIZE:%{size_download}" -o /dev/null -s https://${domain} 2>&1`;
      const { stdout: curlOutput } = await execPromise(curlCmd);

      // Parse curl output
      const sslMatch = curlOutput.match(/SSL connection using ([\w.\/\-]+)/);
      const issuerMatch = curlOutput.match(/issuer: (.+)/);
      const subjectMatch = curlOutput.match(/subject: (.+)/);
      const expireMatch = curlOutput.match(/expire date: (.+)/);
      const httpMatch = curlOutput.match(/< HTTP\/(\S+) (\d+)/);
      const serverMatch = curlOutput.match(/< server: (.+)/);

      // Parse performance data
      const perfData = {};
      curlOutput.split('\n').forEach(line => {
        if (line.startsWith('PERF_')) {
          const [key, value] = line.split(':');
          perfData[key.replace('PERF_', '').toLowerCase()] = value;
        }
      });

      results.curl = {
        ssl_version: sslMatch ? sslMatch[1] : 'Unknown',
        issuer: issuerMatch ? issuerMatch[1].trim() : 'Unknown',
        subject: subjectMatch ? subjectMatch[1].trim() : 'Unknown',
        expire_date: expireMatch ? expireMatch[1].trim() : 'Unknown',
        http_version: httpMatch ? `HTTP/${httpMatch[1]}` : 'Unknown',
        status_code: httpMatch ? parseInt(httpMatch[2]) : 0,
        server: serverMatch ? serverMatch[1].trim() : 'Unknown',
        performance: {
          dns_ms: parseFloat(perfData.dns || 0) * 1000,
          tcp_ms: parseFloat(perfData.tcp || 0) * 1000,
          tls_ms: parseFloat(perfData.tls || 0) * 1000,
          server_ms: parseFloat(perfData.server || 0) * 1000,
          total_ms: parseFloat(perfData.total || 0) * 1000,
          speed_bps: parseInt(perfData.speed || 0),
          size_bytes: parseInt(perfData.size || 0)
        },
        ip: perfData.ip || 'Unknown'
      };
    } catch (error) {
      results.curl.error = error.message;
    }

    // 2. DNS Analysis
    console.log('  → Running dig...');
    try {
      const [aRecords, mxRecords, nsRecords] = await Promise.all([
        execPromise(`dig +short ${domain}`),
        execPromise(`dig +short ${domain} MX`),
        execPromise(`dig +short ${domain} NS`)
      ]);

      results.dns = {
        a_records: aRecords.stdout.trim().split('\n').filter(Boolean),
        mx_records: mxRecords.stdout.trim().split('\n').filter(Boolean),
        nameservers: nsRecords.stdout.trim().split('\n').filter(Boolean)
      };
    } catch (error) {
      results.dns.error = error.message;
    }

    // 3. WHOIS
    console.log('  → Running whois...');
    try {
      const { stdout: whoisOutput } = await execPromise(`whois ${domain}`);
      const createdMatch = whoisOutput.match(/Creation Date: (.+)/i);
      const expiryMatch = whoisOutput.match(/Registry Expiry Date: (.+)/i);
      const registrarMatch = whoisOutput.match(/Registrar: (.+)/i);

      results.whois = {
        registrar: registrarMatch ? registrarMatch[1].trim() : 'Unknown',
        created: createdMatch ? createdMatch[1].trim() : 'Unknown',
        expires: expiryMatch ? expiryMatch[1].trim() : 'Unknown'
      };
    } catch (error) {
      results.whois.error = error.message;
    }

    // 4. Subdomain Discovery
    console.log('  → Discovering subdomains...');
    const subdomains = ['www', 'api', 'mail', 'admin', 'app', 'blog'];
    const subdomainPromises = subdomains.map(async (sub) => {
      try {
        const { stdout } = await execPromise(`dig +short ${sub}.${domain} | head -1`);
        const result = stdout.trim();
        if (result) {
          return { subdomain: `${sub}.${domain}`, value: result };
        }
      } catch (error) {
        return null;
      }
      return null;
    });

    const subdomainResults = await Promise.all(subdomainPromises);
    results.subdomains = subdomainResults.filter(Boolean);

    // 5. IP Geolocation
    console.log('  → Getting IP geolocation...');
    if (results.curl.ip && results.curl.ip !== 'Unknown') {
      try {
        const { stdout: geoOutput } = await execPromise(`curl -s "https://ipapi.co/${results.curl.ip}/json/"`);
        const geoData = JSON.parse(geoOutput);
        results.geolocation = {
          city: geoData.city,
          region: geoData.region,
          country: geoData.country_name,
          asn: geoData.asn,
          org: geoData.org
        };
      } catch (error) {
        results.geolocation = { error: 'Rate limited or unavailable' };
      }
    }

    // Calculate scores
    results.scores = {
      performance: results.curl.performance?.total_ms < 100 ? 'A+' :
                   results.curl.performance?.total_ms < 200 ? 'A' :
                   results.curl.performance?.total_ms < 500 ? 'B' : 'C',
      ssl: results.curl.ssl_version?.includes('TLSv1.3') ? 'A+' :
           results.curl.ssl_version?.includes('TLSv1.2') ? 'A' : 'B',
      overall: 'A'
    };

    console.log(`✅ Audit complete for ${domain}`);
    res.json(results);

  } catch (error) {
    console.error('❌ Audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔍 DOMAIN AUDITOR - Interface Locale                     ║
╠═══════════════════════════════════════════════════════════╣
║  Server started on: http://localhost:${PORT}                 ║
║                                                           ║
║  📖 Open in browser: http://localhost:${PORT}/index.html     ║
║                                                           ║
║  API Endpoint: POST http://localhost:${PORT}/api/audit       ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
