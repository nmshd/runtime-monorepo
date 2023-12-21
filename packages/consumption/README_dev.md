# Consumption Library developer information

## Development Guide

### Setup

1. Download and install [Node JS](https://nodejs.org/en/download/)
2. run `npm i`

### How to test

To configure the test setup you have to fill the following environment variables:

-   NMSHD_TEST_BASEURL (the backbone baseUrl to test against)
-   NMSHD_TEST_CLIENTID (the backbone clientId for the configured baseUrl)
-   NMSHD_TEST_CLIENTSECRET (the backbone clientSecret for the configured baseUrl)

> We recommend to persist these variables for example in your `.bashrc` / `.zshrc` or in the Windows environment variables.

After you have configured the environment variables, you can run the tests with the following commands:

-   a specific database: `npm run test:local:[mongodb|lokijs]`
-   web and node tests: `npm run bt`

After testing on mongodb you can run `npm run test:local:teardown` to remove the test database.

## Error Solving Guide

### Build / Tests resolve into strange errors

Like:

-   Doesn't build at all
-   Module not found
-   Something is undefined which should not be undefined (e.g. "TypeError: Cannot read property 'from_base64' of undefined")

Solutions:

-   Check if you have got absolute "src/" or "/" includes somewhere and change them to relative ones ("../")
-   Check if you have a cyclic reference somewhere (sometimes quite hard to find). In general, no class should include something from the root's index.ts export (looks like import \* from "../../")
-   Check if you have "/dist" as suffix for includes (e.g. "@nmshd/crypto/dist"). This usually works fine within NodeJS, however Webpack (Browser Build) has some issues therein, resulting e.g. in the crypto lib being copied into the transport lib. It should be fixed, but you never know...

### Something about duplicate private properties

Do not use abstract classes.

### Serialization/Deserialization won't work

Or deserialize-/fromUnknown won't find your class.

-   Check if all (parent) classes up to Serializable(-Async) inclulde a @schema declaration with a type
-   You might have several different Serializable(-Async) instances up- and running. This usually happens if ts-serval/crypto/transport are not correctly imported.
