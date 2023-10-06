# Bandcamp Collection Sorter
Sort your Bandcamp collection based on your top Last.fm albums.

Run this once, or as a regular job to keep your Bandcamp collection in sync with your Last.fm 😎

Your Bandcamp collection will first be sorted by your most listened to albums, and then for albums in your Bandcamp collection that could not be found in your Last.fm listening history, alphabetically based on the artists name.

For an example of how this looks, see [bc/darnfish](https://bandcamp.com/darnfish) and [lfm/darnfish/top_albums](https://www.last.fm/user/darnfish/library/albums?date_preset=ALL)

## Usage
Clone the repository down and enter it:
```
git clone git@github.com:darnfish/bandcamp-collection-sorter.git
cd bandcamp-collection-sorter
```

Populate your `.env` file with the following values:
```
BANDCAMP_COOKIE=

LAST_FM_API_KEY=
LAST_FM_SHARED_SECRET=
LAST_FM_SECRET_KEY=
```

### BANDCAMP_COOKIE
1. On a logged in tab of [bandcamp.com](https://bandcamp.com), open Developer Tools (F12) / Inspect Element.
2. Open the Network tab.
3. Filter by Fetch/XHR, at the top of the DevTools window.
4. Refresh the page via F5 or CMD+R.
5. Look for any request that shows up in the table, such as `collection_summary`.
6. Under the Headers tab, scroll down to Request Headers and copy the value for Cookie. It should begin with `client_id=`.
7. Append it to the end of `BANDCAMP_COOKIE=` inside the `.env` file.

### LAST_FM_API_KEY & LAST_FM_SHARED_SECRET
1. Open [last.fm/api/account/create](https://www.last.fm/api/account/create) and create an API account.
	* You do not need to specify a Callback URL or Application homepage.
2. Copy your API key and Shared secret to your `.env` file in the respective locations.

### LAST_FM_SECRET_KEY
1. Using your Last.fm API key obtained from the last step, create an auth url by combining the following with your API key: `https://www.last.fm/api/auth?api_key=INSERT_API_KEY_HERE`.
2. Navigate to this URL in your browser, and click YES, ALLOW ACCESS.
3. Take note of the URL that Last.fm redirected you to. It should look like `https://www.last.fm/api/auth?token=SECRET_KEY`.
4. Copy the value after `token=`, and append it after `LAST_FM_SECRET_KEY=` in your `.env` file.

---

Once all these fields are filled out in `.env`, run `node .` inside the Terminal window with that you used to run `git clone` and `cd`. Your Bandcamp collection and Last.fm top albums will be pulled, albums in both lists will be matched, and your Bandcamp collection will automatically be updated.

```
[BANDCAMP] Authenticated as darnfish (id=5486543,url=https://bandcamp.com/darnfish)
[BANDCAMP] Got 20 items, 20 new
[BANDCAMP] Got 40 items, 20 new
...
[LAST.FM] Got 1000 items, 1000 new
[LAST.FM] Got 2000 items, 1000 new
...
[MATCHENGINE] Matched 183 albums, 45 albums could not be matched
[SORTENGINE] Matched items sorted by play count, unmatched items sorted by alphabetical order of artist name
[BANDCAMP] Sorted 228 albums in your collection
```

> **NOTE**: Your previous Bandcamp collection order will be automatically overwritten upon running `node .`. The last scraped Bandcamp collection status will be written to `collection_items.json`, but running the script for a second time will overwrite this once and for all. If you want to have a copy of your previous collection, make sure to back up this file once it is first created.

For albums that could not be matched, they will be inserted after your sorted albums in alphabetical order based on the artists' name

## License
MIT
