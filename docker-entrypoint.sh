#!/bin/sh
set -e

# start the cfg maker script using forever 
node /cfgmaker/index.js &

# loop until config exists
while ! [ -f /etc/proftpd.conf ];
do
	echo "Waiting for config to be generated..."
	sleep 2
done;
echo "Config present.  Starting proftpd..."

exec "$@"
