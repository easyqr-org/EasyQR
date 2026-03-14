#!/bin/bash

echo "Adding all changes..."
git add .

echo "Creating commit..."
git commit -m "feat: EasyQR updates (scanner fixes + UI + docker + ngrok)"

echo "Pulling latest changes..."
git pull --rebase origin main

echo "Pushing to origin..."
git push origin main

echo "Done."
