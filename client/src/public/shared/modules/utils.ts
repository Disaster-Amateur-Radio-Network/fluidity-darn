export const inBrowser = (): Boolean => {
    return typeof window === 'object' && typeof process === 'undefined';
};

export const isErrnoException = (object: Error): object is NodeJS.ErrnoException => {
    return (
        Object.prototype.hasOwnProperty.call(object, 'code') || Object.prototype.hasOwnProperty.call(object, 'errno')
    );
};

export function* counter(): IterableIterator<number> {
    let c = 1;
    while (true) {
        yield c;
        c++;
    }
}

export const prettyFsNotFound = (err: Error): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
        if (inBrowser()) {
            return reject('function not suitable for browser execution, no FS');
        } else {
            if (isErrnoException(err) && err.code === 'ENOENT') {
                import('url').then(({ fileURLToPath }) => {
                    if (typeof err.path === 'string') {
                        return resolve(`Cannot find path: ${fileURLToPath(new URL(err.path, import.meta.url))}`);
                    } else {
                        return resolve(undefined);
                    }
                });
            } else {
                return resolve(undefined);
            }
        }
    });
};

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export const isJSONString = (str: string) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};
