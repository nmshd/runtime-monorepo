import { expect } from "chai"

export class TestUtil {
    public static expectThrows(method: Function | Promise<any>, errorMessageRegexp: RegExp | string): void {
        let error: Error | undefined
        try {
            if (typeof method === "function") {
                method()
            }
        } catch (err: any) {
            error = err
        }
        expect(error).to.be.an("Error")
        if (errorMessageRegexp) {
            expect(error!.message).to.match(new RegExp(errorMessageRegexp))
        }
    }

    public static async expectThrowsAsync(
        method: Function | Promise<any>,
        customExceptionMatcher: (e: Error) => void
    ): Promise<void>

    public static async expectThrowsAsync(
        method: Function | Promise<any>,
        errorMessageRegexp: RegExp | string
    ): Promise<void>

    public static async expectThrowsAsync(
        method: Function | Promise<any>,
        errorMessageRegexp: RegExp | string | ((e: Error) => void)
    ): Promise<void> {
        let error: Error | undefined
        try {
            if (typeof method === "function") {
                await method()
            } else {
                await method
            }
        } catch (err: any) {
            error = err
        }
        expect(error).to.be.an("Error")

        if (typeof errorMessageRegexp === "function") {
            errorMessageRegexp(error!)
            return
        }

        if (errorMessageRegexp) {
            expect(error!.message).to.match(new RegExp(errorMessageRegexp))
        }
    }
}
