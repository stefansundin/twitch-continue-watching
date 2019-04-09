#!/bin/bash -ex
V=$(cat chrome/manifest.json | jq -Mr .version)
rm -f "twitch-continue-watching-$V.zip"
cd chrome
zip -r "../twitch-continue-watching-$V.zip" . -x '*.DS_Store' -x '*Thumbs.db'
