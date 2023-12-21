import {
    Affiliation,
    AffiliationOrganization,
    AffiliationRole,
    AffiliationUnit,
    BirthDate,
    BirthDateJSON,
    BirthDay,
    BirthMonth,
    BirthYear,
    GivenName,
    IBirthDate,
    IdentityAttribute,
    Nationality
} from "@vermascht/content"
import { CoreAddress, CoreDate } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"

export class IdentityAttributeTest extends AbstractTest {
    public run(): void {
        describe("IdentityAttribute", function () {
            it("should allow to create new attributes from objects (nested values)", function () {
                const birthDateContent = {
                    "@type": "BirthDate",
                    day: { value: 22 },
                    month: { value: 2 },
                    year: { value: 2022 }
                }
                const birthDateContentSerialized = {
                    "@type": "BirthDate",
                    day: 22,
                    month: 2,
                    year: 2022
                }
                const birthDate = IdentityAttribute.from({
                    value: birthDateContent,
                    owner: CoreAddress.from("address")
                })
                expect(birthDate).to.be.instanceOf(IdentityAttribute)
                expect(birthDate.value).to.be.instanceOf(BirthDate)

                if (birthDate.value instanceof BirthDate) {
                    expect(birthDate.value.toJSON()).to.deep.equal(birthDateContentSerialized)
                    expect(birthDate.value.day).to.be.instanceOf(BirthDay)
                    expect(birthDate.value.month).to.be.instanceOf(BirthMonth)
                    expect(birthDate.value.year).to.be.instanceOf(BirthYear)
                }
            })

            it("should allow to create new attributes from objects (only values)", function () {
                const birthDateContent = {
                    "@type": "BirthDate",
                    day: 22,
                    month: 2,
                    year: 2022
                }
                const birthDate = IdentityAttribute.from({
                    value: birthDateContent,
                    owner: CoreAddress.from("address")
                })
                expect(birthDate).to.be.instanceOf(IdentityAttribute)
                expect(birthDate.value).to.be.instanceOf(BirthDate)

                if (birthDate.value instanceof BirthDate) {
                    expect(birthDate.value.toJSON()).to.deep.equal(birthDateContent)
                    expect(birthDate.value.day).to.be.instanceOf(BirthDay)
                    expect(birthDate.value.month).to.be.instanceOf(BirthMonth)
                    expect(birthDate.value.year).to.be.instanceOf(BirthYear)
                }
            })

            it("should allow to validate string values", function () {
                let nationality = IdentityAttribute.from<Nationality>({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: "address"
                })
                expect(nationality).to.be.instanceOf(IdentityAttribute)
                expect(nationality.value).to.be.instanceOf(Nationality)

                nationality = IdentityAttribute.from({
                    value: {
                        "@type": "Nationality",
                        value: "DE"
                    },
                    owner: CoreAddress.from("address")
                })
                expect(nationality).to.be.instanceOf(IdentityAttribute)
                expect(nationality.value).to.be.instanceOf(Nationality)

                expect(() =>
                    IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "xx"
                        },
                        owner: CoreAddress.from("address")
                    })
                ).to.throw("Nationality.value:String :: must be one of")

                expect(() =>
                    IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: 27
                        },
                        owner: CoreAddress.from("address")
                    })
                ).to.throw("Nationality.value :: Value is not a string")

                expect(() =>
                    IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            // @ts-expect-error
                            value: undefined
                        },
                        owner: "address"
                    })
                ).to.throw("Nationality.value :: Value is not defined")
            })

            it("should allow to validate integer values", function () {
                let age = IdentityAttribute.from<BirthMonth>({
                    value: {
                        "@type": "BirthMonth",
                        value: 10
                    },
                    owner: CoreAddress.from("address")
                })
                expect(age).to.be.instanceOf(IdentityAttribute)
                expect(age.value).to.be.instanceOf(BirthMonth)

                age = IdentityAttribute.from({
                    value: {
                        "@type": "BirthMonth",
                        value: 10
                    },
                    owner: CoreAddress.from("address")
                })
                expect(age).to.be.instanceOf(IdentityAttribute)
                expect(age.value).to.be.instanceOf(BirthMonth)

                expect(() =>
                    IdentityAttribute.from({
                        value: {
                            "@type": "BirthMonth",
                            value: "10"
                        },
                        owner: CoreAddress.from("address")
                    })
                ).to.throw("BirthMonth.value :: Value is not a number")
            })

            it("should allow to create new attributes from JSON", function () {
                const birthDateContent = {
                    "@type": "BirthDate",
                    day: { value: 22 },
                    month: { value: 2 },
                    year: { value: 2022 }
                }
                const birthDateContentSerialized = {
                    "@type": "BirthDate",
                    day: 22,
                    month: 2,
                    year: 2022
                }
                const birthDate = IdentityAttribute.from<BirthDate, IBirthDate, BirthDateJSON>({
                    value: birthDateContent,
                    validFrom: CoreDate.utc().subtract({ years: 1 }),
                    validTo: CoreDate.utc().add({ years: 1 }),
                    owner: CoreAddress.from("address")
                })
                expect(birthDate).to.be.instanceOf(IdentityAttribute)
                expect(birthDate.value).to.be.instanceOf(BirthDate)
                expect(birthDate.value.toJSON()).to.deep.equal(birthDateContentSerialized)
                expect(birthDate.value.day).to.be.instanceOf(BirthDay)
                expect(birthDate.value.month).to.be.instanceOf(BirthMonth)
                expect(birthDate.value.year).to.be.instanceOf(BirthYear)
            })

            it("should deserialize content", function () {
                const attribute = IdentityAttribute.from<GivenName>({
                    owner: CoreAddress.from("address"),
                    value: {
                        "@type": "GivenName",
                        value: "John"
                    }
                })

                expect(attribute.value).to.exist
                expect(attribute).to.be.instanceOf(IdentityAttribute)
                expect(attribute.value).to.be.instanceOf(GivenName)
                expect(attribute.value.value).to.equal("John")
            })

            it("should validate attribute values from JSON", function () {
                expect(() =>
                    IdentityAttribute.from({
                        value: {
                            "@type": "BirthDate",
                            day: { value: 22 },
                            month: { value: 13 },
                            year: { value: 2022 }
                        },
                        validFrom: CoreDate.utc().subtract({ years: 1 }),
                        validTo: CoreDate.utc().add({ years: 1 }),
                        owner: CoreAddress.from("address")
                    })
                ).to.throw("BirthMonth.value:Number :: must be an integer value between 1 and 12")
            })

            it("should validate attribute values from objects", function () {
                expect(() =>
                    IdentityAttribute.from({
                        value: {
                            "@type": "BirthMonth",
                            value: "13"
                        },
                        validFrom: CoreDate.utc().subtract({ years: 1 }),
                        validTo: CoreDate.utc().add({ years: 1 }),
                        owner: CoreAddress.from("address")
                    })
                ).to.throw("BirthMonth.value :: Value is not a number.")

                expect(() =>
                    IdentityAttribute.from({
                        value: {
                            "@type": "BirthMonth",
                            value: 13
                        },
                        validFrom: CoreDate.utc().subtract({ years: 1 }),
                        validTo: CoreDate.utc().add({ years: 1 }),
                        owner: CoreAddress.from("address")
                    })
                ).to.throw("BirthMonth.value:Number :: must be an integer value between 1 and 12")
            })

            it("should allow the creation of nested attributes", function () {
                const affiliation = {
                    "@type": "Affiliation",
                    organization: "j&s-soft GmbH",
                    role: "Developer",
                    unit: "Enmeshed"
                }
                const affiliationInstance = Affiliation.fromAny(affiliation)
                expect(affiliationInstance).to.be.instanceOf(Affiliation)

                const affiliationAttribute = IdentityAttribute.from<Affiliation>({
                    value: affiliation,
                    validFrom: CoreDate.utc().subtract({ years: 1 }),
                    validTo: CoreDate.utc().add({ years: 1 }),
                    owner: CoreAddress.from("address")
                })

                expect(affiliationAttribute.value).to.be.instanceOf(Affiliation)
                expect(affiliationAttribute.value.organization).to.be.instanceOf(AffiliationOrganization)

                expect(affiliationAttribute.value.role).to.be.instanceOf(AffiliationRole)
                expect(affiliationAttribute.value.unit).to.be.instanceOf(AffiliationUnit)
            })
        })
    }
}
