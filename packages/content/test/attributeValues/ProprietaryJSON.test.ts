import { ProprietaryJSON } from "@vermascht/content"
import { expect } from "chai"
import itParam from "mocha-param"
import { AbstractTest } from "../AbstractTest"

export class ProprietaryJSONTests extends AbstractTest {
    public run(): void {
        describe("ProprietaryJSON", function () {
            itParam(
                "(de-)serialize ${JSON.stringify(value)}",
                [
                    // eslint-disable-next-line no-new-object
                    new Object(),
                    {},
                    // eslint-disable-next-line no-array-constructor
                    new Array(),
                    [],
                    [1, 2, 3],
                    ["1", "2", "3"],
                    [1, "2", null, { a: 1 }],
                    1,
                    "a-string",
                    {
                        string: "b",
                        number: 1,
                        null: null,
                        boolean: true,
                        array: [1, 2, 3],
                        object: {
                            aKey: "aValue"
                        }
                    }
                ],
                function (value: any) {
                    const prop = ProprietaryJSON.from({ title: "a-title", value })
                    const json = prop.toJSON()

                    expect(json.value).to.deep.equal(value)
                }
            )
        })
    }
}
