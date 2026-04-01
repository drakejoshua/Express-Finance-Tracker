// Coingecko API configuration
export const CoingeckoAPIKey = process.env.COINGECKO_API_KEY
export const CoingeckoAPIBaseURL = process.env.COINGECKO_API_BASE_URL


// searchCoinsByQuery function to search for coins using the Coingecko API
export async function searchCoinsByQuery( query ) {
    try {
        // query coingecko search endpoint to return data for "query"
        const resp = await fetch(`${CoingeckoAPIBaseURL}/search?query=${encodeURIComponent( query )}&x_cg_demo_api_key=${CoingeckoAPIKey}`)

        // check if response is "200 ok"
        if ( !resp.ok ) {
            if ( resp.status === 429 ) {
                throw new Error(`Error querying "${ query }" from coingecko: Rate limit exceeded`)
            }

            throw new Error(`Error querying "${ query }" from coingecko: ${resp.status} ${resp.statusText}`)
        }

        // convert query response to consumable json
        const data = await resp.json()

        return {
            status: "success",
            data
        }
    } catch( err ) {
        console.log("coingecko fetch error: ", err.message)
        return {
            status: "error",
            err
        }
    }
}