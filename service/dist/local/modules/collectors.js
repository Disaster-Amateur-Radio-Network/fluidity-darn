import { SerialPort, ReadlineParser } from 'serialport';
import { fetchLogger } from '#@shared/modules/logger.js';
import { config } from '#@shared/modules/config.js';
const conf = await config();
const log = fetchLogger(conf);
const isSRSOptions = (obj) => {
    return Array.isArray(obj?.portmap);
};
class DataCollector {
    params;
    constructor(params) {
        this.params = params;
        log.error(params);
        ['targets', 'site', 'label', 'collectorType', 'keepRaw'].forEach(p => {
            if (typeof params?.[p] === 'undefined') {
                throw new Error(`DataCollector constructor - required param: [${p}] undefined`);
            }
        });
    }
    format(data) {
        return [{ display: 1, field: data }];
    }
    addTS(delimData) {
        return delimData;
    }
    sendHttps(fPacket) {
        log.debug(fPacket);
    }
    send(data) {
        const { site, label, collectorType, targets, keepRaw } = this.params;
        const delimData = this.params.omitTS ? this.format(data) : this.addTS(this.format(data));
        try {
            targets.forEach(t => {
                if (new URL(t.location).protocol === 'https:') {
                    log.debug(`location: ${t.location}, `);
                    this.sendHttps({
                        site,
                        label,
                        collectorType,
                        delimData: delimData,
                        rawData: keepRaw ? data : null
                    });
                }
                else {
                    throw new Error(`unsupported protocol in target location: ${t.location}`);
                }
            });
        }
        catch (err) {
            log.error(err);
        }
    }
}
class SerialCollector extends DataCollector {
    port;
    parser;
    constructor({ path, baudRate, ...params }) {
        super(params);
        if (!path)
            throw new Error(`missing serial port identifier for ${params.collectorType}: ${params.label}`);
        if (!baudRate)
            throw new Error(`port speed for ${params.collectorType}: ${params.label}`);
        this.port = new SerialPort({ path, baudRate });
        this.parser = this.port.pipe(this.fetchParser());
    }
    listen() {
        this.parser.on('data', this.send.bind(this));
    }
}
export class GenericSerialCollector extends SerialCollector {
    constructor(params) {
        super(params);
    }
    fetchParser() {
        return new ReadlineParser({ delimiter: '\n' });
    }
}
export class SRSserialCollector extends SerialCollector {
    constructor(params) {
        super(params);
    }
    format(data) {
        if (isSRSOptions(this.params.extendedOptions)) {
            const { portmap } = this.params.extendedOptions;
        }
        return [{ display: 99, field: data }];
    }
    fetchParser() {
        return new ReadlineParser({ delimiter: '\r\n' });
    }
}
