set -e
set -x

yarn
yarn workspaces run build:ci

