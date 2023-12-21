export CONNECTION_STRING="mongodb://localhost:27027"

docker compose -p consumption-tests -f test/docker-compose.yml up -d consumptionlib-mongo
