set -e

yarn
yarn workspaces run build:node
yarn run lint:eslint
yarn run lint:prettier
