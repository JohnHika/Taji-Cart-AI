/**
 * This utility function converts a MongoDB SRV connection string to a direct connection format
 * Use this when experiencing DNS resolution issues with SRV records
 */
export function convertSrvToDirectConnect(srvUri) {
    try {
        // Only process if it's an SRV URI
        if (!srvUri.includes('mongodb+srv://')) {
            return srvUri;
        }

        // Extract credentials and hostname
        const withoutProtocol = srvUri.replace('mongodb+srv://', '');
        const credentialsAndHost = withoutProtocol.split('/')[0];
        const dbPath = withoutProtocol.includes('/') ? '/' + withoutProtocol.split('/').slice(1).join('/') : '';
        
        // Extract username, password, and host
        let username = '';
        let password = '';
        let host = credentialsAndHost;
        
        if (credentialsAndHost.includes('@')) {
            const parts = credentialsAndHost.split('@');
            host = parts[1];
            
            if (parts[0].includes(':')) {
                const authParts = parts[0].split(':');
                username = authParts[0];
                password = authParts[1];
            } else {
                username = parts[0];
            }
        }
        
        // Get the cluster identifier (e.g., "ja3g2") from the host
        const clusterMatch = host.match(/([a-z0-9]+)\.mongodb\.net/i);
        const clusterId = clusterMatch && clusterMatch[1] ? clusterMatch[1] : 'ja3g2'; // Default to ja3g2 if not found
        
        // Parse host base name (e.g., "el-roi-one-hardware")
        const hostBaseName = host.replace(`.${clusterId}.mongodb.net`, '');
        
        // For MongoDB Atlas, standard ports are 27017, 27018, 27019
        const directUri = `mongodb://${
            username ? `${username}${password ? ':' + password : ''}@` : ''
        }${
            hostBaseName + `-shard-00-00.${clusterId}.mongodb.net:27017,` +
            hostBaseName + `-shard-00-01.${clusterId}.mongodb.net:27017,` +
            hostBaseName + `-shard-00-02.${clusterId}.mongodb.net:27017`
        }${dbPath}?ssl=true&replicaSet=atlas-${hostBaseName.split('-')[0]}-shard-0&authSource=admin`;
        
        console.log('Converted to direct connection string');
        console.log('Direct URI (secure): ' + directUri.replace(/:([^:@]+)@/, ':****@')); // Log sanitized URI
        return directUri;
    } catch (error) {
        console.error('Error converting SRV to direct connect:', error);
        return srvUri; // Return original on error
    }
}

/**
 * Diagnose MongoDB connection issues
 * @param {string} uri - The MongoDB connection URI
 * @returns {Promise<object>} - Diagnostic information
 */
export async function diagnoseMongoDB(uri) {
    const dns = await import('dns').then(m => m.promises);
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        networkConnectivity: 'unknown',
        dnsResolution: {},
        hostnameCheck: {},
        pingResults: {}
    };
    
    // Check basic internet connectivity
    try {
        await dns.lookup('google.com');
        diagnostics.networkConnectivity = 'available';
    } catch (error) {
        diagnostics.networkConnectivity = 'unavailable';
        console.log('❌ No internet connectivity detected');
        return diagnostics;
    }
    
    // Extract hostname for diagnosis
    let hostname = '';
    if (uri.includes('@')) {
        hostname = uri.split('@')[1].split('/')[0];
    } else if (uri.includes('://')) {
        hostname = uri.split('://')[1].split('/')[0];
    }
    
    if (hostname.includes(':')) {
        hostname = hostname.split(':')[0];
    }
    
    // Extract cluster hosts if it's Atlas
    const hosts = [];
    if (uri.includes('mongodb+srv://')) {
        const baseDomain = hostname;
        // Try to resolve SRV records
        try {
            const records = await dns.resolveSrv(`_mongodb._tcp.${baseDomain}`);
            diagnostics.dnsResolution.srvRecords = records;
            records.forEach(record => hosts.push(record.name));
        } catch (error) {
            diagnostics.dnsResolution.srvError = error.code;
            console.log(`❌ Cannot resolve SRV records for ${baseDomain}: ${error.code}`);
            
            // If it's a MongoDB Atlas URI, try to construct the hosts
            if (baseDomain.includes('mongodb.net')) {
                const prefix = baseDomain.split('.')[0];
                const clusterMatch = baseDomain.match(/([a-z0-9]+)\.mongodb\.net/i);
                const clusterId = clusterMatch && clusterMatch[1] ? clusterMatch[1] : '';
                
                hosts.push(`${prefix}-shard-00-00.${clusterId}.mongodb.net`);
                hosts.push(`${prefix}-shard-00-01.${clusterId}.mongodb.net`);
                hosts.push(`${prefix}-shard-00-02.${clusterId}.mongodb.net`);
            }
        }
    } else if (uri.includes(',')) {
        // Direct connection string with multiple hosts
        const hostPart = hostname.includes(',') ? hostname : uri.split('?')[0];
        const hostList = hostPart.split(',').map(h => h.trim());
        hostList.forEach(h => {
            if (h.includes('@')) {
                hosts.push(h.split('@')[1].split(':')[0]);
            } else {
                hosts.push(h.split(':')[0]);
            }
        });
    } else {
        // Single host
        hosts.push(hostname);
    }
    
    // Check DNS resolution for each host
    for (const host of hosts) {
        try {
            const addresses = await dns.resolve4(host);
            diagnostics.hostnameCheck[host] = {
                resolvable: true,
                addresses
            };
        } catch (error) {
            diagnostics.hostnameCheck[host] = {
                resolvable: false,
                error: error.code
            };
            console.log(`❌ Cannot resolve hostname ${host}: ${error.code}`);
        }
        
        // Try to ping the host
        try {
            const pingCmd = process.platform === 'win32' 
                ? `ping -n 1 ${host}` 
                : `ping -c 1 -W 1 ${host}`;
            
            const { stdout } = await execAsync(pingCmd);
            diagnostics.pingResults[host] = {
                reachable: !stdout.includes('100% packet loss') && !stdout.includes('100% loss'),
                output: stdout
            };
        } catch (error) {
            diagnostics.pingResults[host] = {
                reachable: false,
                error: error.message
            };
        }
    }
    
    return diagnostics;
}
