export CONNECTION_STRING="mongodb://localhost:27028"

docker compose -p consumption-tests -f test/docker-compose.yml up -d consumptionlib-ferret
