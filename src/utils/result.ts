export type Result<T> = {v: T, e: Error} | {v: T, e: null}

export const Ok = <T>(value: T): Result<T> => ({
    v: value,
    e: null
});

export const Err = <T>(err: Error, v: T): Result<T> => ({
    v: v,
    e: err
})