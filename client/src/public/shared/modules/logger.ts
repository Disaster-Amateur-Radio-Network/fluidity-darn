import type { StackFrame } from 'stacktrace-js';
import type { ConfigData } from '#@shared/modules/config.js';
import type { Request, Response, NextFunction } from 'express';
import { composer } from '#@shared/modules/my_logger.js';
export const levelsArr = ['debug', 'info', 'warn', 'error', 'never'] as const;
export type LogLevel = typeof levelsArr[number];
type Logger = { [K in LogLevel]: <T>(data: T) => void };

export type Runtime = 'nodejs' | 'browser';

interface StackLocation {
    line: number | undefined;
    file: string | undefined;
}

interface LogData<T> {
    level: LogLevel;
    message: T;
    timestamp: Date;
    location?: StackLocation | undefined;
}

interface LevelSettings {
    locLevel: LogLevel | undefined | null;
    logLevel: LogLevel | undefined | null;
}

interface LogFormatter {
    format<T>(data: LogData<T>): string;
}

interface LogTransport {
    send(loglevel: LogLevel, logline: string): void;
}

abstract class FormatterBase implements LogFormatter {
    constructor(protected levelSettings: LevelSettings) {}

    abstract dateString(date: Date): string;

    protected isJsonString(str: string) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    format<T>(data: LogData<T>): string {
        const { message, timestamp, level } = data;
        let formattedMesg: string;

        if (typeof message !== 'string' && !(message instanceof Error)) {
            if (level === 'debug' || this.levelSettings.logLevel === 'debug') {
                formattedMesg = JSON.stringify(message, undefined, '\t');
            } else {
                formattedMesg = JSON.stringify(message);
            }
        } else {
            formattedMesg = message.toString();
            if (message instanceof Error) {
                formattedMesg += `\nstack-->\n${message.stack} <--stack`;
            }
        }

        if (message instanceof Object) formattedMesg ??= message.toString();

        if (data.location?.file && data.location?.line) {
            const {
                location: { file, line }
            } = data;

            return `[${this.dateString(timestamp)}]: ${formattedMesg} (${file}:${line})`;
        } else {
            return `[${this.dateString(timestamp)}]: ${formattedMesg}`;
        }
    }
}

class SimpleConsoleFormatter extends FormatterBase implements LogFormatter {
    dateString(date: Date): string {
        if (this.levelSettings.logLevel === 'debug') {
            return date.toISOString().slice(11, -1);
        } else {
            return date.toISOString();
        }
    }
}

class BrowserConsoleFormatter extends FormatterBase implements LogFormatter {
    dateString(date: Date): string {
        return date.toISOString().slice(11, -1);
    }
}

class NodeConsoleFormatter extends SimpleConsoleFormatter implements LogFormatter {
    override format<T>(data: LogData<T>): string {
        const colorLevels: number[] = [94, 97, 33, 91];

        return super
            .format(data)
            .split(/\r?\n/)
            .map(l => `\x1b[${colorLevels[levelsArr.indexOf(data.level)]}m${l}\x1b[0m`)
            .join('\n');
    }
}

class JSONFormatter implements LogFormatter {
    constructor(protected levelSettings: LevelSettings) {}
    format<T>(data: LogData<T>): string {
        const { message: m, ...rest } = data;

        if (typeof m === 'string') {
            const message = m.replace(/[\t\n]/g, ' ');
            return JSON.stringify({ message, ...rest });
        }
        return JSON.stringify(data);
    }
}

class ConsoleTransport implements LogTransport {
    send(level: LogLevel, line: string) {
        if (level !== 'never') console[level](line);
    }
}

export class LoggerUtil implements Logger {
    constructor(
        private levelSettings: LevelSettings,
        private formatter: LogFormatter,
        private transport: LogTransport,
        private runtime: Runtime
    ) {
        Boolean(levelSettings.locLevel) &&
            levelSettings.locLevel !== 'never' &&
            this.log('warn', 'Performance degraded due to location tracing\n');
    }

