import { type } from "@js-soft/ts-serval"
import { AbstractStringJSON, IAbstractString } from "../AbstractString"
import { AbstractCountry } from "../strings"

export interface CountryJSON extends AbstractStringJSON {
    "@type": "Country"
}

export interface ICountry extends IAbstractString {}

@type("Country")
export class Country extends AbstractCountry implements ICountry {
    public static from(value: ICountry | Omit<CountryJSON, "@type"> | string): Country {
        return this.fromAny(value)
    }
}
