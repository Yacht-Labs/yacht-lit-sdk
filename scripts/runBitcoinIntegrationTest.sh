yarn global add dotenv-cli
OUTPUT=$(dotenv ts-node ../src/utils/mintPKPandGetBitcoinAddress.ts)
IFS='.' read -ra ADDR <<< "$OUTPUT"
echo "BTC Address: ${ADDR[0]}"
echo "Instructions: Send Testnet BTC to the above address and then press y to continue"
read response
if [ "$response" = "y" ]; then
    echo "running integration tests"
    echo "Pub Key ${ADDR[1]}"
    dotenv npm run internal:integration:test "\"${ADDR[1]}\""
else
    echo "$response"
    echo "skipping integration tests"
fi