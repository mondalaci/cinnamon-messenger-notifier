#!/bin/bash
# Launch Messenger as a Chrome web app with extensions enabled
# This allows Tampermonkey to run the notification script

google-chrome --app=https://messenger.com --enable-extensions "$@"
