import { GivenName, HonorificPrefix, HonorificSuffix, MiddleName, PersonName, Surname } from "@vermascht/content"
import { AbstractTest } from "../AbstractTest"
import { GenericValueTest } from "./GenericValueTest"

export class NameValueTests extends AbstractTest {
    public run(): void {
        this.runPerson()
    }

    public runPerson(): void {
        new GenericValueTest(this.loggerFactory).runParametrized({
            testName: "PersonName Test (no Titles)",
            typeName: "PersonName",
            typeClass: PersonName,
            expectedJSON: {
                "@type": "PersonName",
                givenName: "Test GivenName",
                surname: "TestSurname"
            },
            valueJSON: {
                "@type": "PersonName",
                givenName: "Test GivenName",
                surname: "TestSurname"
            },
            valueVerboseJSON: {
                "@type": "PersonName",
                givenName: "Test GivenName",
                surname: {
                    "@type": "Surname",
                    value: "TestSurname"
                }
            },
            valueInterface: {
                givenName: "Test GivenName",
                surname: Surname.fromAny("TestSurname")
            },
            valueString: "Test GivenName TestSurname"
        })

        new GenericValueTest(this.loggerFactory).runParametrized({
            testName: "PersonName Test (with Prefix)",
            typeName: "PersonName",
            typeClass: PersonName,
            expectedJSON: {
                "@type": "PersonName",
                givenName: "TestGivenName1 TestGivenName2",
                middleName: "Middler",
                surname: "TestSurname",
                honorificPrefix: "Dr. Dr. rer. nat.",
                honorificSuffix: "M.Sc."
            },
            valueJSON: {
                "@type": "PersonName",
                givenName: "TestGivenName1 TestGivenName2",
                middleName: "Middler",
                surname: "TestSurname",
                honorificPrefix: "Dr. Dr. rer. nat.",
                honorificSuffix: "M.Sc."
            },
            valueVerboseJSON: {
                "@type": "PersonName",
                givenName: {
                    "@type": "GivenName",
                    value: "TestGivenName1 TestGivenName2"
                },
                middleName: {
                    "@type": "MiddleName",
                    value: "Middler"
                },
                surname: {
                    "@type": "Surname",
                    value: "TestSurname"
                },
                honorificPrefix: {
                    "@type": "HonorificPrefix",
                    value: "Dr. Dr. rer. nat."
                },
                honorificSuffix: {
                    "@type": "HonorificSuffix",
                    value: "M.Sc."
                }
            },
            valueInterface: {
                givenName: GivenName.fromAny("TestGivenName1 TestGivenName2"),
                middleName: MiddleName.fromAny("Middler"),
                surname: Surname.fromAny("TestSurname"),
                honorificPrefix: HonorificPrefix.fromAny("Dr. Dr. rer. nat."),
                honorificSuffix: HonorificSuffix.fromAny("M.Sc.")
            },
            valueString: "Dr. Dr. rer. nat. TestGivenName1 TestGivenName2 Middler TestSurname M.Sc."
        })
    }
}
