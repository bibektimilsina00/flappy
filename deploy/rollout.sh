#!/usr/bin/env bash
# Deploy with a health-gate + automatic rollback.
#   Usage: rollout.sh NEW_SHA [PREV_SHA]
# Pins the image tag to NEW_SHA, rolls the stack, waits for the api to report
# healthy, and — if it never does — reverts to PREV_SHA so a broken image can't
# leave the site down. Run from the compose dir (it cd's there itself).
set -euo pipefail
NEW="$1"; PREV="${2:-}"
cd "$(dirname "$0")"

# compose interpolates ${IMAGE_TAG} in the image: lines from .env
set_tag() {
	if grep -q '^IMAGE_TAG=' .env 2>/dev/null; then
		sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$1/" .env
	else
		echo "IMAGE_TAG=$1" >> .env
	fi
}

# hit the api's own /health inside the container — responds as soon as it's up
# (migrations run in the api start command, so this also catches migration fails)
api_healthy() {
	docker compose exec -T api python -c \
		"import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').getcode()==200 else 1)" \
		>/dev/null 2>&1
}

set_tag "$NEW"
docker compose pull -q

# migrate once, up-front, with the new image (brings up postgres/redis first via
# depends_on). A bad migration fails HERE — before the running app is touched —
# so the current version keeps serving and the deploy simply aborts.
docker compose run --rm api alembic -c apps/api/alembic.ini upgrade head

docker compose up -d --remove-orphans

ok=
for _ in $(seq 1 20); do        # ~60s
	if api_healthy; then ok=1; break; fi
	sleep 3
done

if [ -z "$ok" ]; then
	echo "::error::api did not become healthy after deploying $NEW"
	if [ -n "$PREV" ]; then
		echo "rolling back to $PREV"
		set_tag "$PREV"
		docker compose up -d --remove-orphans
	else
		echo "no previous SHA recorded — cannot auto-roll back"
	fi
	exit 1
fi

# Ingress is the standalone shared proxy (/opt/proxy); it re-resolves upstreams
# per request (lb_try_duration), so no proxy reload is needed on app deploys.
docker image prune -f
echo "deploy $NEW healthy"
