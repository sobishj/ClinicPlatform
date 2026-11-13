#!/bin/sh
# Daily SQLite backup (consistent online snapshot) + uploads archive, with rotation.
#   sh deploy/backup.sh once          # run one backup now
#   sh deploy/backup.sh loop          # run daily at $BACKUP_HOUR (used by docker compose)
# Env: DATA_DIR (/data), BACKUP_DIR (/backups), KEEP_DAYS (14), BACKUP_HOUR (2)
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

backup_once() {
	ensure_tools
	mkdir -p "$BACKUP_DIR"
	stamp="$(date +%Y%m%d-%H%M%S)"
	# .backup uses SQLite's online backup API: safe while the app is running (WAL mode).
	sqlite3 "$DATA_DIR/clinic.db" ".backup '$BACKUP_DIR/clinic-$stamp.db'"
	sqlite3 "$BACKUP_DIR/clinic-$stamp.db" "PRAGMA integrity_check;" | grep -q '^ok$' || {
		echo "Integrity check failed for clinic-$stamp.db" >&2
		exit 1
	}
	gzip -f "$BACKUP_DIR/clinic-$stamp.db"
	if [ -d "$DATA_DIR/uploads" ]; then
		tar -czf "$BACKUP_DIR/uploads-$stamp.tar.gz" -C "$DATA_DIR" uploads
	fi
	find "$BACKUP_DIR" -name 'clinic-*.db.gz' -mtime +"$KEEP_DAYS" -delete
	find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
	echo "[backup] $stamp done"
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