    private getStackLocation(): Promise<StackLocation> {
        return new Promise((resolve, reject) => {
            if (this.runtime === 'browser') {
                StackTrace.get()
                    .then((sf: StackFrame[]) => {
                        resolve({
                            file: sf[4]?.fileName?.split('/').slice(-1).toString(),
                            line: sf[4]?.lineNumber
                        });
                    })
                    .catch((err: Error) => {
                        reject(err);
                    });
            } else {
                try {
                    throw new Error('generate stack');
                } catch (err) {
                    import('stack-trace').then(v8Strace => {
                        if (err instanceof Error) {
                            const sf = v8Strace.parse(err);

                            resolve({
                                file: sf[5]?.getFileName().split('/').slice(-1).toString(),
                                line: sf[5]?.getLineNumber()
                            });
                        }
                    });
                }
            }
        });
    }

    private log<T>(level: LogLevel, message: T): void {
        if (levelsArr.indexOf(level) >= levelsArr.indexOf(this.levelSettings.logLevel || 'debug')) {
            const snd = (location?: StackLocation) => {
                this.transport.send(
                    level,
                    this.formatter.format({
                        level,
                        message,
                        timestamp: new Date(),
                        location
                    })
                );
            };

            if (levelsArr.indexOf(level) >= levelsArr.indexOf(this.levelSettings.locLevel || 'never')) {
                //warning - setting locLevel to any level other than 'never' can cause delayed logging
                this.getStackLocation().then(snd);
            } else {
                snd();
            }
        }
    }

    debug<T>(data: T): void {
        this.log('debug', data);
    }

    info<T>(data: T): void {
        this.log('info', data);
    }

    warn<T>(data: T): void {
        this.log('warn', data);
    }

    error<T>(data: T): void {
        this.log('error', data);
    }

    never<T>(data: T): void {}

    static browserConsole(levelSettings: LevelSettings): LoggerUtil {
        return new LoggerUtil(
            levelSettings,
            new BrowserConsoleFormatter(levelSettings),
            new ConsoleTransport(),
            'browser'
        );
    }

    static nodeConsole(levelSettings: LevelSettings): LoggerUtil {
        return new LoggerUtil(levelSettings, new NodeConsoleFormatter(levelSettings), new ConsoleTransport(), 'nodejs');
    }

    static JSONEmitter(levelSettings: LevelSettings): LoggerUtil {
        return new LoggerUtil(levelSettings, new JSONFormatter(levelSettings), new ConsoleTransport(), 'nodejs');
    }

    static new(conf?: ConfigData): LoggerUtil {
        return composer(conf);
    }
}

export const httpLogger = (conf?: ConfigData) => {
    const log = composer(conf);

    let requests = 0;
    let timeSum = 0;

    const getDurationInMilliseconds = (start: [number, number]) => {
        const NS_PER_SEC = 1e9;
        const NS_TO_MS = 1e6;
        const diff = process.hrtime(start);

        return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
    };

    return (req: Request, res: Response, next: NextFunction) => {
        const start = process.hrtime();

        res.on('finish', () => {
            const durationInMilliseconds = getDurationInMilliseconds(start);
            requests++;
            timeSum += durationInMilliseconds;
            const averageReqTime = timeSum / requests;

            if (res.statusCode >= 500 && res.statusCode <= 599) {
                log.error(`${req.method} ${req.url}\t${res.statusCode}\t${durationInMilliseconds.toLocaleString()} ms`);
            } else if (durationInMilliseconds > averageReqTime * 4) {
                log.warn(`${req.method} ${req.url}\t${res.statusCode}\t${durationInMilliseconds.toLocaleString()} ms`);
            } else {
                log.info(`${req.method} ${req.url}\t${res.statusCode}\t${durationInMilliseconds.toLocaleString()} ms`);
            }
        });

        next();
    };
};
