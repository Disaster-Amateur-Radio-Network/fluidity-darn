import { fetchLogger } from '#@shared/modules/logger.js';
import { confFromDOM } from '#@shared/modules/fluidityConfig.js';
import { isFluidityLink } from '#@shared/types.js';
const conf = confFromDOM();
const log = fetchLogger(conf);
class FuidityFiltering {
    constructor(firstPacketSeq) {
        var _a;
        this.firstPacketSeq = firstPacketSeq;
        this.siteIndex = new Map();
        this.collectorIndex = new Map();
        this.sitesClicked = new Set();
        this.collectorsClicked = new Set();
        this.stats = { visibileCount: 0, filterCount: 0 };
        this.lastPacketSeq = firstPacketSeq;
        (_a = document.getElementById('container-main')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', this.clickHandler.bind(this));
    }
    filtersClicked() {
        return Boolean(this.stats.filterCount);
    }
    renderFilterStats() {
        const visibileCountElem = document.getElementById('visibile-count');
        const filterCountElem = document.getElementById('filter-count');
        const { visibileCount, filterCount } = this.stats;
        if (visibileCountElem && filterCountElem) {
            visibileCountElem.innerText = visibileCount
                ? visibileCount.toString()
                : (this.lastPacketSeq - this.firstPacketSeq + 1).toString();
            filterCountElem.innerText = filterCount.toString();
        }
    }
    applyVisibility(target) {
        const visibileByCollector = new Set();
        const visibileBySite = new Set();
        const visibileGlobal = new Set();
        this.collectorsClicked.forEach(collector => {
            const seqs = this.collectorIndex.get(collector);
            if (seqs) {
                seqs.forEach(seq => visibileByCollector.add(seq));
            }
        });
        this.sitesClicked.forEach(site => {
            const seqs = this.siteIndex.get(site);
            if (seqs) {
                seqs.forEach(seq => visibileBySite.add(seq));
            }
        });
        if (visibileBySite.size && visibileByCollector.size) {
            visibileByCollector.forEach(cSeq => {
                if (visibileBySite.has(cSeq)) {
                    visibileGlobal.add(cSeq);
                }
            });
        }
        else if (visibileBySite.size) {
            visibileBySite.forEach(sSeq => {
                visibileGlobal.add(sSeq);
            });
        }
        else if (visibileByCollector.size) {
            visibileByCollector.forEach(cSeq => {
                visibileGlobal.add(cSeq);
            });
        }
        this.stats.visibileCount = visibileGlobal.size;
        console.debug('These packet SEQ#s should be visible:');
        console.debug(visibileGlobal);
        const applySingle = (fpElem) => {
            if (visibileGlobal.size) {
                if (visibileGlobal.has(parseInt(fpElem.id.substring(7)))) {
                    fpElem.classList.remove('hidden');
                }
                else {
                    fpElem.classList.add('hidden');
                }
            }
            else {
                fpElem.classList.remove('hidden');
            }
        };
        if (target instanceof HTMLDivElement) {
            applySingle(target);
        }
        else if (target instanceof NodeList) {
            target.forEach(element => {
                element instanceof HTMLDivElement && applySingle(element);
            });
        }
    }
    applyVisibilityAll() {
        this.applyVisibility(document.querySelectorAll('.fluidity-packet'));
    }
    loader(on) {
        const loaderElem = document.getElementById('loader');
        if (on) {
            loaderElem === null || loaderElem === void 0 ? void 0 : loaderElem.classList.add('loader');
        }
        else {
            setTimeout(() => {
                loaderElem === null || loaderElem === void 0 ? void 0 : loaderElem.classList.remove('loader');
            }, 250);
        }
    }
    clickHandler(e) {
        var _a;
        e.preventDefault();
        this.loader(true);
        const extractUnique = (type, id) => {
            const match = id.match(new RegExp(`(?:filter|clear)-${type.toLocaleLowerCase()}-(.*)`));
            if (Array.isArray(match) && match.length) {
                return match[1];
            }
            return;
        };
        if (e.target instanceof Element) {
            if (e.target.classList.contains('filter-link')) {
                if ((_a = e.target.previousElementSibling) === null || _a === void 0 ? void 0 : _a.classList.contains('clear-link')) {
                    e.target.previousElementSibling.classList.remove('hidden');
                }
            }
            if (e.target.classList.contains('clear-link')) {
                e.target.classList.add('hidden');
            }
            if (e.target.classList.contains('collector-filter-link')) {
                const collector = extractUnique('COLLECTOR', e.target.id);
                collector && this.collectorsClicked.add(collector);
            }
            if (e.target.classList.contains('collector-clear-filter-link')) {
                const collector = extractUnique('COLLECTOR', e.target.id);
                collector && this.collectorsClicked.delete(collector);
            }
            if (e.target.classList.contains('site-filter-link')) {
                const site = extractUnique('SITE', e.target.id);
                site && this.sitesClicked.add(site);
            }
            if (e.target.classList.contains('site-clear-filter-link')) {
                const site = extractUnique('SITE', e.target.id);
                site && this.sitesClicked.delete(site);
            }
            this.stats.filterCount = this.sitesClicked.size + this.collectorsClicked.size;
            this.applyVisibilityAll();
            this.renderFilterStats();
            this.loader(false);
        }
    }
    index(fp) {
        if (fp.seq) {
            this.lastPacketSeq = fp.seq;
            if (this.siteIndex.has(fp.site)) {
                const old = this.siteIndex.get(fp.site);
                if (old) {
                    this.siteIndex.set(fp.site, old.add(fp.seq));
                }
            }
            else {
                this.siteIndex.set(fp.site, new Set([fp.seq]));
            }
            if (this.collectorIndex.has(fp.plugin)) {
                const old = this.collectorIndex.get(fp.plugin);
                if (old) {
                    this.collectorIndex.set(fp.plugin, old.add(fp.seq));
                }
            }
            else {
                this.collectorIndex.set(fp.plugin, new Set([fp.seq]));
            }
        }
    }
    renderType(type, fp) {
        const ul = document.getElementById(`${type.toLocaleLowerCase()}-filter-list`);
        const li = document.createElement('li');
        const xIcon = document.createElement('i');
        const a = document.createElement('a');
        const typeIcon = document.createElement('i');
        xIcon.classList.add('fa-solid', 'fa-circle-xmark', `${type.toLocaleLowerCase()}-clear-filter-link`, 'clear-link', 'hidden');
        a.href = '#0';
        a.classList.add(`${type.toLocaleLowerCase()}-filter-link`, 'filter-link');
        typeIcon.classList.add('fa-solid');
        if (type === 'COLLECTOR') {
            xIcon.id = `clear-collector-${fp.plugin}`;
            a.innerText = fp.plugin;
            a.id = `filter-collector-${fp.plugin}`;
            typeIcon.classList.add('fa-circle-nodes');
        }
        else if (type === 'SITE') {
            xIcon.id = `clear-site-${fp.site}`;
            a.innerText = fp.site;
            a.id = `filter-site-${fp.site}`;
            typeIcon.classList.add('fa-tower-cell');
        }
        li.appendChild(xIcon);
        li.appendChild(a);
        li.appendChild(typeIcon);
        ul === null || ul === void 0 ? void 0 : ul.appendChild(li);
    }
    renderFilterLinks(fp) {
        if (!this.collectorIndex.has(fp.plugin)) {
            this.renderType('COLLECTOR', fp);
        }
        if (!this.siteIndex.has(fp.site)) {
            this.renderType('SITE', fp);
        }
        this.index(fp);
    }
}
export class FluidityUI {
    renderFormattedData(fArr) {
        const renderFormattedFrag = document.createDocumentFragment();
        const markupStringType = (field, suggestStyle = 0) => {
            const stringFrag = document.createDocumentFragment();
            const span = document.createElement('span');
            span.innerText = field;
            span.classList.add('fp-line', 'fp-string', `fp-color-${suggestStyle}`);
            stringFrag.appendChild(span);
            return stringFrag;
        };
        const markupLinkType = (field, suggestStyle = 0) => {
            const linkFrag = document.createDocumentFragment();
            const a = document.createElement('a');
            a.href = field.location;
            a.innerText = field.name;
            a.classList.add('fp-line', 'fp-link');
            return linkFrag;
        };
        const markupDateType = (field, suggestStyle = 0) => {
            const dateFrag = document.createDocumentFragment();
            const span = document.createElement('span');
            span.innerText = new Date(field).toLocaleTimeString();
            span.classList.add('fp-line', 'fp-date', `fp-color-${suggestStyle}`);
            return dateFrag;
        };
        fArr.forEach(f => {
            switch (f.fieldType) {
                case 'STRING':
                    typeof f.field === 'string' &&
                        renderFormattedFrag.appendChild(markupStringType(f.field, f.suggestStyle));
                    break;
                case 'LINK':
                    isFluidityLink(f.field) && renderFormattedFrag.appendChild(markupLinkType(f.field, f.suggestStyle));
                    break;
                case 'DATE':
                    typeof f.field === 'string' &&
                        renderFormattedFrag.appendChild(markupDateType(f.field, f.suggestStyle));
                    break;
                default:
                    renderFormattedFrag.appendChild(markupStringType(JSON.stringify(f.field)));
            }
        });
        return renderFormattedFrag;
    }
    packetRender(fp) {
        const mainFrag = document.createDocumentFragment();
        const div = document.createElement('div');
        this.ff.renderFilterLinks(fp);
        div.classList.add('fluidity-packet');
        if (fp.seq) {
            div.id = `fp-seq-${fp.seq}`;
        }
        this.ff.filtersClicked() && this.ff.applyVisibility(div);
        this.ff.renderFilterStats();
        const oBracket = document.createElement('span');
        oBracket.classList.add('bracket-open');
        oBracket.innerText = '[';
        div.appendChild(oBracket);
        const ts = document.createElement('span');
        ts.classList.add('date');
        ts.innerText = new Date(fp.ts).toLocaleTimeString();
        div.appendChild(ts);
        const cBracket = document.createElement('span');
        cBracket.classList.add('bracket-close');
        cBracket.innerText = ']';
        div.appendChild(cBracket);
        const site = document.createElement('span');
        site.classList.add('fp-line', 'site');
        site.innerText = fp.site + '(';
        div.appendChild(site);
        const description = document.createElement('span');
        description.classList.add('description');
        description.innerText = fp.description;
        div.appendChild(description);
        const closeParen = document.createElement('span');
        closeParen.classList.add('site');
        closeParen.innerText = ')';
        div.appendChild(closeParen);
        const colon = document.createElement('span');
        colon.classList.add('colon');
        colon.innerText = ':';
        div.appendChild(colon);
        div.appendChild(this.renderFormattedData(fp.formattedData));
        mainFrag.appendChild(div);
        return mainFrag;
    }
    packetSet(pos, fpArr) {
        const history = document.getElementById('history-data');
        const current = document.getElementById('current-data');
        const end = document.getElementById('end-data');
        fpArr.forEach(fp => {
            if (pos === 'history') {
                history === null || history === void 0 ? void 0 : history.appendChild(this.packetRender(fp));
            }
            else if (pos === 'current') {
                current === null || current === void 0 ? void 0 : current.appendChild(this.packetRender(fp));
            }
            end === null || end === void 0 ? void 0 : end.scrollIntoView({ behavior: 'smooth' });
        });
    }
    constructor(history) {
        var _a, _b, _c;
        this.history = history;
        this.demarc = (_a = history.at(-1)) === null || _a === void 0 ? void 0 : _a.seq;
        this.ff = new FuidityFiltering((_c = (_b = history[0]) === null || _b === void 0 ? void 0 : _b.seq) !== null && _c !== void 0 ? _c : 0);
        this.packetSet('history', history);
    }
    packetAdd(fp) {
        if (typeof this.demarc === 'number' && typeof fp.seq === 'number') {
            if (fp.seq > this.demarc) {
                this.packetSet('current', [fp]);
            }
        }
    }
}
//# sourceMappingURL=ui.js.map