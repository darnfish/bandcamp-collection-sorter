require('dotenv').config()

const fs = require('fs')
const axios = require('axios').default
const crypto = require('crypto')

const bc = axios.create({
	baseURL: 'https://bandcamp.com',
	headers: {
		Cookie: process.env.BANDCAMP_COOKIE
	}
})

const lfm = axios.create({
	baseURL: 'https://ws.audioscrobbler.com/2.0'
})

const cache = process.env.CACHE === '1'

function get32BitUnixTimestamp() {
	return Math.round(Date.now() / 1000)
}

async function fetchBandcampDetails() {
	const { data } = await bc.get('api/fan/2/collection_summary')

	return {
		fanId: data.collection_summary.fan_id,
		username: data.collection_summary.username,
		url: data.collection_summary.url
	}
}

async function fetchCollectionItems(bcDetails) {
	let items = []
	let lastToken

	for (let i = 0; i < Infinity; i++) {
		const { data: { items: currentItems, last_token: currentLastToken } } = await bc.post('api/fancollection/1/collection_items', {
			count: 20,
			fan_id: bcDetails.fanId,
			older_than_token: lastToken || `${get32BitUnixTimestamp()}:0:p:0:`
		})

		items.push(...currentItems)

		console.log(`[BANDCAMP] Got ${items.length} items, ${currentItems.length} new`)

		if (!currentLastToken)
			break

		lastToken = currentLastToken
	}

	return items
}

async function fetchTopAlbums() {
	let albums = []
	let page = 1

	for(let i = 0; i < Infinity; i++) {
		const { data: { topalbums: { album: currentAlbums } } } = await lfm.get('/', {
			params: {
				method: 'user.getTopAlbums',
				format: 'json',
				api_key: process.env.LAST_FM_API_KEY,
				sk: process.env.LAST_FM_SECRET_KEY,
				limit: 1000,
				page
			}
		})

		albums.push(...currentAlbums)
		page += 1

		console.log(`[LAST.FM] Got ${albums.length} items, ${currentAlbums.length} new`)

		if(currentAlbums.length < 1000)
			break
	}

	return albums
}

function createHash(item) {
	return crypto.createHash('sha256').update([item.title, item.artist].map(part => part.replaceAll(' ', '').toLowerCase()).join('')).digest('hex')
}

function matchAndSortAlbums(_lfmAlbums, _bcItems) {
	let lfmAlbums = _lfmAlbums.map(album => ({
		title: album.name,
		artist: album.artist.name,
		playCount: parseInt(album.playcount)
	}))

	let bcItems = _bcItems.map(item => ({
		id: item.item_id,
		title: item.item_title,
		artist: item.band_name
	}))

	bcItems = bcItems.map(item => ({ ...item, hash: createHash(item) }))
	lfmAlbums = lfmAlbums.map(item => ({ ...item, hash: createHash(item) }))

	const _matchedItems = lfmAlbums.map(album => {
		const bcItem = bcItems.find(item => item.hash === album.hash)
		if(!bcItem)
			return null

		return {
			...bcItem,
			playCount: album.playCount
		}
	})

	const matchedItems = _matchedItems.filter(e => !!e).sort((a, b) => a.playCount + b.playCount)
	const matchedItemHashes = matchedItems.map(item => item.hash).sort((a, b) => a.artist - b.artist)
	
	const unmatchedItems = bcItems.filter(item => !matchedItemHashes.includes(item.hash))

	console.log(`[MATCHENGINE] Matched ${matchedItems.length} albums, ${unmatchedItems.length} albums could not be matched`)

	return {
		matchedItems,
		unmatchedItems
	}
}

async function updateCollectionOrder(bcDetails, itemIds, crumb) {
	const formData = new FormData()

	formData.append('fan_id', bcDetails.fanId)

	for (const itemId of itemIds)
		formData.append('ids[]', itemId)

	// Since I have no idea how the Bandcamp crumb field works, just generate one that will return a valid one on first request error
	formData.append('crumb', crumb || `|collection_reorder_cb|${get32BitUnixTimestamp()}|${Buffer.from('some-random-crumb').toString('base64')}`)

	try {
		await bc.post('collection_reorder_cb', formData, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		})
	
		console.log(`[BANDCAMP] Sorted ${itemIds.length} albums in your collection`)
	} catch(error) {
		if(!error.response.data.crumb)
			throw error

		await updateCollectionOrder(bcDetails, itemIds, error.response.data.crumb)
	}
}

async function main() {
	const details = await fetchBandcampDetails()
	console.log(`[BANDCAMP] Authenticated as ${details.username} (id=${details.fanId},url=${details.url})`)

	const collectionItems = !cache ? await fetchCollectionItems(details) : require('./collection_items.json')

	if(!cache)
		fs.writeFileSync('./collection_items.json', JSON.stringify(collectionItems, null, 2))

	const albums = !cache ? await fetchTopAlbums() : require('./albums.json')

	if(!cache)
		fs.writeFileSync('./albums.json', JSON.stringify(albums, null, 2))

	const { matchedItems, unmatchedItems } = matchAndSortAlbums(albums, collectionItems)

	const matchedItemIds = matchedItems.map(item => item.id)
	const unmatchedItemIds = unmatchedItems.map(item => item.id)

	const itemIds = [...matchedItemIds, ...unmatchedItemIds]

	console.log('[SORTENGINE] Matched items sorted by play count, unmatched items sorted by alphabetical order of artist name')

	await updateCollectionOrder(details, itemIds)
}

main()
