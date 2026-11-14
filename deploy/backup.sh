#!/bin/sh
# Daily backup of the platform database and every client's database (consistent online
# snapshots) plus each client's uploaded files, with rotation.
#   sh deploy/backup.sh once          # run one backup now
#   sh deploy/backup.sh loop          # run daily at $BACKUP_HOUR (used by docker compose)
# Env: DATA_DIR (/data), BACKUP_DIR (/backups), KEEP_DAYS (14), BACKUP_HOUR (2)
#
# Layout: $BACKUP_DIR/<stamp>/platform.db.gz
#         $BACKUP_DIR/<stamp>/tenants/<id>/site.db.gz + uploads.tar.gz
set -eu
DATA_DIR="${DATA_DIR:-/data}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
BACKUP_HOUR="${BACKUP_HOUR:-2}"

ensure_tools() {
	command -v sqlite3 >/dev/null 2>&1 || apk add --no-cache sqlite >/dev/null 2>&1 || {
		echo "sqlite3 is required" >&2
		exit 1
	}
}

# .backup uses SQLite's online backup API: safe while the app is running (WAL mode).
snapshot() {
	src="$1"
	dest="$2"
	mkdir -p "$(dirname "$dest")"
	sqlite3 "$src" ".backup '$dest'"
	sqlite3 "$dest" "PRAGMA integrity_check;" | grep -q '^ok$' || {
		echo "Integrity check failed for $src" >&2
		return 1
	}
	gzip -f "$dest"
}

backup_once() {
	ensure_tools
	stamp="$(date +%Y%m%d-%H%M%S)"
	out="$BACKUP_DIR/$stamp"
	mkdir -p "$out"
	failed=0
	[ -f "$DATA_DIR/platform.db" ] && { snapshot "$DATA_DIR/platform.db" "$out/platform.db" || failed=1; }
	for db in "$DATA_DIR"/tenants/*/site.db; do
		[ -f "$db" ] || continue
		dir="$(dirname "$db")"
		id="$(basename "$dir")"
		snapshot "$db" "$out/tenants/$id/site.db" || failed=1
		if [ -d "$dir/uploads" ]; then
			tar -czf "$out/tenants/$id/uploads.tar.gz" -C "$dir" uploads
		fi
	done
	find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
	echo "[backup] $stamp done$([ "$failed" = 1 ] && echo ' (with errors)')"
	return "$failed"
}

case "${1:-once}" in
once) backup_once ;;
loop)
	ensure_tools
	echo "[backup] daily at ${BACKUP_HOUR}:00, keeping ${KEEP_DAYS} days"
	while true; do
		if [ "$(date +%H)" -eq "$BACKUP_HOUR" ] && [ ! -f "/tmp/done-$(date +%Y%m%d)" ]; then
			backup_once && touch "/tmp/done-$(date +%Y%m%d)"
		fi
		sleep 600
	done
	;;
*) echo "usage: backup.sh once|loop" >&2; exit 1 ;;
esac
