import { ErrorValidationResult, SuccessfulValidationResult, ValidationResult } from "@vermascht/consumption"
import { Assertion } from "chai"

export default function setup(): void {
    Assertion.addMethod("successfulValidationResult", function () {
        const obj = this._obj

        this.assert(
            obj instanceof SuccessfulValidationResult,
            `expected ${JSON.stringify(obj)} to be a ${SuccessfulValidationResult.name}, but it is an ${
                ErrorValidationResult.name
            }`,
            `expected ${JSON.stringify(obj)} to not be a ${SuccessfulValidationResult.name}, but it is.`,
            SuccessfulValidationResult,
            obj
        )
    })

    Assertion.addMethod(
        "errorValidationResult",
        function (expectedError: { code?: string; message?: string | RegExp } = {}) {
            const obj = this._obj as ValidationResult

            this.assert(
                obj instanceof ErrorValidationResult,
                `expected an ${ErrorValidationResult.name}, but received a ${SuccessfulValidationResult.name}`,
                `expected no ${ErrorValidationResult.name}, but received one.`,
                ErrorValidationResult,
                obj
            )

            const actualErrorValidationResult = obj as ErrorValidationResult

            if (typeof expectedError.code !== "undefined") {
                this.assert(
                    actualErrorValidationResult.error.code === expectedError.code,
                    `expected the error code of the result to be '${expectedError.code}', but received '${actualErrorValidationResult.error.code}'.`,
                    `expected the error code of the result to not be '${expectedError.code}', but it is.`,
                    expectedError.code,
                    actualErrorValidationResult.error.code
                )
            }

            if (typeof expectedError.message !== "undefined") {
                this.assert(
                    actualErrorValidationResult.error.message.match(expectedError.message) !== null,
                    `expected the error message of the result to match '${expectedError.message}', but received '${actualErrorValidationResult.error.message}'.`,
                    `expected the error message of the result to not match '${expectedError.message}', but it is.`,
                    expectedError.message.toString(),
                    actualErrorValidationResult.error.message
                )
            }
        }
    )
}
declare global {
    namespace Chai {
        interface Assertion {
            successfulValidationResult(): Assertion
            errorValidationResult(error?: { code?: string; message?: string | RegExp }): Assertion
        }
    }
}
