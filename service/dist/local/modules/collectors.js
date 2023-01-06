import { SerialPort, ReadlineParser } from 'serialport';
class DataCollector {
    params;
    constructor(params) {
        this.params = params;
    }
    send(data) {
        console.log(data);
    }
}
class SerialCollector extends DataCollector {
    params;
    port;
    parser;
    constructor(params) {
        super(params);
        this.params = params;
        const { path, baudRate } = params;
        this.port = new SerialPort({ path, baudRate });
        this.parser = this.port.pipe(this.fetchParser());
        this.parser.on('data', this.send);
    }
}
export class GenericSerialCollector extends SerialCollector {
    params;
    constructor(params) {
        super(params);
        this.params = params;
    }
    fetchParser() {
        return new ReadlineParser({ delimiter: '\r\n' });
    }
}
