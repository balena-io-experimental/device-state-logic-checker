import { stdin } from 'process';

stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf-8');

enum DeviceStatus {
    Offline = 'Offline',
    Online = 'Online',
}

enum VpnStatus {
    Offline = 'Offline',
    Online = 'Online',
}

enum HeartbeatStatus {
    Offline = 'Offline',
    Online = 'Online',
    Timeout = 'Timeout',
    Unknown = 'Unknown',
}

// default states for a new device...
let heartbeatStatus: HeartbeatStatus = HeartbeatStatus.Unknown;
let safeShutdownTimestamp: Date | null = null;
let vpnEnabled: boolean = true;
let vpnStatus: VpnStatus = VpnStatus.Offline;

stdin.on('data', (key) => {
    const c = key.toString().trim();
    console.log("Input:", c)
      
    switch(c) {
        case 'q':
            process.stdin.setRawMode(false)
            process.exit()
            break;
        case 'v':
            vpnStatus = vpnStatus === VpnStatus.Online ? VpnStatus.Offline : VpnStatus.Online
            break;
        case 'V':
            vpnEnabled = !vpnEnabled
            break;
        case 'h':
            heartbeatStatus = heartbeatStatus === HeartbeatStatus.Online ? HeartbeatStatus.Timeout : heartbeatStatus === HeartbeatStatus.Timeout ? HeartbeatStatus.Offline : HeartbeatStatus.Online;
            break;
        case 's':
            safeShutdownTimestamp = safeShutdownTimestamp === null ? new Date() : null;
            break;
        default:
            console.log(`Unknown option '${c}', expects v,h,s`);
            break;
    }

    console.log("================\n", {
        state: evaluateState(),
        vpnStatus,
        heartbeatStatus,
        safeShutdownTimestamp,
        vpnEnabled,
    })
})

interface StatusParams {
    vpnStatus: VpnStatus
    heartbeatStatus: HeartbeatStatus
    vpnEnabled: boolean
    safeShutdownTimestamp: Date | null
}

const isOverallOnline = ({
    safeShutdownTimestamp,
    vpnStatus,
    heartbeatStatus,
}:StatusParams) =>
    (
        !safeShutdownTimestamp &&
        (vpnStatus === VpnStatus.Online || heartbeatStatus === HeartbeatStatus.Online || heartbeatStatus === HeartbeatStatus.Timeout)
    ) ||
    safeShutdownTimestamp && vpnStatus === VpnStatus.Online; // ignore the heartbeat during safe shutdown

const getOverallOnlineWarning = (props:StatusParams) => {
    const {
        safeShutdownTimestamp,
        vpnEnabled,
        vpnStatus,
        heartbeatStatus,
    } = props;
    if (!vpnEnabled && vpnStatus === VpnStatus.Online) {
        return {
            level: 'heavy',
            message: `vpn is on when it shouldn't be`
        }
    }
    if (vpnEnabled && vpnStatus === VpnStatus.Offline && heartbeatStatus === HeartbeatStatus.Online) {
        return {
            level: 'light',
            message: `VPN connectivity issue` // if it persists, it is a cloud link issue
        }
    }
    if (vpnStatus === VpnStatus.Online && heartbeatStatus === HeartbeatStatus.Timeout) {
        return {
            level: 'light',
            message: `possible supervisor/network problem`
        }
    }
    if (vpnStatus === VpnStatus.Online && (heartbeatStatus === HeartbeatStatus.Offline || heartbeatStatus === HeartbeatStatus.Unknown)) {
        return {
            level: 'medium',
            message: `supervisor problem`
        }
    }
    if (!safeShutdownTimestamp && vpnStatus === VpnStatus.Offline && heartbeatStatus === HeartbeatStatus.Timeout) {
        return {
            level: 'light',
            message: `supervisor problem or unsafe shutdown`
        }
    }
};

const evaluateState = () => {
    // const isVpnInCorrectState = () => (vpnEnabled && vpnStatus === VpnStatus.Online) || (!vpnEnabled && vpnStatus === VpnStatus.Offline);


    const status = isOverallOnline({safeShutdownTimestamp, vpnStatus, heartbeatStatus, vpnEnabled}) ? 'Online' : 'Offline';
    let warning;
    if (status === 'Online') {
        // get warnings
        warning = getOverallOnlineWarning({safeShutdownTimestamp, vpnStatus, heartbeatStatus, vpnEnabled});
    }
   
   return {
       status,
       warning,
   } 
}

console.log("================\n", {
    state: evaluateState(),
    vpnStatus,
    heartbeatStatus,
    safeShutdownTimestamp,
    vpnEnabled,
})
