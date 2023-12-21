export CONNECTION_STRING="mongodb://localhost:27025"

docker compose -p transport-tests -f test/docker-compose.yml up -d transportlib-ferret
