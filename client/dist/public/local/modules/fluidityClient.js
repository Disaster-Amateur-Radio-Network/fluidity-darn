import { fetchLogger, confFromDOM } from '#@shared/modules/appResources.js';
const { conf } = confFromDOM();
const log = fetchLogger(conf);
class FluidityStorage {
}
class FluidityNetwork {
}
class FluidityUI {
}
export class FluidityClient {
    constructor() {
        this.ui = new FluidityUI();
        this.net = new FluidityNetwork();
        this.storage = new FluidityStorage();
    }
    sayHi() {
        log.info('Hi there !');
    }
}
//# sourceMappingURL=fluidityClient.js.map