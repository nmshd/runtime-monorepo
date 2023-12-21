## Setup

1. Download and install [Node JS](https://nodejs.org/en/download/)
2. run `npm i`

## How to test

To configure the test setup you have to fill the following environment variables:

-   NMSHD_TEST_BASEURL (the backbone baseUrl to test against)
-   NMSHD_TEST_CLIENTID (the backbone clientId for the configured baseUrl)
-   NMSHD_TEST_CLIENTSECRET (the backbone clientSecret for the configured baseUrl)

> We recommend to persist these variables for example in your `.bashrc` / `.zshrc` or in the Windows environment variables.

After you have configured the environment variables, you can run the tests with the following commands:

-   node tests: `npm run test:node`
-   web and node tests: `npm run bt`
